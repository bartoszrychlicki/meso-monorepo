-- Add per-product sort order to product_modifiers junction table
ALTER TABLE public.product_modifiers ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows with sequential order per product
WITH numbered AS (
  SELECT product_id, modifier_id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY modifier_id) - 1 AS rn
  FROM public.product_modifiers
)
UPDATE public.product_modifiers pm
SET sort_order = n.rn
FROM numbered n
WHERE pm.product_id = n.product_id AND pm.modifier_id = n.modifier_id;
