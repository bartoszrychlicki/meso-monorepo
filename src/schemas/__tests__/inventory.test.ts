import { describe, it, expect } from 'vitest';
import {
  CreateStockItemSchema,
  UpdateStockItemSchema,
  AdjustQuantitySchema,
  CreateWarehouseSchema,
  TransferStockSchema,
  AssignStockToWarehouseSchema,
  CreateStockItemComponentSchema,
  UpdateStockItemComponentSchema,
} from '../inventory';
import { ProductCategory, Allergen, VatRate, ConsumptionType } from '@/types/enums';

describe('CreateStockItemSchema', () => {
  const validData = {
    name: 'Wolowina mielona',
    sku: 'RAW-BEEF-001',
    product_category: ProductCategory.RAW_MATERIAL,
    unit: 'g',
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

  it('accepts empty SKU (optional)', () => {
    const data = { ...validData, sku: '' };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts missing SKU (optional)', () => {
    const { sku: _sku, ...dataWithoutSku } = validData;
    const result = CreateStockItemSchema.safeParse(dataWithoutSku);
    expect(result.success).toBe(true);
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

  it('does not accept quantity or min_quantity', () => {
    // These fields moved to warehouse_stock
    const data = { ...validData, quantity: 100, min_quantity: 50 };
    const result = CreateStockItemSchema.safeParse(data);
    // Zod strips unknown keys by default, so it should still pass
    expect(result.success).toBe(true);
    if (result.success) {
      expect('quantity' in result.data).toBe(false);
      expect('min_quantity' in result.data).toBe(false);
    }
  });

  it('defaults vat_rate to PTU_B', () => {
    const result = CreateStockItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vat_rate).toBe(VatRate.PTU_B);
    }
  });

  it('defaults consumption_type to PRODUCT', () => {
    const result = CreateStockItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consumption_type).toBe(ConsumptionType.PRODUCT);
    }
  });

  it('defaults shelf_life_days to 0', () => {
    const result = CreateStockItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shelf_life_days).toBe(0);
    }
  });

  it('defaults default_min_quantity to 0', () => {
    const result = CreateStockItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_min_quantity).toBe(0);
    }
  });

  it('defaults storage_location to null', () => {
    const result = CreateStockItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storage_location).toBeNull();
    }
  });

  it('rejects negative shelf_life_days', () => {
    const data = { ...validData, shelf_life_days: -1 };
    const result = CreateStockItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer shelf_life_days', () => {
    const data = { ...validData, shelf_life_days: 3.5 };
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

  it('validates cost_per_unit', () => {
    const result = UpdateStockItemSchema.safeParse({ cost_per_unit: -1 });
    expect(result.success).toBe(false);
  });
});

describe('AdjustQuantitySchema', () => {
  it('validates positive adjustment with warehouse_id', () => {
    const result = AdjustQuantitySchema.safeParse({
      warehouse_id: 'wh-001',
      stock_item_id: 'some-id',
      quantity: 10,
    });
    expect(result.success).toBe(true);
  });

  it('validates negative adjustment', () => {
    const result = AdjustQuantitySchema.safeParse({
      warehouse_id: 'wh-001',
      stock_item_id: 'some-id',
      quantity: -5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty stock_item_id', () => {
    const result = AdjustQuantitySchema.safeParse({
      warehouse_id: 'wh-001',
      stock_item_id: '',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty warehouse_id', () => {
    const result = AdjustQuantitySchema.safeParse({
      warehouse_id: '',
      stock_item_id: 'some-id',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing warehouse_id', () => {
    const result = AdjustQuantitySchema.safeParse({
      stock_item_id: 'some-id',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateWarehouseSchema', () => {
  it('validates with name only', () => {
    const result = CreateWarehouseSchema.safeParse({ name: 'Magazyn glowny' });
    expect(result.success).toBe(true);
  });

  it('validates with name and location_id', () => {
    const result = CreateWarehouseSchema.safeParse({
      name: 'Magazyn glowny',
      location_id: 'loc-001',
    });
    expect(result.success).toBe(true);
  });

  it('validates with null location_id', () => {
    const result = CreateWarehouseSchema.safeParse({
      name: 'Magazyn glowny',
      location_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateWarehouseSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('TransferStockSchema', () => {
  const validTransfer = {
    source_warehouse_id: 'wh-001',
    target_warehouse_id: 'wh-002',
    stock_item_id: 'si-001',
    quantity: 100,
  };

  it('validates correct transfer', () => {
    const result = TransferStockSchema.safeParse(validTransfer);
    expect(result.success).toBe(true);
  });

  it('rejects same source and target', () => {
    const result = TransferStockSchema.safeParse({
      ...validTransfer,
      target_warehouse_id: 'wh-001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity', () => {
    const result = TransferStockSchema.safeParse({
      ...validTransfer,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = TransferStockSchema.safeParse({
      ...validTransfer,
      quantity: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe('AssignStockToWarehouseSchema', () => {
  it('validates correct assignment', () => {
    const result = AssignStockToWarehouseSchema.safeParse({
      warehouse_id: 'wh-001',
      stock_item_id: 'si-001',
      quantity: 100,
      min_quantity: 50,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative quantity', () => {
    const result = AssignStockToWarehouseSchema.safeParse({
      warehouse_id: 'wh-001',
      stock_item_id: 'si-001',
      quantity: -1,
      min_quantity: 50,
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateStockItemComponentSchema', () => {
  const validComponent = {
    parent_stock_item_id: 'si-001',
    component_stock_item_id: 'si-002',
    quantity: 0.5,
  };

  it('validates correct component data', () => {
    const result = CreateStockItemComponentSchema.safeParse(validComponent);
    expect(result.success).toBe(true);
  });

  it('rejects self-reference (parent = component)', () => {
    const data = { ...validComponent, component_stock_item_id: 'si-001' };
    const result = CreateStockItemComponentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity', () => {
    const data = { ...validComponent, quantity: 0 };
    const result = CreateStockItemComponentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const data = { ...validComponent, quantity: -1 };
    const result = CreateStockItemComponentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty parent_stock_item_id', () => {
    const data = { ...validComponent, parent_stock_item_id: '' };
    const result = CreateStockItemComponentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('UpdateStockItemComponentSchema', () => {
  it('validates positive quantity', () => {
    const result = UpdateStockItemComponentSchema.safeParse({ quantity: 1.5 });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = UpdateStockItemComponentSchema.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });
});
