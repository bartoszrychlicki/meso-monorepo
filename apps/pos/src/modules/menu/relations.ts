import type { SupabaseClient } from '@supabase/supabase-js';
import type { MenuModifier, ModifierGroup } from '@/types/menu';

type GroupLinkRow = {
  group_id: string;
  modifier_id: string;
  sort_order: number | null;
};

type ProductGroupLinkRow = {
  product_id: string;
  group_id: string;
  sort_order: number | null;
};

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function normalizeSortOrder(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

export async function getProductModifierGroupIdsWithClient(
  client: SupabaseClient,
  productId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('product_modifier_groups')
    .select('group_id')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`getProductModifierGroupIds failed: ${error.message}`);
  }

  return (data ?? []).map((row: { group_id: string }) => row.group_id);
}

export async function setProductModifierGroupsWithClient(
  client: SupabaseClient,
  productId: string,
  groupIds: string[]
): Promise<void> {
  const normalizedGroupIds = normalizeIds(groupIds);

  const { error: deleteError } = await client
    .from('product_modifier_groups')
    .delete()
    .eq('product_id', productId);

  if (deleteError) {
    throw new Error(`setProductModifierGroups delete failed: ${deleteError.message}`);
  }

  if (normalizedGroupIds.length === 0) return;

  const rows = normalizedGroupIds.map((groupId, index) => ({
    product_id: productId,
    group_id: groupId,
    sort_order: index,
  }));

  const { error: insertError } = await client
    .from('product_modifier_groups')
    .insert(rows);

  if (insertError) {
    throw new Error(`setProductModifierGroups insert failed: ${insertError.message}`);
  }
}

export async function getModifierGroupModifierIdsWithClient(
  client: SupabaseClient,
  groupId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('modifier_group_modifiers')
    .select('modifier_id')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`getModifierGroupModifierIds failed: ${error.message}`);
  }

  return (data ?? []).map((row: { modifier_id: string }) => row.modifier_id);
}

export async function setModifierGroupModifiersWithClient(
  client: SupabaseClient,
  groupId: string,
  modifierIds: string[]
): Promise<void> {
  const normalizedModifierIds = normalizeIds(modifierIds);

  const { error: deleteError } = await client
    .from('modifier_group_modifiers')
    .delete()
    .eq('group_id', groupId);

  if (deleteError) {
    throw new Error(`setModifierGroupModifiers delete failed: ${deleteError.message}`);
  }

  if (normalizedModifierIds.length === 0) return;

  const rows = normalizedModifierIds.map((modifierId, index) => ({
    group_id: groupId,
    modifier_id: modifierId,
    sort_order: index,
  }));

  const { error: insertError } = await client
    .from('modifier_group_modifiers')
    .insert(rows);

  if (insertError) {
    throw new Error(`setModifierGroupModifiers insert failed: ${insertError.message}`);
  }
}

export async function listModifierGroupsWithClient(
  client: SupabaseClient
): Promise<ModifierGroup[]> {
  const { data: groupsData, error: groupsError } = await client
    .from('menu_modifier_groups')
    .select('id, name, type, required, min_selections, max_selections, created_at, updated_at')
    .order('name', { ascending: true });

  if (groupsError) {
    throw new Error(`listModifierGroups failed: ${groupsError.message}`);
  }

  const groups = (groupsData ?? []) as ModifierGroup[];
  if (groups.length === 0) return [];

  const groupIds = groups.map((group) => group.id);

  const { data: groupLinksData, error: groupLinksError } = await client
    .from('modifier_group_modifiers')
    .select('group_id, modifier_id, sort_order')
    .in('group_id', groupIds)
    .order('sort_order', { ascending: true });

  if (groupLinksError) {
    throw new Error(`listModifierGroups links failed: ${groupLinksError.message}`);
  }

  const groupLinks = (groupLinksData ?? []) as GroupLinkRow[];
  const modifierIds = normalizeIds(groupLinks.map((link) => link.modifier_id));

  const modifiersById = new Map<string, MenuModifier>();
  if (modifierIds.length > 0) {
    const { data: modifiersData, error: modifiersError } = await client
      .from('menu_modifiers')
      .select('*')
      .in('id', modifierIds);

    if (modifiersError) {
      throw new Error(`listModifierGroups modifiers failed: ${modifiersError.message}`);
    }

    for (const modifier of (modifiersData ?? []) as MenuModifier[]) {
      modifiersById.set(modifier.id, modifier);
    }
  }

  const linksByGroupId = new Map<string, GroupLinkRow[]>();
  for (const link of groupLinks) {
    const current = linksByGroupId.get(link.group_id) ?? [];
    current.push(link);
    linksByGroupId.set(link.group_id, current);
  }

  return groups.map((group) => {
    const links = linksByGroupId.get(group.id) ?? [];
    const modifiers = links
      .map((link, index) => {
        const modifier = modifiersById.get(link.modifier_id);
        if (!modifier) return null;

        return {
          ...modifier,
          sort_order: normalizeSortOrder(link.sort_order, index),
        };
      })
      .filter((modifier): modifier is MenuModifier => Boolean(modifier))
      .sort((left, right) => left.sort_order - right.sort_order);

    return {
      ...group,
      modifiers,
    };
  });
}

