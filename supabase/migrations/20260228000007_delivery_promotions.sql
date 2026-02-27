-- ============================================================================
-- Migration: Create unified promotions system
-- Part of: Meso Delivery → MesoPOS integration
-- Merges Delivery's promo_codes + POS's crm_coupons into one system
-- Supports manual promo codes AND automated CRM triggers
-- NOTE: crm_coupons is kept for backwards compatibility but new promos
--       should use crm_promotions
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Create crm_promotions table (unified promo system)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code: NULL = auto-triggered (birthday, win_back), non-NULL = manual entry
    code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Discount type and value
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'free_item', 'free_delivery')),
    discount_value NUMERIC(10,2),
    free_item_id UUID REFERENCES menu_products(id) ON DELETE SET NULL,

    -- Conditions
    min_order_amount NUMERIC(10,2),
    first_order_only BOOLEAN NOT NULL DEFAULT false,
    required_loyalty_tier TEXT CHECK (required_loyalty_tier IS NULL OR required_loyalty_tier IN ('bronze', 'silver', 'gold')),

    -- CRM trigger (from POS crm_coupons concept)
    trigger_scenario TEXT NOT NULL DEFAULT 'manual'
        CHECK (trigger_scenario IN ('manual', 'birthday', 'win_back', 'new_customer', 'referral', 'tier_upgrade', 'seasonal')),

    -- Usage limits
    max_uses INTEGER,                    -- total uses across all customers
    max_uses_per_customer INTEGER DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,

    -- Validity
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Channel restriction
    channels TEXT[] NOT NULL DEFAULT '{delivery,pickup}',

    -- Applicable products (NULL = all products)
    applicable_product_ids UUID[],

    -- Metadata
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 2. Customer-specific coupon instances (redeemed rewards, personal coupons)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_customer_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
    promotion_id UUID REFERENCES crm_promotions(id) ON DELETE SET NULL,

    -- Generated unique code for this customer
    code VARCHAR(20) NOT NULL UNIQUE,
    coupon_type TEXT NOT NULL CHECK (coupon_type IN ('free_delivery', 'discount', 'free_product')),
    discount_value NUMERIC(10,2),
    free_product_name VARCHAR(255),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    points_spent INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'reward' CHECK (source IN ('reward', 'referral_welcome', 'birthday', 'promotion')),

    -- Lifecycle
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    order_id UUID REFERENCES orders_orders(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3. Loyalty rewards catalog (what customers can redeem points for)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('free_delivery', 'discount', 'free_product')),
    discount_value NUMERIC(10,2),
    free_product_id UUID REFERENCES menu_products(id) ON DELETE SET NULL,
    icon VARCHAR(50),
    min_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (min_tier IN ('bronze', 'silver', 'gold')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 4. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_promotions_code ON crm_promotions(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_promotions_is_active ON crm_promotions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crm_promotions_trigger ON crm_promotions(trigger_scenario);
CREATE INDEX IF NOT EXISTS idx_crm_promotions_valid ON crm_promotions(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_crm_customer_coupons_customer ON crm_customer_coupons(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_customer_coupons_code ON crm_customer_coupons(code);
CREATE INDEX IF NOT EXISTS idx_crm_customer_coupons_expires ON crm_customer_coupons(expires_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_crm_loyalty_rewards_active ON crm_loyalty_rewards(is_active, sort_order);

-- --------------------------------------------------------------------------
-- 5. Updated_at triggers
-- --------------------------------------------------------------------------
CREATE TRIGGER set_updated_at_crm_promotions
    BEFORE UPDATE ON crm_promotions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- --------------------------------------------------------------------------
-- 6. RLS
-- --------------------------------------------------------------------------
ALTER TABLE crm_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_customer_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- Promotions: public can view active ones (for promo code validation)
CREATE POLICY "public_read_active_promotions" ON crm_promotions
    FOR SELECT
    USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Staff can manage all promotions
CREATE POLICY "staff_manage_promotions" ON crm_promotions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'));

-- Customer coupons: customers see their own
CREATE POLICY "customers_view_own_coupons" ON crm_customer_coupons
    FOR SELECT TO authenticated
    USING (
        customer_id IN (SELECT id FROM crm_customers WHERE auth_id = auth.uid())
    );

-- Service role full access to customer coupons (for API routes)
CREATE POLICY "service_role_manage_coupons" ON crm_customer_coupons
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Loyalty rewards: public read
CREATE POLICY "public_read_active_rewards" ON crm_loyalty_rewards
    FOR SELECT USING (is_active = true);

-- Staff manage rewards
CREATE POLICY "staff_manage_rewards" ON crm_loyalty_rewards
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email'));
