import { describe, it, expect } from 'vitest';
import {
  CreateStockItemSchema,
  UpdateStockItemSchema,
  AdjustQuantitySchema,
} from '../inventory';
import { ProductCategory, Allergen } from '@/types/enums';

describe('CreateStockItemSchema', () => {
  const validData = {
    name: 'Wolowina mielona',
    sku: 'RAW-BEEF-001',
    product_category: ProductCategory.RAW_MATERIAL,
    unit: 'g',
    quantity: 42000,
    min_quantity: 20000,
    cost_per_unit: 0.032,
    allergens: [],
    is_active: true,
  };

  it('validates correct data', () => {
    const result = CreateStockItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('validates data with allergens', () => {
    const data = { ...validData, allergens: [Allergen.GLUTEN, Allergen.MILK] };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allergens).toEqual([Allergen.GLUTEN, Allergen.MILK]);
    }
  });

  it('rejects empty name', () => {
    const data = { ...validData, name: '' };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty SKU', () => {
    const data = { ...validData, sku: '' };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const data = { ...validData, quantity: -1 };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects negative cost_per_unit', () => {
    const data = { ...validData, cost_per_unit: -0.5 };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('defaults allergens to empty array', () => {
    const { allergens, ...dataWithoutAllergens } = validData;
    const result = CreateStockItemSchema.safeParse(dataWithoutAllergens);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allergens).toEqual([]);
    }
  });

  it('defaults is_active to true', () => {
    const { is_active, ...dataWithoutActive } = validData;
    const result = CreateStockItemSchema.safeParse(dataWithoutActive);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });

  it('rejects invalid product_category', () => {
    const data = { ...validData, product_category: 'invalid' };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid allergen value', () => {
    const data = { ...validData, allergens: ['not_a_real_allergen'] };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('UpdateStockItemSchema', () => {
  it('allows partial updates', () => {
    const result = UpdateStockItemSchema.safeParse({ name: 'New name' });
    expect(result.success).toBe(true);
  });

  it('allows empty update', () => {
    const result = UpdateStockItemSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates individual fields', () => {
    const result = UpdateStockItemSchema.safeParse({ quantity: -1 });
    expect(result.success).toBe(false);
  });
});

describe('AdjustQuantitySchema', () => {
  it('validates positive adjustment', () => {
    const result = AdjustQuantitySchema.safeParse({
      stock_item_id: 'some-id',
      quantity: 10,
    });
    expect(result.success).toBe(true);
  });

  it('validates negative adjustment', () => {
    const result = AdjustQuantitySchema.safeParse({
      stock_item_id: 'some-id',
      quantity: -5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty stock_item_id', () => {
    const result = AdjustQuantitySchema.safeParse({
      stock_item_id: '',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });
});
