import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteE2ERunContext } from './run-context';
import { deleteAuthUserByEmail, listAllAuthUsers } from './supabase-admin';

const PREFIX_MARKER = 'E2E-POS-';
const DEFAULT_STALE_TTL_HOURS = 24;

type TableRow = Record<string, unknown> & {
  id?: string;
  created_at?: string;
};

type CleanupState = {
  supplierIds: string[];
  deliveryIds: string[];
  stockItemIds: string[];
  menuProductIds: string[];
  recipeIds: string[];
  userIds: string[];
};

function matchesPrefix(
  row: TableRow,
  fields: string[],
  prefix: string,
  threshold?: number
): boolean {
  const createdAt = Date.parse(String(row.created_at ?? ''));
  if (threshold != null && Number.isFinite(createdAt) && createdAt >= threshold) {
    return false;
  }

  return fields.some((field) => {
    const value = row[field];
    return typeof value === 'string' && value.includes(prefix);
  });
}

async function selectAll(admin: SupabaseClient, table: string): Promise<TableRow[]> {
  const { data, error } = await admin.from(table).select('*');
  if (error) {
    throw new Error(`Failed to read ${table}: ${error.message}`);
  }

  return (data ?? []) as TableRow[];
}

async function deleteWhereIn(
  admin: SupabaseClient,
  table: string,
  column: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const { error } = await admin.from(table).delete().in(column, ids);
  if (error) {
    throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }
}

async function deleteUserProfileByEmail(
  admin: SupabaseClient,
  email: string
): Promise<void> {
  const { error } = await admin.from('users_users').delete().eq('email', email);
  if (error) {
    throw new Error(`Failed to delete users_users row for ${email}: ${error.message}`);
  }
}

async function collectCleanupState(
  admin: SupabaseClient,
  prefix: string,
  threshold?: number
): Promise<CleanupState> {
  const [suppliers, deliveries, stockItems, menuProducts, recipes, users] =
    await Promise.all([
      selectAll(admin, 'suppliers'),
      selectAll(admin, 'deliveries'),
      selectAll(admin, 'inventory_stock_items'),
      selectAll(admin, 'menu_products'),
      selectAll(admin, 'recipes_recipes'),
      selectAll(admin, 'users_users'),
    ]);

  return {
    supplierIds: suppliers
      .filter((row) => matchesPrefix(row, ['name', 'email', 'notes'], prefix, threshold))
      .map((row) => String(row.id)),
    deliveryIds: deliveries
      .filter(
        (row) =>
          matchesPrefix(
            row,
            ['delivery_number', 'document_number', 'notes'],
            prefix,
            threshold
          )
      )
      .map((row) => String(row.id)),
    stockItemIds: stockItems
      .filter(
        (row) =>
          matchesPrefix(
            row,
            ['name', 'sku', 'storage_location'],
            prefix,
            threshold
          )
      )
      .map((row) => String(row.id)),
    menuProductIds: menuProducts
      .filter(
        (row) =>
          matchesPrefix(row, ['name', 'slug', 'description', 'sku'], prefix, threshold)
      )
      .map((row) => String(row.id)),
    recipeIds: recipes
      .filter(
        (row) =>
          matchesPrefix(row, ['name', 'description', 'instructions'], prefix, threshold)
      )
      .map((row) => String(row.id)),
    userIds: users
      .filter((row) => matchesPrefix(row, ['email', 'username', 'name'], prefix, threshold))
      .map((row) => String(row.id)),
  };
}

async function cleanupCollectedState(
  admin: SupabaseClient,
  state: CleanupState
): Promise<void> {
  await deleteWhereIn(admin, 'delivery_items', 'delivery_id', state.deliveryIds);
  await deleteWhereIn(admin, 'deliveries', 'id', state.deliveryIds);
  await deleteWhereIn(admin, 'suppliers', 'id', state.supplierIds);
  await deleteWhereIn(admin, 'product_modifiers', 'product_id', state.menuProductIds);

  if (state.stockItemIds.length > 0) {
    const componentRows = await selectAll(admin, 'inventory_stock_item_components');
    const componentIds = componentRows
      .filter((row) => {
        const parentId = String(row.parent_stock_item_id ?? '');
        const componentId = String(row.component_stock_item_id ?? '');
        return (
          state.stockItemIds.includes(parentId) ||
          state.stockItemIds.includes(componentId)
        );
      })
      .map((row) => String(row.id));

    await deleteWhereIn(admin, 'inventory_warehouse_stock', 'stock_item_id', state.stockItemIds);
    await deleteWhereIn(admin, 'inventory_stock_item_components', 'id', componentIds);
  }

  await deleteWhereIn(admin, 'menu_products', 'id', state.menuProductIds);
  await deleteWhereIn(admin, 'recipes_recipes', 'id', state.recipeIds);
  await deleteWhereIn(admin, 'inventory_stock_items', 'id', state.stockItemIds);
  await deleteWhereIn(admin, 'users_users', 'id', state.userIds);
}

function extractRunIdFromEmail(email: string): string | null {
  const match = email.match(/^e2e\+([a-z0-9-]+)@mesopos\.pl$/i);
  return match?.[1] ?? null;
}

export async function sweepStaleE2eData(
  admin: SupabaseClient,
  currentContext: RemoteE2ERunContext
): Promise<void> {
  const threshold = Date.now() - DEFAULT_STALE_TTL_HOURS * 60 * 60 * 1000;

  const staleState = await collectCleanupState(admin, PREFIX_MARKER, threshold);
  await cleanupCollectedState(admin, staleState);

  const authUsers = await listAllAuthUsers(admin);
  const staleUsers = authUsers.filter((user) => {
    if (!user.email || user.email.toLowerCase() === currentContext.email.toLowerCase()) {
      return false;
    }

    const runId = extractRunIdFromEmail(user.email);
    if (!runId) {
      return false;
    }

    const createdAt = Date.parse(user.created_at ?? '');
    return Number.isFinite(createdAt) && createdAt < threshold;
  });

  for (const user of staleUsers) {
    await deleteUserProfileByEmail(admin, user.email!);
    await deleteAuthUserByEmail(admin, user.email!);
  }
}

export async function cleanupRunArtifacts(
  admin: SupabaseClient,
  context: RemoteE2ERunContext
): Promise<void> {
  const state = await collectCleanupState(admin, context.prefix);
  await cleanupCollectedState(admin, state);
  await deleteUserProfileByEmail(admin, context.email);
  await deleteAuthUserByEmail(admin, context.email);
}

export async function assertRunArtifactsDeleted(
  admin: SupabaseClient,
  context: RemoteE2ERunContext
): Promise<void> {
  const state = await collectCleanupState(admin, context.prefix);
  const remaining = Object.values(state).reduce((sum, ids) => sum + ids.length, 0);

  if (remaining > 0) {
    throw new Error(`Cleanup left ${remaining} tagged records for ${context.prefix}`);
  }

  const { data: userProfiles, error: userProfilesError } = await admin
    .from('users_users')
    .select('id')
    .eq('email', context.email);

  if (userProfilesError) {
    throw new Error(`Failed to verify users_users cleanup: ${userProfilesError.message}`);
  }

  if ((userProfiles ?? []).length > 0) {
    throw new Error(`Cleanup left users_users row for ${context.email}`);
  }

  const authUsers = await listAllAuthUsers(admin);
  const authUserExists = authUsers.some(
    (user) => user.email?.toLowerCase() === context.email.toLowerCase()
  );

  if (authUserExists) {
    throw new Error(`Cleanup left auth user ${context.email}`);
  }
}
