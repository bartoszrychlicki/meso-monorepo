-- Migration: Convert unit from grams (g) to kilograms (kg)
-- Adjusts quantities (/1000) and cost_per_unit (*1000) for all items currently in grams

-- 1. Update quantities in warehouse_stock for items currently in grams
UPDATE public.inventory_warehouse_stock
SET quantity = quantity / 1000,
    min_quantity = min_quantity / 1000
WHERE stock_item_id IN (
  SELECT id FROM public.inventory_stock_items WHERE unit = 'g'
);

-- 2. Update unit and cost_per_unit on stock_items
UPDATE public.inventory_stock_items
SET unit = 'kg',
    cost_per_unit = cost_per_unit * 1000
WHERE unit = 'g';
