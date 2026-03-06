-- Allow semi-finished recipes to keep weight-based yields.
ALTER TABLE public.recipes_recipes
  ALTER COLUMN yield_unit TYPE TEXT;

-- Inventory items can store the purchase-unit weight used to derive PLN/kg
-- from supplier invoices that quote piece/package pricing.
ALTER TABLE public.inventory_stock_items
  ADD COLUMN IF NOT EXISTS purchase_unit_weight_kg NUMERIC(12,6);

-- Delivery items now preserve the supplier-facing quantity/unit and the
-- normalized price-per-kg used by inventory.
ALTER TABLE public.delivery_items
  ADD COLUMN IF NOT EXISTS supplier_quantity_received NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS supplier_unit TEXT,
  ADD COLUMN IF NOT EXISTS price_per_kg_net NUMERIC(12,4);

-- Backfill existing deliveries so historical rows keep their original meaning.
UPDATE public.delivery_items di
SET
  supplier_quantity_received = COALESCE(di.supplier_quantity_received, di.quantity_received),
  supplier_unit = COALESCE(di.supplier_unit, si.unit),
  price_per_kg_net = COALESCE(
    di.price_per_kg_net,
    CASE
      WHEN si.unit = 'kg' THEN di.unit_price_net
      ELSE NULL
    END
  )
FROM public.inventory_stock_items si
WHERE si.id = di.stock_item_id;
