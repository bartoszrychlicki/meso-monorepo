-- Rollback: 20260228000007_delivery_promotions.sql

DROP POLICY IF EXISTS "staff_manage_rewards" ON crm_loyalty_rewards;
DROP POLICY IF EXISTS "public_read_active_rewards" ON crm_loyalty_rewards;
DROP POLICY IF EXISTS "service_role_manage_coupons" ON crm_customer_coupons;
DROP POLICY IF EXISTS "customers_view_own_coupons" ON crm_customer_coupons;
DROP POLICY IF EXISTS "staff_manage_promotions" ON crm_promotions;
DROP POLICY IF EXISTS "public_read_active_promotions" ON crm_promotions;

DROP TRIGGER IF EXISTS set_updated_at_crm_promotions ON crm_promotions;

DROP TABLE IF EXISTS crm_loyalty_rewards;
DROP TABLE IF EXISTS crm_customer_coupons;
DROP TABLE IF EXISTS crm_promotions;
