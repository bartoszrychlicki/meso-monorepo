import { describe, it, expect } from 'vitest';
import { CreateSupplierSchema, DeliveryItemSchema, CreateDeliverySchema } from '../delivery';

describe('CreateSupplierSchema', () => {
  const validSupplier = { name: 'Hurtownia ABC' };

  it('accepts valid supplier', () => {
    expect(CreateSupplierSchema.safeParse(validSupplier).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(CreateSupplierSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = CreateSupplierSchema.safeParse({
      ...validSupplier,
      phone: '+48123456789',
      email: 'abc@test.com',
      notes: 'Staly dostawca',
    });
    expect(result.success).toBe(true);
  });
});

describe('DeliveryItemSchema', () => {
  const validItem = {
    stock_item_id: '550e8400-e29b-41d4-a716-446655440000',
    quantity_received: 10,
  };

  it('accepts valid item with required fields only', () => {
    expect(DeliveryItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('rejects zero quantity_received', () => {
    expect(DeliveryItemSchema.safeParse({ ...validItem, quantity_received: 0 }).success).toBe(false);
  });

  it('rejects missing stock_item_id', () => {
    expect(DeliveryItemSchema.safeParse({ quantity_received: 10 }).success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = DeliveryItemSchema.safeParse({
      ...validItem,
      quantity_ordered: 12,
      unit_price_net: 32.50,
      vat_rate: 'PTU_B',
      expiry_date: '2026-04-01',
      ai_matched_name: 'Wolowina mielona',
      ai_confidence: 0.95,
      notes: '2kg odrzucone',
    });
    expect(result.success).toBe(true);
  });

  it('rejects confidence outside 0-1', () => {
    expect(DeliveryItemSchema.safeParse({ ...validItem, ai_confidence: 1.5 }).success).toBe(false);
  });
});

describe('CreateDeliverySchema', () => {
  const validDelivery = {
    warehouse_id: '550e8400-e29b-41d4-a716-446655440000',
    items: [{
      stock_item_id: '550e8400-e29b-41d4-a716-446655440001',
      quantity_received: 10,
    }],
  };

  it('accepts valid delivery with required fields only', () => {
    expect(CreateDeliverySchema.safeParse(validDelivery).success).toBe(true);
  });

  it('rejects empty items array', () => {
    expect(CreateDeliverySchema.safeParse({ ...validDelivery, items: [] }).success).toBe(false);
  });

  it('rejects missing warehouse_id', () => {
    expect(CreateDeliverySchema.safeParse({ items: validDelivery.items }).success).toBe(false);
  });

  it('defaults source to manual', () => {
    const result = CreateDeliverySchema.safeParse(validDelivery);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('manual');
    }
  });

  it('accepts full delivery with all optional fields', () => {
    const result = CreateDeliverySchema.safeParse({
      ...validDelivery,
      supplier_id: '550e8400-e29b-41d4-a716-446655440002',
      document_number: 'FV/2026/001',
      document_date: '2026-02-26',
      source: 'ai_scan',
      notes: 'Dostawa tygodniowa',
    });
    expect(result.success).toBe(true);
  });
});
