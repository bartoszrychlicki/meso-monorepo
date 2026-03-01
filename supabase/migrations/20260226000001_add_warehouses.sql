-- Migration: Add multi-warehouse support to inventory module
-- Creates warehouse entity, junction table, migrates existing data, drops old columns

-- ============================================================================
-- 1. CREATE inventory_warehouses table
-- ============================================================================

CREATE TABLE public.inventory_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.users_locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CREATE inventory_warehouse_stock junction table
-- ============================================================================

CREATE TABLE public.inventory_warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.inventory_stock_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  min_quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, stock_item_id)
);

CREATE INDEX idx_warehouse_stock_warehouse ON public.inventory_warehouse_stock(warehouse_id);
CREATE INDEX idx_warehouse_stock_item ON public.inventory_warehouse_stock(stock_item_id);

-- ============================================================================
-- 3. Attach updated_at triggers
-- ============================================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.inventory_warehouses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.inventory_warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. Seed 3 warehouses
-- ============================================================================

INSERT INTO public.inventory_warehouses (id, name, location_id) VALUES
  ('99999999-9999-9999-9999-999999990001', 'Magazyn glowny', '11111111-1111-1111-1111-111111111001'),
  ('99999999-9999-9999-9999-999999990002', 'Magazyn suchy', NULL),
  ('99999999-9999-9999-9999-999999990003', 'Chemia', NULL);

-- ============================================================================
-- 5. Migrate existing stock quantities into warehouse_stock
--    Assign all existing items to "Magazyn glowny"
-- ============================================================================

INSERT INTO public.inventory_warehouse_stock (warehouse_id, stock_item_id, quantity, min_quantity)
SELECT
  '99999999-9999-9999-9999-999999990001',
  id,
  quantity,
  min_quantity
FROM public.inventory_stock_items
WHERE is_active = true;

-- ============================================================================
-- 6. Seed some items into other warehouses with partial quantities
--    (move partial stock from Magazyn glowny to other warehouses)
-- ============================================================================

-- Move some dry goods to "Magazyn suchy"
INSERT INTO public.inventory_warehouse_stock (warehouse_id, stock_item_id, quantity, min_quantity) VALUES
  ('99999999-9999-9999-9999-999999990002', '88888888-8888-8888-8888-888888880002', 50, 20),   -- Bulki burgerowe
  ('99999999-9999-9999-9999-999999990002', '88888888-8888-8888-8888-888888880008', 5000, 3000), -- Sos BBQ
  ('99999999-9999-9999-9999-999999990002', '88888888-8888-8888-8888-888888880019', 2000, 1000); -- Czekolada

-- Reduce the quantities in Magazyn glowny accordingly
UPDATE public.inventory_warehouse_stock
SET quantity = quantity - 50
WHERE warehouse_id = '99999999-9999-9999-9999-999999990001'
  AND stock_item_id = '88888888-8888-8888-8888-888888880002';

UPDATE public.inventory_warehouse_stock
SET quantity = quantity - 5000
WHERE warehouse_id = '99999999-9999-9999-9999-999999990001'
  AND stock_item_id = '88888888-8888-8888-8888-888888880008';

UPDATE public.inventory_warehouse_stock
SET quantity = quantity - 2000
WHERE warehouse_id = '99999999-9999-9999-9999-999999990001'
  AND stock_item_id = '88888888-8888-8888-8888-888888880019';

-- Move cleaning/packaging items to "Chemia"
INSERT INTO public.inventory_warehouse_stock (warehouse_id, stock_item_id, quantity, min_quantity) VALUES
  ('99999999-9999-9999-9999-999999990003', '88888888-8888-8888-8888-888888880013', 200, 100),  -- Kubki papierowe
  ('99999999-9999-9999-9999-999999990003', '88888888-8888-8888-8888-888888880014', 150, 75);   -- Torby papierowe

UPDATE public.inventory_warehouse_stock
SET quantity = quantity - 200
WHERE warehouse_id = '99999999-9999-9999-9999-999999990001'
  AND stock_item_id = '88888888-8888-8888-8888-888888880013';

UPDATE public.inventory_warehouse_stock
SET quantity = quantity - 150
WHERE warehouse_id = '99999999-9999-9999-9999-999999990001'
  AND stock_item_id = '88888888-8888-8888-8888-888888880014';

-- ============================================================================
-- 7. DROP quantity and min_quantity from inventory_stock_items
--    These now live in the junction table per-warehouse
-- ============================================================================

ALTER TABLE public.inventory_stock_items DROP COLUMN quantity;
ALTER TABLE public.inventory_stock_items DROP COLUMN min_quantity;
