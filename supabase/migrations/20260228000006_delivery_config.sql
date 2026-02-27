-- ============================================================================
-- Migration: Create delivery_config table
-- Part of: Meso Delivery → MesoPOS integration
-- Per-location delivery configuration (radius, fees, hours, etc.)
-- Only locations that support delivery have an entry here
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Create orders_delivery_config table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders_delivery_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES users_locations(id) ON DELETE CASCADE,
    delivery_radius_km NUMERIC(4,1) NOT NULL DEFAULT 5.0,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 7.99,
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 35.00,
    estimated_delivery_minutes INTEGER NOT NULL DEFAULT 40,
    is_delivery_active BOOLEAN NOT NULL DEFAULT true,
    opening_time TIME NOT NULL DEFAULT '11:00',
    closing_time TIME NOT NULL DEFAULT '22:00',
    -- Pickup-specific
    pickup_time_min INTEGER NOT NULL DEFAULT 15,
    pickup_time_max INTEGER NOT NULL DEFAULT 20,
    pickup_buffer_after_open INTEGER NOT NULL DEFAULT 30,
    pickup_buffer_before_close INTEGER NOT NULL DEFAULT 30,
    -- Pay on pickup rules
    pay_on_pickup_enabled BOOLEAN NOT NULL DEFAULT true,
    pay_on_pickup_fee NUMERIC(10,2) NOT NULL DEFAULT 2.00,
    pay_on_pickup_max_order NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(location_id)
);

-- --------------------------------------------------------------------------
-- 2. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_delivery_config_location
    ON orders_delivery_config(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_config_active
    ON orders_delivery_config(is_delivery_active) WHERE is_delivery_active = true;

-- --------------------------------------------------------------------------
-- 3. Updated_at trigger
-- --------------------------------------------------------------------------
CREATE TRIGGER set_updated_at_orders_delivery_config
    BEFORE UPDATE ON orders_delivery_config
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- --------------------------------------------------------------------------
-- 4. RLS
-- --------------------------------------------------------------------------
ALTER TABLE orders_delivery_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read delivery config (needed by delivery app to show availability)
CREATE POLICY "public_read_delivery_config" ON orders_delivery_config
    FOR SELECT USING (true);

-- Only staff can modify
CREATE POLICY "staff_manage_delivery_config" ON orders_delivery_config
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
