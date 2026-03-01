-- Rollback: 20260228000006_delivery_config.sql

DROP POLICY IF EXISTS "staff_manage_delivery_config" ON orders_delivery_config;
DROP POLICY IF EXISTS "public_read_delivery_config" ON orders_delivery_config;
DROP TRIGGER IF EXISTS set_updated_at_orders_delivery_config ON orders_delivery_config;
DROP TABLE IF EXISTS orders_delivery_config;
