import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Order, OrderItem, OrderItemModifier, ApiResponse } from '../index';
import { OrderStatus, ModifierAction, OrderClosureReasonCode } from '../index';

describe('@meso/core types', () => {
  it('Order has required fields', () => {
    expectTypeOf<Order>().toHaveProperty('order_number');
    expectTypeOf<Order>().toHaveProperty('items');
    expectTypeOf<Order>().toHaveProperty('delivery_fee');
    expectTypeOf<Order>().toHaveProperty('tip');
    expectTypeOf<Order>().toHaveProperty('promo_code');
    expectTypeOf<Order>().toHaveProperty('loyalty_points_used');
    expectTypeOf<Order>().toHaveProperty('closure_reason');
    expectTypeOf<Order>().toHaveProperty('closure_reason_code');
  });

  it('OrderItemModifier uses ModifierAction enum', () => {
    const modifier: OrderItemModifier = {
      modifier_id: '123',
      name: 'Extra cheese',
      price: 5,
      quantity: 1,
      modifier_action: ModifierAction.ADD,
    };
    expect(modifier.modifier_action).toBe('add');
  });

  it('ApiResponse wraps data correctly', () => {
    const response: ApiResponse<Order> = {
      success: true,
      data: {} as Order,
      meta: { timestamp: new Date().toISOString() },
    };
    expect(response.success).toBe(true);
  });

  it('exposes closure reason enum values', () => {
    expect(OrderClosureReasonCode.MISSING_INGREDIENTS).toBe('missing_ingredients');
  });
});
