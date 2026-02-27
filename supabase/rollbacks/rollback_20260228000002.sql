-- Rollback: 20260228000002_delivery_extend_crm.sql

DROP TRIGGER IF EXISTS on_loyalty_transaction_tier_check ON crm_loyalty_transactions;
DROP FUNCTION IF EXISTS update_loyalty_tier();
DROP TRIGGER IF EXISTS on_delivery_customer_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_delivery_customer();
DROP FUNCTION IF EXISTS generate_referral_code();

DROP INDEX IF EXISTS idx_crm_customers_lifetime_points;
DROP INDEX IF EXISTS idx_crm_customers_referred_by;
DROP INDEX IF EXISTS idx_crm_customers_referral_code;
DROP INDEX IF EXISTS idx_crm_customers_auth_id;

ALTER TABLE crm_customers
    DROP COLUMN IF EXISTS sms_consent,
    DROP COLUMN IF EXISTS lifetime_points,
    DROP COLUMN IF EXISTS referred_by,
    DROP COLUMN IF EXISTS referral_code,
    DROP COLUMN IF EXISTS contact_phone,
    DROP COLUMN IF EXISTS auth_id;
