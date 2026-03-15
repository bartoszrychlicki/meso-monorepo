import { describe, expect, it } from 'vitest';
import {
  CreatePromotionalCodeSchema,
  UpdateRewardSchema,
  UpdatePromotionalCodeSchema,
} from '@/schemas/crm';

const baseCode = {
  code: 'MESOFREE',
  name: 'Darmowy produkt',
  description: null,
  min_order_amount: null,
  first_order_only: false,
  required_loyalty_tier: null,
  max_uses: null,
  max_uses_per_customer: null,
  valid_from: '2026-03-15T10:00:00.000Z',
  valid_until: null,
  is_active: true,
  channels: ['delivery'] as const,
};

describe('CRM schemas', () => {
  it('requires a product for free-item promotional codes on create', () => {
    const result = CreatePromotionalCodeSchema.safeParse({
      ...baseCode,
      discount_type: 'free_item',
      discount_value: null,
      free_item_id: null,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'free_item_id')).toBe(true);
  });

  it('requires a product for free-item promotional codes on update', () => {
    const result = UpdatePromotionalCodeSchema.safeParse({
      discount_type: 'free_item',
      free_item_id: null,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'free_item_id')).toBe(true);
  });

  it('requires discount value when changing reward type to discount', () => {
    const result = UpdateRewardSchema.safeParse({
      reward_type: 'discount',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'discount_value')).toBe(true);
  });

  it('rejects zero discount value on reward update even without reward type', () => {
    const result = UpdateRewardSchema.safeParse({
      discount_value: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'discount_value')).toBe(true);
  });

  it('requires discount value when changing promotional code type to percent', () => {
    const result = UpdatePromotionalCodeSchema.safeParse({
      discount_type: 'percent',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join('.') === 'discount_value')).toBe(true);
  });
});