export async function getProductModifiersWithClient(
  client: SupabaseClient,
  productId: string
): Promise<MenuModifier[]> {
  const { data: productGroupsData, error: productGroupsError } = await client
    .from('product_modifier_groups')
    .select('product_id, group_id, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (productGroupsError) {
    throw new Error(`getProductModifiers failed: ${productGroupsError.message}`);
  }

  const productGroups = (productGroupsData ?? []) as ProductGroupLinkRow[];
  if (productGroups.length === 0) return [];

  const groupIds = normalizeIds(productGroups.map((group) => group.group_id));

  const { data: groupLinksData, error: groupLinksError } = await client
    .from('modifier_group_modifiers')
    .select('group_id, modifier_id, sort_order')
    .in('group_id', groupIds)
    .order('sort_order', { ascending: true });

  if (groupLinksError) {
    throw new Error(`getProductModifiers group links failed: ${groupLinksError.message}`);
  }

  const groupLinks = (groupLinksData ?? []) as GroupLinkRow[];
  if (groupLinks.length === 0) return [];

  const modifierIds = normalizeIds(groupLinks.map((link) => link.modifier_id));
  const { data: modifiersData, error: modifiersError } = await client
    .from('menu_modifiers')
    .select('*')
    .in('id', modifierIds)
    .eq('is_available', true);

  if (modifiersError) {
    throw new Error(`getProductModifiers fetch failed: ${modifiersError.message}`);
  }

  const modifiersById = new Map(
    ((modifiersData ?? []) as MenuModifier[]).map((modifier) => [modifier.id, modifier])
  );
  const productGroupOrder = new Map(
    productGroups.map((group, index) => [group.group_id, normalizeSortOrder(group.sort_order, index)])
  );

  return groupLinks
    .map((link, index) => {
      const modifier = modifiersById.get(link.modifier_id);
      if (!modifier) return null;

      return {
        ...modifier,
        sort_order:
          (productGroupOrder.get(link.group_id) ?? Number.MAX_SAFE_INTEGER) * 1000 +
          normalizeSortOrder(link.sort_order, index),
      };
    })
    .filter((modifier): modifier is MenuModifier => Boolean(modifier))
    .sort((left, right) => left.sort_order - right.sort_order);
}

export async function countProductsUsingModifierWithClient(
  client: SupabaseClient,
  modifierId: string
): Promise<number> {
  const { data: groupLinksData, error: groupLinksError } = await client
    .from('modifier_group_modifiers')
    .select('group_id')
    .eq('modifier_id', modifierId);

  if (groupLinksError) {
    throw new Error(`countProductsUsingModifier failed: ${groupLinksError.message}`);
  }

  const groupIds = normalizeIds(
    (groupLinksData ?? []).map((row: { group_id: string }) => row.group_id)
  );

  if (groupIds.length === 0) return 0;

  const { data: productGroupsData, error: productGroupsError } = await client
    .from('product_modifier_groups')
    .select('product_id')
    .in('group_id', groupIds);

  if (productGroupsError) {
    throw new Error(`countProductsUsingModifier products failed: ${productGroupsError.message}`);
  }

  return new Set(
    (productGroupsData ?? []).map((row: { product_id: string }) => row.product_id)
  ).size;
}
