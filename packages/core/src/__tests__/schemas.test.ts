import { describe, it, expect } from 'vitest';
import { CreateOrderSchema, UpdateOrderStatusSchema } from '../index';

describe('CreateOrderSchema', () => {
  it('validates a minimal delivery order', () => {
    const input = {
      channel: 'delivery_app',
      source: 'delivery',
      location_id: 'loc-123',
      customer_id: 'cust-456',
      items: [{
        product_id: 'prod-789',
        product_name: 'Spicy Miso Ramen',
        quantity: 1,
        unit_price: 38,
        modifiers: [{
          modifier_id: 'mod-1',
          name: 'Extra Chashu',
          price: 12,
          quantity: 1,
          modifier_action: 'add',
        }],
      }],
      payment_method: 'online',
      payment_status: 'pending',
      delivery_type: 'delivery',
      delivery_address: {
        street: 'Marszałkowska 1',
        city: 'Warszawa',
        postal_code: '00-001',
        country: 'PL',
      },
      external_order_id: 'delivery-uuid-123',
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects order without items', () => {
    const input = {
      location_id: 'loc-123',
      items: [],
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('defaults modifier_action to add', () => {
    const input = {
      channel: 'delivery_app',
      source: 'delivery',
      location_id: 'loc-123',
      items: [{
        product_id: 'prod-789',
        product_name: 'Ramen',
        quantity: 1,
        unit_price: 38,
        modifiers: [{
          modifier_id: 'mod-1',
          name: 'Egg',
          price: 5,
        }],
      }],
    };
    const result = CreateOrderSchema.parse(input);
    expect(result.items[0].modifiers[0].modifier_action).toBe('add');
  });
});

describe('UpdateOrderStatusSchema', () => {
  it('validates status update with payment_status', () => {
    const input = {
      status: 'confirmed',
      payment_status: 'paid',
      note: 'P24 payment confirmed',
    };
    const result = UpdateOrderStatusSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts cancelled status with closure reason code', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      status: 'cancelled',
      closure_reason_code: 'high_load',
    });

    expect(result.success).toBe(true);
  });

  it('rejects cancelled status without any reason', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      status: 'cancelled',
    });

    expect(result.success).toBe(false);
  });
});
