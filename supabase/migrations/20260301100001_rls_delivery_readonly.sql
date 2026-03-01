-- RLS Lockdown: Delivery app (anon/authenticated role via browser)
-- can only SELECT on business tables.
-- POS API uses service_role which bypasses RLS entirely.
--
-- IMPORTANT: Review existing policies before deploying.
-- Run: SELECT * FROM pg_policies WHERE tablename IN ('orders_orders', 'orders_order_items', 'orders_kitchen_tickets', 'crm_customer_coupons');

-- Revoke write permissions on order tables for anon and authenticated roles.
-- The delivery app now writes via POS API (service_role), so these are no longer needed.
REVOKE INSERT, UPDATE, DELETE ON orders_orders FROM anon;
REVOKE INSERT, UPDATE, DELETE ON orders_orders FROM authenticated;

REVOKE INSERT, UPDATE, DELETE ON orders_order_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON orders_order_items FROM authenticated;

REVOKE INSERT, UPDATE, DELETE ON orders_kitchen_tickets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON orders_kitchen_tickets FROM authenticated;

-- CRM coupons: revoke UPDATE for authenticated (delivery used to mark coupons as used directly).
-- Now handled via POS API endpoint PATCH /api/v1/crm/coupons/:id.
REVOKE UPDATE ON crm_customer_coupons FROM authenticated;

-- Menu tables: keep SELECT for anon and authenticated (public data for browsing).
-- No changes needed — they should already be read-only.

-- CRM customers: keep SELECT and UPDATE for authenticated
-- (users can read and update their own profile).
-- RLS policy should already enforce auth.uid() = id.
