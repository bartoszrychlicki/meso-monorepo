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
}

export interface WarehouseStockItem extends StockItem {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  min_quantity: number;
  warehouse_stock_id: string;
}
