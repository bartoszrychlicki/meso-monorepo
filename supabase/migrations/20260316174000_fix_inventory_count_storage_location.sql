-- Preserve the existing warehouse storage location when approving an
-- inventory count line that does not provide a new edited location.

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
      storage_location = COALESCE(EXCLUDED.storage_location, inventory_warehouse_stock.storage_location),
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
