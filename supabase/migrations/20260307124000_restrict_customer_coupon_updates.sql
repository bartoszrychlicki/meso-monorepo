-- Keep coupon lifecycle writes on server-side routes only.
-- Customers can still read their own coupons, but browser clients must not
-- update crm_customer_coupons directly.

DROP POLICY IF EXISTS "customer_update_own_coupons" ON crm_customer_coupons;
