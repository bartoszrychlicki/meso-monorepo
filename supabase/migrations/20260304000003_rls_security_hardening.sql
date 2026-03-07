-- ============================================================================
-- Migration: RLS Security Hardening
-- Date: 2026-03-04
--
-- CRITICAL FIX: Replaces permissive "Allow all" policies with proper
-- role-based access control.
--
-- Root cause: Migration 20260225000004 set USING(true) WITH CHECK(true) on
-- 18 core tables, allowing ALL operations for ALL roles including anon.
-- Migration 20260228000008 tried to fix 3 tables but used wrong policy names
-- ("Allow all access" instead of "Allow all access to <table>"), so the
-- permissive policies were never dropped.
--
-- Role model:
--   service_role   -> Full access (bypasses RLS by default in Supabase)
--   POS Staff      -> authenticated + exists in users_users -> full CRUD
--   Delivery Cust  -> authenticated + crm_customers.auth_id -> own data only
--   anon           -> Read-only on public data (menu, locations, config)
-- ============================================================================

BEGIN;
-- ============================================================================
-- 1. Helper function: is_staff()
-- ============================================================================
-- SECURITY DEFINER runs as function owner (postgres), bypassing RLS on
-- users_users to avoid circular dependency.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users_users
    WHERE email = (auth.jwt() ->> 'email')
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth;
-- ============================================================================
-- 2. Re-GRANT permissions revoked by 20260301100001_rls_delivery_readonly.sql
--    RLS is now the sole access control layer.
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON orders_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders_kitchen_tickets TO authenticated;
-- Explicit SELECT grants for anon on public-readable tables
GRANT SELECT ON menu_categories TO anon;
GRANT SELECT ON menu_products TO anon;
GRANT SELECT ON menu_modifier_groups TO anon;
GRANT SELECT ON menu_modifiers TO anon;
GRANT SELECT ON product_modifiers TO anon;
GRANT SELECT ON users_locations TO anon;
GRANT SELECT ON orders_delivery_config TO anon;
GRANT SELECT ON app_config TO anon;
GRANT SELECT ON promo_banners TO anon;
GRANT SELECT ON crm_promotions TO anon;
GRANT SELECT ON crm_loyalty_rewards TO anon;
GRANT SELECT ON crm_coupons TO anon;
-- ============================================================================
-- 3. Drop ALL existing policies (every known policy from all migrations)
-- ============================================================================

