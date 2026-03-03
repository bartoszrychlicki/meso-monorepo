-- Add inventory product categories and link stock items to categories

-- 1) Create categories table
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_is_active
  ON public.inventory_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_sort_order
  ON public.inventory_categories(sort_order);
-- 2) Add optional FK from stock items to inventory categories
ALTER TABLE public.inventory_stock_items
  ADD COLUMN IF NOT EXISTS inventory_category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_stock_items_inventory_category_id
  ON public.inventory_stock_items(inventory_category_id);
-- 3) Seed default categories
INSERT INTO public.inventory_categories (name, description, sort_order, is_active)
VALUES
  ('Surowce', 'Podstawowe surowce i skladniki', 1, true),
  ('Polprodukty', 'Pozycje przygotowane do dalszej produkcji', 2, true),
  ('Produkty gotowe', 'Produkty gotowe do wydania lub sprzedazy', 3, true)
ON CONFLICT (name) DO NOTHING;
-- 4) Backfill existing stock items based on product_category
UPDATE public.inventory_stock_items si
SET inventory_category_id = c.id
FROM public.inventory_categories c
WHERE si.inventory_category_id IS NULL
  AND (
    (si.product_category = 'raw_material' AND c.name = 'Surowce') OR
    (si.product_category = 'semi_finished' AND c.name = 'Polprodukty') OR
    (si.product_category = 'finished_good' AND c.name = 'Produkty gotowe')
  );
-- 5) RLS and trigger
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_categories"
  ON public.inventory_categories FOR ALL
  USING (true)
  WITH CHECK (true);
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
