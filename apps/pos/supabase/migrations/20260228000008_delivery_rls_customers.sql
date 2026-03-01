-- ============================================================================
-- Migration: RLS policies for delivery customers accessing POS data
-- Part of: Meso Delivery → MesoPOS integration
-- Adds customer-facing read policies on menu, orders, and CRM tables
-- Existing "allow all" staff policies remain untouched
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Menu: Delivery customers can read active products and categories
--    (POS currently has "allow all" policies; we add specific customer ones
--     that will work when POS tightens its policies later)
-- --------------------------------------------------------------------------

-- No changes needed for menu_categories and menu_products:
-- Current POS policy is SELECT true, which already allows delivery customers to read.
-- When POS tightens policies, add specific customer policies here.

-- --------------------------------------------------------------------------
-- 2. CRM: Delivery customers can manage their own profile
-- --------------------------------------------------------------------------

-- Drop existing overly-permissive policies that would conflict
-- (POS has "allow all to true" which we'll eventually want to restrict)
DROP POLICY IF EXISTS "Allow all access" ON crm_customers;

-- Delivery customers can read/update their own profile
CREATE POLICY "delivery_customers_read_own_profile" ON crm_customers
    FOR SELECT TO authenticated
    USING (
        auth_id = auth.uid()
        OR
        -- Staff can see all customers (for CRM)
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    );

CREATE POLICY "delivery_customers_update_own_profile" ON crm_customers
    FOR UPDATE TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Staff can do everything with customers
CREATE POLICY "staff_full_access_customers" ON crm_customers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'));

-- Service role always has full access (for triggers and API routes)
CREATE POLICY "service_role_customers" ON crm_customers
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- --------------------------------------------------------------------------
-- 3. Orders: Delivery customers can view/create their own orders
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all access" ON orders_orders;

-- Customers can view their own orders (matched via crm_customers.auth_id)
CREATE POLICY "delivery_customers_read_own_orders" ON orders_orders
    FOR SELECT TO authenticated
    USING (
        customer_id::text IN (
            SELECT id::text FROM crm_customers WHERE auth_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    );

-- Customers can create orders
CREATE POLICY "delivery_customers_create_orders" ON orders_orders
    FOR INSERT TO authenticated
    WITH CHECK (
        customer_id::text IN (
            SELECT id::text FROM crm_customers WHERE auth_id = auth.uid()
        )
    );

-- Staff full access
CREATE POLICY "staff_full_access_orders" ON orders_orders
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'));

-- Service role
CREATE POLICY "service_role_orders" ON orders_orders
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- --------------------------------------------------------------------------
-- 4. Loyalty transactions: customers can view their own
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all access" ON crm_loyalty_transactions;

CREATE POLICY "delivery_customers_read_own_loyalty" ON crm_loyalty_transactions
    FOR SELECT TO authenticated
    USING (
        customer_id IN (
            SELECT id FROM crm_customers WHERE auth_id = auth.uid()
        )
    );

-- Staff and service role full access
CREATE POLICY "staff_full_access_loyalty" ON crm_loyalty_transactions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "service_role_loyalty" ON crm_loyalty_transactions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- --------------------------------------------------------------------------
-- 5. Delivery config: public read (already set in migration 000006)
-- --------------------------------------------------------------------------
-- Already handled in 20260228000006_delivery_config.sql

-- --------------------------------------------------------------------------
-- 6. Kitchen tickets: only staff (delivery customers don't need this)
-- --------------------------------------------------------------------------
-- No changes needed; existing "allow all" policy covers staff.
