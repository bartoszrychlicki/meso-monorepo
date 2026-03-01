-- Rollback: 20260228000005_delivery_order_items_table.sql

DROP POLICY IF EXISTS "staff_manage_order_items" ON orders_order_items;
DROP POLICY IF EXISTS "customers_create_own_order_items" ON orders_order_items;
DROP POLICY IF EXISTS "customers_view_own_order_items" ON orders_order_items;
DROP TABLE IF EXISTS orders_order_items;