-- --- 20260225000004_basic_rls.sql ---
DROP POLICY IF EXISTS "Allow all access to users_locations" ON users_locations;
DROP POLICY IF EXISTS "Allow all access to users_users" ON users_users;
DROP POLICY IF EXISTS "Allow all access to menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "Allow all access to menu_products" ON menu_products;
DROP POLICY IF EXISTS "Allow all access to menu_modifier_groups" ON menu_modifier_groups;
DROP POLICY IF EXISTS "Allow all access to orders_orders" ON orders_orders;
DROP POLICY IF EXISTS "Allow all access to orders_kitchen_tickets" ON orders_kitchen_tickets;
DROP POLICY IF EXISTS "Allow all access to crm_customers" ON crm_customers;
DROP POLICY IF EXISTS "Allow all access to crm_loyalty_transactions" ON crm_loyalty_transactions;
DROP POLICY IF EXISTS "Allow all access to crm_coupons" ON crm_coupons;
DROP POLICY IF EXISTS "Allow all access to recipes_recipes" ON recipes_recipes;
DROP POLICY IF EXISTS "Allow all access to recipes_recipe_versions" ON recipes_recipe_versions;
DROP POLICY IF EXISTS "Allow all access to recipes_ingredient_usage_logs" ON recipes_ingredient_usage_logs;
DROP POLICY IF EXISTS "Allow all access to inventory_stock_items" ON inventory_stock_items;
DROP POLICY IF EXISTS "Allow all access to employees_employees" ON employees_employees;
DROP POLICY IF EXISTS "Allow all access to employees_work_times" ON employees_work_times;
DROP POLICY IF EXISTS "Allow all access to integrations_api_keys" ON integrations_api_keys;
DROP POLICY IF EXISTS "Allow all access to integrations_webhook_subscriptions" ON integrations_webhook_subscriptions;
-- --- 20260226000002_warehouse_rls.sql ---
DROP POLICY IF EXISTS "Allow all access to inventory_warehouses" ON inventory_warehouses;
DROP POLICY IF EXISTS "Allow all access to inventory_warehouse_stock" ON inventory_warehouse_stock;
-- --- 20260226000004_expand_stock_items.sql ---
DROP POLICY IF EXISTS "Allow all operations on stock_item_components" ON inventory_stock_item_components;
-- --- 20260226100001_add_deliveries.sql ---
DROP POLICY IF EXISTS "Allow all for authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Allow all for anon users" ON suppliers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON deliveries;
DROP POLICY IF EXISTS "Allow all for anon users" ON deliveries;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON delivery_items;
DROP POLICY IF EXISTS "Allow all for anon users" ON delivery_items;
-- --- 20260228000003_delivery_customer_addresses.sql ---
DROP POLICY IF EXISTS "customers_manage_own_addresses" ON crm_customer_addresses;
DROP POLICY IF EXISTS "staff_manage_addresses" ON crm_customer_addresses;
-- --- 20260228000005_delivery_order_items_table.sql ---
DROP POLICY IF EXISTS "customers_view_own_order_items" ON orders_order_items;
DROP POLICY IF EXISTS "customers_create_own_order_items" ON orders_order_items;
DROP POLICY IF EXISTS "staff_manage_order_items" ON orders_order_items;
-- --- 20260228000006_delivery_config.sql ---
DROP POLICY IF EXISTS "public_read_delivery_config" ON orders_delivery_config;
DROP POLICY IF EXISTS "staff_manage_delivery_config" ON orders_delivery_config;
-- --- 20260228000007_delivery_promotions.sql ---
DROP POLICY IF EXISTS "public_read_active_promotions" ON crm_promotions;
DROP POLICY IF EXISTS "staff_manage_promotions" ON crm_promotions;
DROP POLICY IF EXISTS "customers_view_own_coupons" ON crm_customer_coupons;
DROP POLICY IF EXISTS "service_role_manage_coupons" ON crm_customer_coupons;
DROP POLICY IF EXISTS "public_read_active_rewards" ON crm_loyalty_rewards;
DROP POLICY IF EXISTS "staff_manage_rewards" ON crm_loyalty_rewards;
-- --- 20260228000008_delivery_rls_customers.sql ---
DROP POLICY IF EXISTS "delivery_customers_read_own_profile" ON crm_customers;
DROP POLICY IF EXISTS "delivery_customers_update_own_profile" ON crm_customers;
DROP POLICY IF EXISTS "staff_full_access_customers" ON crm_customers;
DROP POLICY IF EXISTS "service_role_customers" ON crm_customers;
DROP POLICY IF EXISTS "delivery_customers_read_own_orders" ON orders_orders;
DROP POLICY IF EXISTS "delivery_customers_create_orders" ON orders_orders;
DROP POLICY IF EXISTS "staff_full_access_orders" ON orders_orders;
DROP POLICY IF EXISTS "service_role_orders" ON orders_orders;
DROP POLICY IF EXISTS "delivery_customers_read_own_loyalty" ON crm_loyalty_transactions;
DROP POLICY IF EXISTS "staff_full_access_loyalty" ON crm_loyalty_transactions;
DROP POLICY IF EXISTS "service_role_loyalty" ON crm_loyalty_transactions;
-- --- 20260228000009_delivery_app_config.sql ---
DROP POLICY IF EXISTS "app_config_public_read" ON app_config;
DROP POLICY IF EXISTS "app_config_staff_write" ON app_config;
DROP POLICY IF EXISTS "promo_banners_public_read" ON promo_banners;
DROP POLICY IF EXISTS "promo_banners_staff_write" ON promo_banners;
-- --- 20260228100001_modifiers_standalone.sql ---
DROP POLICY IF EXISTS "Allow all access to menu_modifiers" ON menu_modifiers;
DROP POLICY IF EXISTS "Allow all access to product_modifiers" ON product_modifiers;
-- --- 20260301000001_location_config_tables.sql ---
DROP POLICY IF EXISTS "public_read_receipt_config" ON location_receipt_config;
DROP POLICY IF EXISTS "staff_manage_receipt_config" ON location_receipt_config;
DROP POLICY IF EXISTS "public_read_kds_config" ON location_kds_config;
DROP POLICY IF EXISTS "staff_manage_kds_config" ON location_kds_config;
-- --- 20260303000003_inventory_categories.sql ---
DROP POLICY IF EXISTS "Allow all access to inventory_categories" ON inventory_categories;
-- ============================================================================
-- 4. NEW POLICIES — Group A: Public read + staff manage
--    Menu, locations, config — browseable by everyone (anon + authenticated)
-- ============================================================================

