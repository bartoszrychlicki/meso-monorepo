-- Create suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create deliveries table
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number TEXT NOT NULL UNIQUE,
  warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id),
  supplier_id UUID REFERENCES suppliers(id),
  document_number TEXT,
  document_date DATE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ai_scan', 'manual')),
  source_image_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create delivery_items table
CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES inventory_stock_items(id),
  quantity_ordered NUMERIC(12,4),
  quantity_received NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit_price_net NUMERIC(12,4),
  vat_rate TEXT CHECK (vat_rate IS NULL OR vat_rate IN ('PTU_A', 'PTU_B', 'PTU_C', 'PTU_D', 'PTU_E', 'PTU_F', 'PTU_G')),
  expiry_date DATE,
  ai_matched_name TEXT,
  ai_confidence NUMERIC(5,4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_deliveries_warehouse ON deliveries(warehouse_id);
CREATE INDEX idx_deliveries_supplier ON deliveries(supplier_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX idx_delivery_items_stock ON delivery_items(stock_item_id);

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON delivery_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon access (same pattern as other tables in this project)
CREATE POLICY "Allow all for anon users" ON suppliers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON deliveries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON delivery_items FOR ALL TO anon USING (true) WITH CHECK (true);
