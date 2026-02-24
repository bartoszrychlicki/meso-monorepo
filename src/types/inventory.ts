import { ProductCategory, Allergen } from './enums';
import { BaseEntity } from './common';

export interface StockItem extends BaseEntity {
  name: string;
  sku: string;
  product_category: ProductCategory;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_per_unit: number;
  allergens: Allergen[];
  is_active: boolean;
}
