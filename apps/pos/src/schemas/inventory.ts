import { z } from 'zod';
import { ProductCategory, Allergen, VatRate, ConsumptionType } from '@/types/enums';

export const CreateStockItemSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').describe('Stock item name'),
  sku: z.string().optional().default('').describe('Stock keeping unit'),
  product_category: z.nativeEnum(ProductCategory).describe('Product category'),
  unit: z.string().min(1, 'Jednostka jest wymagana').describe('Unit of measure'),
  cost_per_unit: z.number().positive('Cena jest wymagana').describe('Cost per unit in PLN'),
  allergens: z.array(z.nativeEnum(Allergen)).default([]).describe('EU allergens list'),
  is_active: z.boolean().default(true).describe('Whether this item is active'),
  vat_rate: z.nativeEnum(VatRate).default(VatRate.PTU_B).describe('VAT rate group (PTU)'),
  consumption_type: z.nativeEnum(ConsumptionType).default(ConsumptionType.PRODUCT).describe('Consumption type: product or components'),
  shelf_life_days: z.number().int().min(0, 'Waznosc nie moze byc ujemna').default(0).describe('Shelf life in days (0 = no tracking)'),
  default_min_quantity: z.number().min(0, 'Minimalna ilosc nie moze byc ujemna').default(0).describe('Default minimum quantity for new warehouse assignments'),
  storage_location: z.string().nullable().default(null).describe('Storage location description'),
});

export const UpdateStockItemSchema = CreateStockItemSchema.partial();

export const CreateWarehouseSchema = z.object({
  name: z.string().min(1, 'Nazwa magazynu jest wymagana').describe('Warehouse name'),
  location_id: z.string().nullable().optional().describe('Optional location reference'),
});

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial();

export const AssignStockToWarehouseSchema = z.object({
  warehouse_id: z.string().min(1, 'Magazyn jest wymagany').describe('Target warehouse ID'),
  stock_item_id: z.string().min(1, 'Pozycja magazynowa jest wymagana').describe('Stock item ID'),
  quantity: z.number().min(0, 'Ilosc nie moze byc ujemna').describe('Initial quantity'),
  min_quantity: z.number().min(0, 'Minimalna ilosc nie moze byc ujemna').describe('Minimum quantity threshold'),
});

export const AdjustQuantitySchema = z.object({
  warehouse_id: z.string().min(1, 'Magazyn jest wymagany').describe('Warehouse ID'),
  stock_item_id: z.string().min(1, 'Pozycja magazynowa jest wymagana'),
  quantity: z.number().describe('Quantity adjustment (positive or negative)'),
  reason: z.string().optional().describe('Reason for adjustment'),
});

export const TransferStockSchema = z.object({
  source_warehouse_id: z.string().min(1, 'Magazyn zrodlowy jest wymagany').describe('Source warehouse ID'),
  target_warehouse_id: z.string().min(1, 'Magazyn docelowy jest wymagany').describe('Target warehouse ID'),
  stock_item_id: z.string().min(1, 'Pozycja magazynowa jest wymagana').describe('Stock item ID'),
  quantity: z.number().positive('Ilosc musi byc dodatnia').describe('Quantity to transfer'),
}).refine(
  (data) => data.source_warehouse_id !== data.target_warehouse_id,
  { message: 'Magazyn zrodlowy i docelowy musza byc rozne', path: ['target_warehouse_id'] }
);

export const CreateStockItemComponentSchema = z.object({
  parent_stock_item_id: z.string().min(1, 'Pozycja nadrzedna jest wymagana').describe('Parent stock item ID'),
  component_stock_item_id: z.string().min(1, 'Skladnik jest wymagany').describe('Component stock item ID'),
  quantity: z.number().positive('Ilosc musi byc dodatnia').describe('Quantity of component per unit of parent'),
}).refine(
  (data) => data.parent_stock_item_id !== data.component_stock_item_id,
  { message: 'Pozycja nie moze byc wlasnym skladnikiem', path: ['component_stock_item_id'] }
);

export const UpdateStockItemComponentSchema = z.object({
  quantity: z.number().positive('Ilosc musi byc dodatnia').describe('Updated quantity of component'),
});

export type CreateStockItemInput = z.infer<typeof CreateStockItemSchema>;
export type UpdateStockItemInput = z.infer<typeof UpdateStockItemSchema>;
export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;
export type AssignStockToWarehouseInput = z.infer<typeof AssignStockToWarehouseSchema>;
export type AdjustQuantityInput = z.infer<typeof AdjustQuantitySchema>;
export type TransferStockInput = z.infer<typeof TransferStockSchema>;
export type CreateStockItemComponentInput = z.infer<typeof CreateStockItemComponentSchema>;
export type UpdateStockItemComponentInput = z.infer<typeof UpdateStockItemComponentSchema>;
