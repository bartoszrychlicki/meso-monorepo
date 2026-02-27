-- ============================================================================
-- Migration: Create order_items table (replaces JSONB items in orders_orders)
-- Part of: Meso Delivery → MesoPOS integration
-- Enables per-item reporting, spice level tracking, addon details
-- POS currently stores items as JSONB array in orders_orders.items
-- This migration adds a proper relational table alongside the existing JSONB
-- (both can coexist during transition; JSONB can be deprecated later)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Create orders_order_items table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES menu_products(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,

    -- Customization
    spice_level INTEGER CHECK (spice_level IS NULL OR spice_level BETWEEN 1 AND 3),
    variant_name VARCHAR(100),           -- e.g. "Duży (550ml)"
    variant_price_modifier NUMERIC(10,2) DEFAULT 0,
    addons JSONB NOT NULL DEFAULT '[]',  -- [{name, name_jp, price, quantity}]
    notes TEXT,                          -- special instructions per item

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 2. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_order_items_order_id
    ON orders_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_items_product_id
    ON orders_order_items(product_id);

-- --------------------------------------------------------------------------
-- 3. RLS
-- --------------------------------------------------------------------------
ALTER TABLE orders_order_items ENABLE ROW LEVEL SECURITY;

-- Delivery customers can view their own order items
CREATE POLICY "customers_view_own_order_items" ON orders_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders_orders o
            JOIN crm_customers c ON c.id::text = o.customer_id::text
            WHERE o.id = orders_order_items.order_id
            AND c.auth_id = auth.uid()
        )
    );

-- Delivery customers can create order items for their own orders
CREATE POLICY "customers_create_own_order_items" ON orders_order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders_orders o
            JOIN crm_customers c ON c.id::text = o.customer_id::text
            WHERE o.id = orders_order_items.order_id
            AND c.auth_id = auth.uid()
        )
    );

-- Staff can manage all order items
CREATE POLICY "staff_manage_order_items" ON orders_order_items
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
