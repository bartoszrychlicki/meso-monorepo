-- Add is_default column to inventory_warehouses
ALTER TABLE inventory_warehouses
  ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Set "Magazyn glowny" as default
UPDATE inventory_warehouses
  SET is_default = true
  WHERE name = 'Magazyn glowny';