-- ---- menu_categories ----
CREATE POLICY "anon_read_menu_categories" ON menu_categories
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_menu_categories" ON menu_categories
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- menu_products ----
CREATE POLICY "anon_read_menu_products" ON menu_products
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_menu_products" ON menu_products
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- menu_modifier_groups ----
CREATE POLICY "anon_read_menu_modifier_groups" ON menu_modifier_groups
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_menu_modifier_groups" ON menu_modifier_groups
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- menu_modifiers ----
CREATE POLICY "anon_read_menu_modifiers" ON menu_modifiers
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_menu_modifiers" ON menu_modifiers
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- product_modifiers ----
CREATE POLICY "anon_read_product_modifiers" ON product_modifiers
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_product_modifiers" ON product_modifiers
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- users_locations ----
CREATE POLICY "anon_read_users_locations" ON users_locations
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_users_locations" ON users_locations
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- orders_delivery_config ----
CREATE POLICY "anon_read_delivery_config" ON orders_delivery_config
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_delivery_config" ON orders_delivery_config
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- app_config ----
CREATE POLICY "anon_read_app_config" ON app_config
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_app_config" ON app_config
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- promo_banners ----
CREATE POLICY "anon_read_promo_banners" ON promo_banners
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_promo_banners" ON promo_banners
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- crm_promotions (public can read active only) ----
CREATE POLICY "anon_read_active_promotions" ON crm_promotions
    FOR SELECT USING (
        is_active = true
        AND (valid_from IS NULL OR valid_from <= now())
        AND (valid_until IS NULL OR valid_until >= now())
    );
CREATE POLICY "staff_manage_promotions" ON crm_promotions
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- crm_loyalty_rewards (public can read active only) ----
CREATE POLICY "anon_read_active_rewards" ON crm_loyalty_rewards
    FOR SELECT USING (is_active = true);
CREATE POLICY "staff_manage_rewards" ON crm_loyalty_rewards
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- location_receipt_config ----
CREATE POLICY "anon_read_receipt_config" ON location_receipt_config
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_receipt_config" ON location_receipt_config
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- location_kds_config ----
CREATE POLICY "anon_read_kds_config" ON location_kds_config
    FOR SELECT USING (true);
CREATE POLICY "staff_manage_kds_config" ON location_kds_config
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ============================================================================
-- 5. NEW POLICIES — Group B: Staff-only tables
--    No public/anon access. Only authenticated staff.
-- ============================================================================

-- ---- users_users ----
-- is_staff() is SECURITY DEFINER so reads users_users as postgres,
-- no circular dependency.
CREATE POLICY "staff_all_users_users" ON users_users
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- orders_kitchen_tickets ----
CREATE POLICY "staff_all_kitchen_tickets" ON orders_kitchen_tickets
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- recipes_recipes ----
CREATE POLICY "staff_all_recipes" ON recipes_recipes
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- recipes_recipe_versions ----
CREATE POLICY "staff_all_recipe_versions" ON recipes_recipe_versions
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- recipes_ingredient_usage_logs ----
CREATE POLICY "staff_all_ingredient_usage_logs" ON recipes_ingredient_usage_logs
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- inventory_stock_items ----
CREATE POLICY "staff_all_inventory_stock_items" ON inventory_stock_items
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- inventory_categories ----
CREATE POLICY "staff_all_inventory_categories" ON inventory_categories
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- inventory_warehouses ----
CREATE POLICY "staff_all_inventory_warehouses" ON inventory_warehouses
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- inventory_warehouse_stock ----
CREATE POLICY "staff_all_inventory_warehouse_stock" ON inventory_warehouse_stock
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- inventory_stock_item_components ----
CREATE POLICY "staff_all_stock_item_components" ON inventory_stock_item_components
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- employees_employees ----
CREATE POLICY "staff_all_employees" ON employees_employees
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- employees_work_times ----
CREATE POLICY "staff_all_work_times" ON employees_work_times
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- integrations_api_keys ----
CREATE POLICY "staff_all_api_keys" ON integrations_api_keys
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- integrations_webhook_subscriptions ----
CREATE POLICY "staff_all_webhook_subscriptions" ON integrations_webhook_subscriptions
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- suppliers ----
CREATE POLICY "staff_all_suppliers" ON suppliers
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- deliveries ----
CREATE POLICY "staff_all_deliveries" ON deliveries
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ---- delivery_items ----
CREATE POLICY "staff_all_delivery_items" ON delivery_items
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- ============================================================================
-- 6. NEW POLICIES — Group C: Staff + delivery customer (own data)
--    Staff gets full CRUD; customers get scoped access to own data.
-- ============================================================================

