-- Migration: Enable RLS and create permissive allow-all policies for warehouse tables

ALTER TABLE public.inventory_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_warehouses"
  ON public.inventory_warehouses FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.inventory_warehouse_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_warehouse_stock"
  ON public.inventory_warehouse_stock FOR ALL
  USING (true)
  WITH CHECK (true);
