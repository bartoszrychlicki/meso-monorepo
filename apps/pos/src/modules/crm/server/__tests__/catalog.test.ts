import { describe, expect, it, vi } from 'vitest';
import {
  createPromotionalCode,
  getPromotionalCodeByCode,
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