-- ---- crm_customers ----
-- Staff: full access
CREATE POLICY "staff_all_crm_customers" ON crm_customers
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- Customer: read own profile
CREATE POLICY "customer_select_own_profile" ON crm_customers
    FOR SELECT TO authenticated
    USING (auth_id = auth.uid());
-- Customer: update own profile
CREATE POLICY "customer_update_own_profile" ON crm_customers
    FOR UPDATE TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());
-- ---- crm_customer_addresses ----
-- Staff: full access
CREATE POLICY "staff_all_customer_addresses" ON crm_customer_addresses
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- Customer: full CRUD on own addresses
CREATE POLICY "customer_manage_own_addresses" ON crm_customer_addresses
    FOR ALL TO authenticated
    USING (
        customer_id IN (SELECT id FROM crm_customers WHERE auth_id = auth.uid())
    )
    WITH CHECK (
        customer_id IN (SELECT id FROM crm_customers WHERE auth_id = auth.uid())
    );
-- ---- crm_loyalty_transactions ----
-- Staff: full access
CREATE POLICY "staff_all_loyalty_transactions" ON crm_loyalty_transactions
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- Customer: read own history
CREATE POLICY "customer_select_own_loyalty" ON crm_loyalty_transactions
    FOR SELECT TO authenticated
    USING (
        customer_id IN (SELECT id FROM crm_customers WHERE auth_id = auth.uid())
    );
-- ---- crm_coupons ----
-- Staff: full access
CREATE POLICY "staff_all_crm_coupons" ON crm_coupons
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- Customer/public: read active, valid coupons
CREATE POLICY "anon_read_active_coupons" ON crm_coupons
    FOR SELECT USING (
        is_active = true
        AND valid_from <= now()
        AND valid_until >= now()
    );
-- ---- crm_customer_coupons ----
-- Staff/service_role: full access.
-- Customer writes are intentionally server-only to prevent direct browser
-- updates to coupon values or lifecycle fields.
CREATE POLICY "staff_all_customer_coupons" ON crm_customer_coupons
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- Service role: full access (for API routes that manage coupon status)
CREATE POLICY "service_role_customer_coupons" ON crm_customer_coupons
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
-- Customer: read own coupons
CREATE POLICY "customer_select_own_coupons" ON crm_customer_coupons
    FOR SELECT TO authenticated
    USING (
        customer_id IN (SELECT id FROM crm_customers WHERE auth_id = auth.uid())
    );
-- ---- orders_orders ----
-- Staff: full access.
-- Delivery customers read their own orders directly, but writes happen via
-- POS API / service-role flows only.
CREATE POLICY "staff_all_orders" ON orders_orders
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- Customer: read own orders
CREATE POLICY "customer_select_own_orders" ON orders_orders
    FOR SELECT TO authenticated
    USING (
        customer_id IN (SELECT id FROM crm_customers WHERE auth_id = auth.uid())
    );
-- ---- orders_order_items ----
-- Staff: full access.
-- Delivery customers read their own order items directly, but writes happen
-- via POS API / service-role flows only.
CREATE POLICY "staff_all_order_items" ON orders_order_items
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
-- Customer: read own order items (via order_id -> orders_orders)
CREATE POLICY "customer_select_own_order_items" ON orders_order_items
    FOR SELECT TO authenticated
    USING (
        order_id IN (
            SELECT o.id FROM orders_orders o
            WHERE o.customer_id IN (
                SELECT c.id FROM crm_customers c WHERE c.auth_id = auth.uid()
            )
        )
    );
COMMIT;
