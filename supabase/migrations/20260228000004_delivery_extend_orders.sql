-- ============================================================================
-- Migration: Extend orders schema for Delivery support
-- Part of: Meso Delivery → MesoPOS integration
-- Adds delivery-specific fields, payment methods, timestamps
-- POS orders.orders already has: channel, source, delivery_address, customer fields
-- We add: delivery fee, courier info, payment details, delivery timestamps
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extend orders_orders with delivery-specific fields
-- --------------------------------------------------------------------------

-- Delivery fee (separate from total for display purposes)
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Delivery type: distinguishes delivery vs pickup within delivery channel
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS delivery_type TEXT CHECK (delivery_type IS NULL OR delivery_type IN ('delivery', 'pickup'));

-- Promo/discount details
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS promo_discount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Tip (delivery feature)
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS tip NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Loyalty points tracking per order
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER NOT NULL DEFAULT 0;

-- Contact phone for delivery (may differ from customer phone)
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);

-- Courier info
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS courier_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS courier_notes TEXT;

-- Scheduled delivery/pickup
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ;

-- Estimated prep/delivery times
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS estimated_prep_time INTEGER,
    ADD COLUMN IF NOT EXISTS estimated_delivery_time INTEGER;

-- Delivery lifecycle timestamps
ALTER TABLE orders_orders
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 2. Indexes for delivery-related queries
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_orders_delivery_type
    ON orders_orders(delivery_type) WHERE delivery_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_orders_promo_code
    ON orders_orders(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_orders_paid_at
    ON orders_orders(paid_at) WHERE paid_at IS NOT NULL;

-- --------------------------------------------------------------------------
-- 3. Enable Realtime for delivery order tracking
-- --------------------------------------------------------------------------
ALTER TABLE orders_orders REPLICA IDENTITY FULL;

-- Add to realtime publication if not already there
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'orders_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders_orders;
    END IF;
END $$;
