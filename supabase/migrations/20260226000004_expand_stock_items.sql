-- Add new fields to inventory_stock_items
ALTER TABLE inventory_stock_items
  ADD COLUMN vat_rate TEXT NOT NULL DEFAULT 'PTU_B',
  ADD COLUMN consumption_type TEXT NOT NULL DEFAULT 'product',
  ADD COLUMN shelf_life_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN default_min_quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN storage_location TEXT;

-- Create stock item components table (BOM for inventory)
CREATE TABLE inventory_stock_item_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_stock_item_id UUID NOT NULL REFERENCES inventory_stock_items(id) ON DELETE CASCADE,
  component_stock_item_id UUID NOT NULL REFERENCES inventory_stock_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_stock_item_id, component_stock_item_id),
  CHECK (parent_stock_item_id != component_stock_item_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_stock_item_components_parent ON inventory_stock_item_components(parent_stock_item_id);
CREATE INDEX idx_stock_item_components_component ON inventory_stock_item_components(component_stock_item_id);

-- Trigger for updated_at on new table
CREATE TRIGGER set_updated_at_stock_item_components
  BEFORE UPDATE ON inventory_stock_item_components
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Backfill default_min_quantity from warehouse_stock max(min_quantity) per item
UPDATE inventory_stock_items si
SET default_min_quantity = COALESCE(
  (SELECT MAX(ws.min_quantity)
   FROM inventory_warehouse_stock ws
   WHERE ws.stock_item_id = si.id),
  0
);

-- Enable RLS on new table (same permissive pattern as warehouse tables)
ALTER TABLE inventory_stock_item_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on stock_item_components"
  ON inventory_stock_item_components
  FOR ALL
  USING (true)
  WITH CHECK (true);
