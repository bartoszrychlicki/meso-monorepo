import { describe, expect, it, vi } from 'vitest';
import {
  createPromotionalCode,
  getPromotionalCodeByCode,
  listPromotionalCodes,
} from '@/modules/crm/server/catalog';
import type { CreatePromotionalCodeInput } from '@/schemas/crm';

function countChain(result: { data: unknown; error: unknown; count?: number | null }) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: typeof result) => void) => resolve(result);
      }
      return () => new Proxy({}, handler);
    },
  };

  return new Proxy({}, handler);
}

describe('createPromotionalCode', () => {
  it('preserves explicit null for max_uses_per_customer', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'promo-1',
        code: 'MESO10',
        name: 'Kod testowy',
        description: null,
        discount_type: 'percent',
        discount_value: 10,
        free_item_id: null,
        min_order_amount: null,
        first_order_only: false,
        required_loyalty_tier: null,
        trigger_scenario: 'manual',
        max_uses: null,
        max_uses_per_customer: null,
        current_uses: 0,
        valid_from: '2026-03-15T10:00:00.000Z',
        valid_until: null,
        is_active: true,
        channels: ['delivery'],
        applicable_product_ids: null,
        created_by: 'user-1',
        created_at: '2026-03-15T10:00:00.000Z',
        updated_at: '2026-03-15T10:00:00.000Z',
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'crm_promotions') {
          return { insert };
        }

        if (table === 'orders_orders') {
          return countChain({ data: null, error: null, count: 0 });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const input: CreatePromotionalCodeInput = {
      code: 'MESO10',
      name: 'Kod testowy',
      description: null,
      discount_type: 'percent',
      discount_value: 10,
      free_item_id: null,
      min_order_amount: null,
      first_order_only: false,
      required_loyalty_tier: null,
      max_uses: null,
      max_uses_per_customer: null,
      valid_from: '2026-03-15T10:00:00.000Z',
      valid_until: null,
      is_active: true,
      channels: ['delivery'],
    };

    await createPromotionalCode(client as never, input, 'user-1');

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        max_uses_per_customer: null,
      })
    );
  });
});

describe('getPromotionalCodeByCode', () => {
  it('matches promo codes by exact normalized value', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'crm_promotions') {
          return { select };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await getPromotionalCodeByCode(client as never, 'meso_10');

    expect(eq).toHaveBeenCalledWith('code', 'MESO_10');
  });
});

describe('listPromotionalCodes', () => {
  it('loads usage counters with one aggregated orders query', async () => {
    const range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'promo-1',
          code: 'MESO10',
          name: 'Kod 10%',
          description: null,
          discount_type: 'percent',
          discount_value: 10,
          free_item_id: null,
          min_order_amount: null,
          first_order_only: false,
          required_loyalty_tier: null,
          trigger_scenario: 'manual',
          max_uses: 100,
          max_uses_per_customer: 1,
          current_uses: 0,
          valid_from: '2026-03-15T10:00:00.000Z',
          valid_until: null,
          is_active: true,
          channels: ['delivery'],
          applicable_product_ids: null,
          created_by: 'user-1',
          created_at: '2026-03-15T10:00:00.000Z',
          updated_at: '2026-03-15T10:00:00.000Z',
        },
        {
          id: 'promo-2',
          code: 'MESO20',
          name: 'Kod 20%',
          description: null,
          discount_type: 'percent',
          discount_value: 20,
          free_item_id: null,
          min_order_amount: null,
          first_order_only: false,
          required_loyalty_tier: null,
          trigger_scenario: 'manual',
          max_uses: 100,
          max_uses_per_customer: 1,
          current_uses: 0,
          valid_from: '2026-03-15T10:00:00.000Z',
          valid_until: null,
          is_active: true,
          channels: ['delivery'],
          applicable_product_ids: null,
          created_by: 'user-1',
          created_at: '2026-03-15T10:00:00.000Z',
          updated_at: '2026-03-15T10:00:00.000Z',
        },
      ],
      error: null,
      count: 2,
    });
    const order = vi.fn(() => ({ range }));
    const selectPromotions = vi.fn(() => ({ order }));

    const inPromoCode = vi.fn().mockResolvedValue({
      data: [{ promo_code: 'MESO10' }, { promo_code: 'MESO10' }, { promo_code: 'MESO20' }],
      error: null,
    });
    const neq = vi.fn(() => ({ in: inPromoCode }));
    const selectOrders = vi.fn(() => ({ neq }));

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'crm_promotions') {
          return { select: selectPromotions };
        }

        if (table === 'orders_orders') {
          return { select: selectOrders };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await listPromotionalCodes(client as never);

    expect(inPromoCode).toHaveBeenCalledWith('promo_code', ['MESO10', 'MESO20']);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.data.map((promo) => ({ code: promo.code, current_uses: promo.current_uses }))).toEqual([
      { code: 'MESO10', current_uses: 2 },
      { code: 'MESO20', current_uses: 1 },
    ]);
  });
});
