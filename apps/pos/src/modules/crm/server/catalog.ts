import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LoyaltyRewardDefinition,
  PromotionalCode,
} from '@/types/crm';
import type {
  CreatePromotionalCodeInput,
  CreateRewardInput,
  UpdatePromotionalCodeInput,
  UpdateRewardInput,
} from '@/schemas/crm';

type QueryClient = SupabaseClient;

export type ListOptions = {
  page?: number;
  perPage?: number;
  search?: string | null;
  isActive?: boolean | null;
};

export type ProductOption = {
  id: string;
  name: string;
  price: number;
};

const REWARD_SELECT = `
  id,
  name,
  description,
  points_cost,
  reward_type,
  discount_value,
  free_product_id,
  icon,
  min_tier,
  sort_order,
  is_active,
  created_at
`;

const PROMO_CODE_SELECT = `
  id,
  code,
  name,
  description,
  discount_type,
  discount_value,
  free_item_id,
  min_order_amount,
  first_order_only,
  required_loyalty_tier,
  trigger_scenario,
  max_uses,
  max_uses_per_customer,
  current_uses,
  valid_from,
  valid_until,
  is_active,
  channels,
  applicable_product_ids,
  created_by,
  created_at,
  updated_at
`;

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function escapeSearch(search: string): string {
  return search.replace(/[%_,]/g, ' ').trim();
}

function normalizeReward(row: Record<string, unknown>): LoyaltyRewardDefinition {
  return {
    id: String(row.id),
    name: String(row.name),
    description: typeof row.description === 'string' ? row.description : null,
    points_cost: toNumber(row.points_cost) ?? 0,
    reward_type: row.reward_type as LoyaltyRewardDefinition['reward_type'],
    discount_value: toNumber(row.discount_value),
    free_product_id: typeof row.free_product_id === 'string' ? row.free_product_id : null,
    icon: typeof row.icon === 'string' ? row.icon : null,
    min_tier: row.min_tier as LoyaltyRewardDefinition['min_tier'],
    sort_order: toNumber(row.sort_order) ?? 0,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.created_at),
  };
}

