-- Rollback: 20260228000008_delivery_rls_customers.sql
-- Restores original "Allow all access" policies

-- Loyalty transactions
DROP POLICY IF EXISTS "service_role_loyalty" ON crm_loyalty_transactions;
DROP POLICY IF EXISTS "staff_full_access_loyalty" ON crm_loyalty_transactions;
DROP POLICY IF EXISTS "delivery_customers_read_own_loyalty" ON crm_loyalty_transactions;
CREATE POLICY "Allow all access" ON crm_loyalty_transactions FOR ALL USING (true) WITH CHECK (true);

-- Orders
DROP POLICY IF EXISTS "service_role_orders" ON orders_orders;
DROP POLICY IF EXISTS "staff_full_access_orders" ON orders_orders;
DROP POLICY IF EXISTS "delivery_customers_create_orders" ON orders_orders;
DROP POLICY IF EXISTS "delivery_customers_read_own_orders" ON orders_orders;
CREATE POLICY "Allow all access" ON orders_orders FOR ALL USING (true) WITH CHECK (true);

-- Customers
DROP POLICY IF EXISTS "service_role_customers" ON crm_customers;
DROP POLICY IF EXISTS "staff_full_access_customers" ON crm_customers;
DROP POLICY IF EXISTS "delivery_customers_update_own_profile" ON crm_customers;
DROP POLICY IF EXISTS "delivery_customers_read_own_profile" ON crm_customers;
CREATE POLICY "Allow all access" ON crm_customers FOR ALL USING (true) WITH CHECK (true);
