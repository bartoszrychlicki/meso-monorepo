-- ============================================================================
-- Migration: Create customer_addresses table
-- Part of: Meso Delivery → MesoPOS integration
-- Replaces JSONB addresses in crm_customers with proper relational table
-- Supports multiple delivery addresses per customer
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Enable PostGIS if not already enabled (for coordinates)
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;

-- --------------------------------------------------------------------------
-- 2. Create crm_customer_addresses table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL DEFAULT 'Dom',
    street VARCHAR(255) NOT NULL,
    building_number VARCHAR(20) NOT NULL,
    apartment_number VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    notes TEXT,
    coordinates GEOGRAPHY(POINT, 4326),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_customer_addresses_customer_id
    ON crm_customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_customer_addresses_is_default
    ON crm_customer_addresses(customer_id, is_default) WHERE is_default = true;

-- --------------------------------------------------------------------------
-- 4. Updated_at trigger
-- --------------------------------------------------------------------------
CREATE TRIGGER set_updated_at_crm_customer_addresses
    BEFORE UPDATE ON crm_customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- --------------------------------------------------------------------------
-- 5. RLS
-- --------------------------------------------------------------------------
ALTER TABLE crm_customer_addresses ENABLE ROW LEVEL SECURITY;

-- Delivery customers can manage their own addresses (via auth_id → customer_id)
CREATE POLICY "customers_manage_own_addresses" ON crm_customer_addresses
    FOR ALL TO authenticated
    USING (
        customer_id IN (
            SELECT id FROM crm_customers WHERE auth_id = auth.uid()
        )
    )
    WITH CHECK (
        customer_id IN (
            SELECT id FROM crm_customers WHERE auth_id = auth.uid()
        )
    );

-- Staff can view/manage all addresses (for order management)
CREATE POLICY "staff_manage_addresses" ON crm_customer_addresses
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'
        )
    );