function normalizePromotionalCode(row: Record<string, unknown>): PromotionalCode {
  return {
    id: String(row.id),
    code: typeof row.code === 'string' ? row.code : null,
    name: String(row.name),
    description: typeof row.description === 'string' ? row.description : null,
    discount_type: row.discount_type as PromotionalCode['discount_type'],
    discount_value: toNumber(row.discount_value),
    free_item_id: typeof row.free_item_id === 'string' ? row.free_item_id : null,
    min_order_amount: toNumber(row.min_order_amount),
    first_order_only: Boolean(row.first_order_only),
    required_loyalty_tier:
      typeof row.required_loyalty_tier === 'string'
        ? row.required_loyalty_tier as PromotionalCode['required_loyalty_tier']
        : null,
    trigger_scenario: row.trigger_scenario as PromotionalCode['trigger_scenario'],
    max_uses: toNumber(row.max_uses),
    max_uses_per_customer: toNumber(row.max_uses_per_customer),
    current_uses: toNumber(row.current_uses) ?? 0,
    valid_from: String(row.valid_from),
    valid_until: typeof row.valid_until === 'string' ? row.valid_until : null,
    is_active: Boolean(row.is_active),
    channels: Array.isArray(row.channels)
      ? row.channels.filter((value): value is PromotionalCode['channels'][number] =>
          value === 'delivery' || value === 'pickup'
        )
      : [],
    applicable_product_ids: Array.isArray(row.applicable_product_ids)
      ? row.applicable_product_ids.filter((value): value is string => typeof value === 'string')
      : null,
    created_by: typeof row.created_by === 'string' ? row.created_by : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function resolveUsageCount(client: QueryClient, code: string | null): Promise<number> {
  if (!code) return 0;

  const { count, error } = await client
    .from('orders_orders')
    .select('id', { count: 'exact', head: true })
    .eq('promo_code', code)
    .neq('status', 'cancelled');

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function resolveUsageCounts(
  client: QueryClient,
  codes: Array<string | null>
): Promise<Record<string, number>> {
  const normalizedCodes = [...new Set(codes.filter((code): code is string => Boolean(code)))];
  if (normalizedCodes.length === 0) {
    return {};
  }

  const { data, error } = await client
    .from('orders_orders')
    .select('promo_code')
    .neq('status', 'cancelled')
    .in('promo_code', normalizedCodes);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    const code = typeof row.promo_code === 'string' ? row.promo_code : null;
    if (!code) return acc;
    acc[code] = (acc[code] ?? 0) + 1;
    return acc;
  }, {});
}

export async function listRewards(client: QueryClient, options: ListOptions = {}) {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = client
    .from('crm_loyalty_rewards')
    .select(REWARD_SELECT, { count: 'exact' })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.isActive != null) {
    query = query.eq('is_active', options.isActive);
  }

  if (options.search) {
    const search = escapeSearch(options.search);
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return {
    data: (data ?? []).map((row) => normalizeReward(row)),
    total: count ?? 0,
    page,
    per_page: perPage,
  };
}

export async function getRewardById(client: QueryClient, id: string) {
  const { data, error } = await client
    .from('crm_loyalty_rewards')
    .select(REWARD_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeReward(data) : null;
}

export async function createReward(client: QueryClient, input: CreateRewardInput) {
  const { data, error } = await client
    .from('crm_loyalty_rewards')
    .insert({
      ...input,
      description: input.description ?? null,
      discount_value: input.discount_value ?? null,
      free_product_id: input.free_product_id ?? null,
      icon: input.icon ?? null,
    })
    .select(REWARD_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeReward(data);
}

export async function updateReward(client: QueryClient, id: string, input: UpdateRewardInput) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    payload[key] = value === undefined ? undefined : value;
  }

  const { data, error } = await client
    .from('crm_loyalty_rewards')
    .update(payload)
    .eq('id', id)
    .select(REWARD_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeReward(data) : null;
}

export async function deleteReward(client: QueryClient, id: string) {
  const { error } = await client
    .from('crm_loyalty_rewards')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listPromotionalCodes(client: QueryClient, options: ListOptions = {}) {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = client
    .from('crm_promotions')
    .select(PROMO_CODE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.isActive != null) {
    query = query.eq('is_active', options.isActive);
  }

  if (options.search) {
    const search = escapeSearch(options.search);
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const normalized = (data ?? []).map((row) => normalizePromotionalCode(row));
  const usageCounts = await resolveUsageCounts(
    client,
    normalized.map((promotionalCode) => promotionalCode.code)
  );

  return {
    data: normalized.map((promotionalCode) => ({
      ...promotionalCode,
      current_uses: promotionalCode.code ? (usageCounts[promotionalCode.code] ?? 0) : 0,
    })),
    total: count ?? 0,
    page,
    per_page: perPage,
  };
}

export async function getPromotionalCodeById(client: QueryClient, id: string) {
  const { data, error } = await client
    .from('crm_promotions')
    .select(PROMO_CODE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const promotionalCode = normalizePromotionalCode(data);
  return {
    ...promotionalCode,
    current_uses: await resolveUsageCount(client, promotionalCode.code),
  };
}

export async function getPromotionalCodeByCode(client: QueryClient, code: string) {
  const { data, error } = await client
    .from('crm_promotions')
    .select(PROMO_CODE_SELECT)
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const promotionalCode = normalizePromotionalCode(data);
  return {
    ...promotionalCode,
    current_uses: await resolveUsageCount(client, promotionalCode.code),
  };
}

export async function createPromotionalCode(
  client: QueryClient,
  input: CreatePromotionalCodeInput,
  actorId?: string | null
) {
  const { data, error } = await client
    .from('crm_promotions')
    .insert({
      ...input,
      code: input.code.toUpperCase(),
      description: input.description ?? null,
      discount_value: input.discount_value ?? null,
      free_item_id: input.free_item_id ?? null,
      min_order_amount: input.min_order_amount ?? null,
      required_loyalty_tier: input.required_loyalty_tier ?? null,
      max_uses: input.max_uses ?? null,
      max_uses_per_customer:
        input.max_uses_per_customer === undefined ? 1 : input.max_uses_per_customer,
      valid_until: input.valid_until ?? null,
      created_by: actorId ?? null,
    })
    .select(PROMO_CODE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const promotionalCode = normalizePromotionalCode(data);
  return {
    ...promotionalCode,
    current_uses: await resolveUsageCount(client, promotionalCode.code),
  };
}

export async function updatePromotionalCode(
  client: QueryClient,
  id: string,
  input: UpdatePromotionalCodeInput
) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      payload[key] = key === 'code' && typeof value === 'string' ? value.toUpperCase() : value;
    }
  }

  const { data, error } = await client
    .from('crm_promotions')
    .update(payload)
    .eq('id', id)
    .select(PROMO_CODE_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const promotionalCode = normalizePromotionalCode(data);
  return {
    ...promotionalCode,
    current_uses: await resolveUsageCount(client, promotionalCode.code),
  };
}

export async function deletePromotionalCode(client: QueryClient, id: string) {
  const { error } = await client
    .from('crm_promotions')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listProductOptions(client: QueryClient): Promise<ProductOption[]> {
  const { data, error } = await client
    .from('menu_products')
    .select('id, name, price')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    price: toNumber(row.price) ?? 0,
  }));
}
