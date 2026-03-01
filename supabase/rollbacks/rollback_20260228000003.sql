-- Rollback: 20260228000003_delivery_customer_addresses.sql

DROP POLICY IF EXISTS "staff_manage_addresses" ON crm_customer_addresses;
DROP POLICY IF EXISTS "customers_manage_own_addresses" ON crm_customer_addresses;
DROP TRIGGER IF EXISTS set_updated_at_crm_customer_addresses ON crm_customer_addresses;
DROP TABLE IF EXISTS crm_customer_addresses;
