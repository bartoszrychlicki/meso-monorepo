-- ============================================================================
-- Inventory counts (stocktaking) and warehouse-level storage locations
-- ============================================================================

ALTER TABLE public.inventory_warehouse_stock
  ADD COLUMN IF NOT EXISTS storage_location TEXT;

UPDATE public.inventory_warehouse_stock ws
SET storage_location = si.storage_location
FROM public.inventory_stock_items si
WHERE ws.stock_item_id = si.id
  AND ws.storage_location IS NULL
  AND si.storage_location IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope IN ('single', 'all')),
  warehouse_id UUID REFERENCES public.inventory_warehouses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'cancelled')),
  comment TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_counts_scope_warehouse_chk CHECK (
    (scope = 'single' AND warehouse_id IS NOT NULL) OR
    (scope = 'all' AND warehouse_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.inventory_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.inventory_stock_items(id) ON DELETE CASCADE,
  stock_item_name TEXT NOT NULL,
  stock_item_sku TEXT NOT NULL,
  stock_item_unit TEXT NOT NULL,
  expected_quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  counted_quantity NUMERIC(12,4),
  note TEXT,
  edited_inventory_category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  edited_storage_location TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_count_lines_unique_item_per_warehouse UNIQUE (inventory_count_id, warehouse_id, stock_item_id),
  CONSTRAINT inventory_count_lines_non_negative_counted_qty CHECK (
    counted_quantity IS NULL OR counted_quantity >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_status
  ON public.inventory_counts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_count_lines_count
  ON public.inventory_count_lines(inventory_count_id, warehouse_id, sort_order);

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_inventory_counts" ON public.inventory_counts;
CREATE POLICY "staff_all_inventory_counts" ON public.inventory_counts
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "service_role_inventory_counts" ON public.inventory_counts;
CREATE POLICY "service_role_inventory_counts" ON public.inventory_counts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "staff_all_inventory_count_lines" ON public.inventory_count_lines;
CREATE POLICY "staff_all_inventory_count_lines" ON public.inventory_count_lines
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "service_role_inventory_count_lines" ON public.inventory_count_lines;
CREATE POLICY "service_role_inventory_count_lines" ON public.inventory_count_lines
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_inventory_counts_updated_at ON public.inventory_counts;
CREATE TRIGGER update_inventory_counts_updated_at
  BEFORE UPDATE ON public.inventory_counts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_inventory_count_lines_updated_at ON public.inventory_count_lines;
CREATE TRIGGER update_inventory_count_lines_updated_at
  BEFORE UPDATE ON public.inventory_count_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.approve_inventory_count(p_count_id UUID)
RETURNS public.inventory_counts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count public.inventory_counts;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Brak uprawnien do zatwierdzenia inwentaryzacji';
  END IF;

  SELECT *
  INTO v_count
  FROM public.inventory_counts
  WHERE id = p_count_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nie znaleziono inwentaryzacji';
  END IF;

  IF v_count.status <> 'draft' THEN
    RAISE EXCEPTION 'Mozna zatwierdzic tylko robocza inwentaryzacje';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_count_lines
    WHERE inventory_count_id = p_count_id
      AND counted_quantity IS NULL
  ) THEN
    RAISE EXCEPTION 'Uzupelnij wszystkie policzone stany przed zatwierdzeniem';
  END IF;

  UPDATE public.inventory_stock_items stock_items
  SET inventory_category_id = lines.edited_inventory_category_id,
      updated_at = now()
  FROM public.inventory_count_lines lines
  WHERE lines.inventory_count_id = p_count_id
    AND lines.stock_item_id = stock_items.id
    AND stock_items.inventory_category_id IS DISTINCT FROM lines.edited_inventory_category_id;

  INSERT INTO public.inventory_warehouse_stock (
    warehouse_id,
    stock_item_id,
    quantity,
    min_quantity,
    storage_location
  )
  SELECT
    lines.warehouse_id,
    lines.stock_item_id,
    COALESCE(lines.counted_quantity, 0),
    stock_items.default_min_quantity,
    lines.edited_storage_location
  FROM public.inventory_count_lines lines
  JOIN public.inventory_stock_items stock_items ON stock_items.id = lines.stock_item_id
  WHERE lines.inventory_count_id = p_count_id
  ON CONFLICT (warehouse_id, stock_item_id) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      storage_location = EXCLUDED.storage_location,
      updated_at = now();

  UPDATE public.inventory_counts
  SET status = 'approved',
      approved_at = now(),
      updated_at = now()
  WHERE id = p_count_id
  RETURNING *
  INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_inventory_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_inventory_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_inventory_count(UUID) TO service_role;
