import { z } from 'zod';
import { ProductCategory, Allergen } from '@/types/enums';

export const CreateStockItemSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').describe('Stock item name'),
  sku: z.string().min(1, 'SKU jest wymagane').describe('Stock keeping unit'),
  product_category: z.nativeEnum(ProductCategory).describe('Product category'),
  unit: z.string().min(1, 'Jednostka jest wymagana').describe('Unit of measure'),
  quantity: z.number().min(0, 'Ilość nie może być ujemna').describe('Current quantity'),
  min_quantity: z.number().min(0, 'Minimalna ilość nie może być ujemna').describe('Minimum quantity threshold'),
  cost_per_unit: z.number().min(0, 'Koszt nie może być ujemny').describe('Cost per unit in PLN'),
  allergens: z.array(z.nativeEnum(Allergen)).default([]).describe('EU allergens list'),
  is_active: z.boolean().default(true).describe('Whether this item is active'),
});

export const UpdateStockItemSchema = CreateStockItemSchema.partial();

export const AdjustQuantitySchema = z.object({
  stock_item_id: z.string().min(1, 'Pozycja magazynowa jest wymagana'),
  quantity: z.number().describe('Quantity adjustment (positive or negative)'),
  reason: z.string().optional().describe('Reason for adjustment'),
});

export type CreateStockItemInput = z.infer<typeof CreateStockItemSchema>;
export type UpdateStockItemInput = z.infer<typeof UpdateStockItemSchema>;
export type AdjustQuantityInput = z.infer<typeof AdjustQuantitySchema>;
