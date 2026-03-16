import { ProductCategory, Allergen, VatRate, ConsumptionType } from './enums';
import { BaseEntity } from './common';

export interface StockItem extends BaseEntity {
  name: string;
  sku: string;
  product_category: ProductCategory;
  inventory_category_id?: string | null;
  unit: string;
  cost_per_unit: number;
  purchase_unit_weight_kg?: number | null;
  allergens: Allergen[];
  is_active: boolean;
  vat_rate: VatRate;
  consumption_type: ConsumptionType;
  shelf_life_days: number;
  default_min_quantity: number;
  storage_location: string | null;
}

export interface InventoryCategory extends BaseEntity {
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface StockItemComponent extends BaseEntity {
  parent_stock_item_id: string;
  component_stock_item_id: string;
  quantity: number;
}

export interface StockItemComponentWithDetails extends StockItemComponent {
  component_name: string;
  component_sku: string;
  component_unit: string;
  current_total_stock: number;
}

export interface StockItemUsage {
  in_components: {
    parent_id: string;
    parent_name: string;
    parent_sku: string;
    quantity: number;
  }[];
  in_recipes: {
    recipe_id: string;
    recipe_name: string;
    quantity: number;
    unit: string;
  }[];
}

export interface Warehouse extends BaseEntity {
  name: string;
  location_id: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface WarehouseStock extends BaseEntity {
  warehouse_id: string;
  stock_item_id: string;
  quantity: number;
  min_quantity: number;
  storage_location: string | null;
}

export interface WarehouseStockItem extends StockItem {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  min_quantity: number;
  warehouse_stock_id: string;
  storage_location: string | null;
}

export interface StockItemWarehouseAssignment extends BaseEntity {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  min_quantity: number;
  storage_location: string | null;
}

export type InventoryCountScope = 'single' | 'all';
export type InventoryCountStatus = 'draft' | 'approved' | 'cancelled';

export interface InventoryCount extends BaseEntity {
  number: string;
  scope: InventoryCountScope;
  warehouse_id: string | null;
  status: InventoryCountStatus;
  comment: string | null;
  created_by: string | null;
  approved_at: string | null;
  warehouse_name?: string | null;
  total_lines?: number;
  counted_lines?: number;
  difference_lines?: number;
}

export interface InventoryCountLine extends BaseEntity {
  inventory_count_id: string;
  warehouse_id: string;
  stock_item_id: string;
  stock_item_name: string;
  stock_item_sku: string;
  stock_item_unit: string;
  expected_quantity: number;
  counted_quantity: number | null;
  note: string | null;
  edited_inventory_category_id: string | null;
  edited_storage_location: string | null;
  sort_order: number;
  warehouse_name?: string;
}

export interface InventoryCountDetail {
  count: InventoryCount;
  lines: InventoryCountLine[];
}
