-- ============================================================================
-- Migration: Extend CRM schema for Delivery customers
-- Part of: Meso Delivery → MesoPOS integration
-- Adds auth_id link, referral system, birthday, phone, consents
-- Also adds lifetime_points for tier calculation without downgrade
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extend crm_customers for delivery customer support
-- --------------------------------------------------------------------------

-- Link to Supabase Auth (delivery customers authenticate via Supabase Auth)
-- POS staff uses users_users; delivery customers use crm_customers
ALTER TABLE crm_customers
    ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE,
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);

-- Referral system (from Delivery)
ALTER TABLE crm_customers
    ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES crm_customers(id);

-- Lifetime points: cumulative total, never decreases (tiers based on this)
-- loyalty_points = active spendable balance
-- lifetime_points = total ever earned (for tier upgrades, no downgrade)
ALTER TABLE crm_customers
    ADD COLUMN IF NOT EXISTS lifetime_points INTEGER NOT NULL DEFAULT 0;

-- Consent tracking (RODO/GDPR)
ALTER TABLE crm_customers
    ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT false;

-- Delivery-specific source values
COMMENT ON COLUMN crm_customers.source IS 'Source of customer: pos_terminal, delivery_app, website, import, referral';

-- --------------------------------------------------------------------------
-- 2. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_customers_auth_id ON crm_customers(auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_customers_referral_code ON crm_customers(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_customers_referred_by ON crm_customers(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_customers_lifetime_points ON crm_customers(lifetime_points);

-- --------------------------------------------------------------------------
-- 3. Function: Generate unique referral code for delivery customers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_already BOOLEAN;
BEGIN
    LOOP
        code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        SELECT EXISTS(SELECT 1 FROM crm_customers WHERE referral_code = code) INTO exists_already;
        EXIT WHEN NOT exists_already;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 4. Function: Handle new delivery customer registration
--    Creates crm_customers record when a new auth user signs up via delivery app
--    Triggered by auth.users INSERT where raw_user_meta_data->>'app_role' = 'customer'
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_delivery_customer()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
    v_phone TEXT;
BEGIN
    -- Only handle delivery customers, not staff
    IF (NEW.raw_user_meta_data ->> 'app_role') IS DISTINCT FROM 'customer' THEN
        RETURN NEW;
    END IF;

    v_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
    v_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');
    v_email := COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email');
    v_phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone, '');

    INSERT INTO crm_customers (
        auth_id,
        first_name,
        last_name,
        email,
        phone,
        contact_phone,
        birth_date,
        registration_date,
        source,
        marketing_consent,
        sms_consent,
        loyalty_points,
        lifetime_points,
        loyalty_tier,
        referral_code,
        is_active
    ) VALUES (
        NEW.id,
        v_first_name,
        v_last_name,
        v_email,
        v_phone,
        v_phone,
        NEW.raw_user_meta_data ->> 'birthday',
        to_char(now(), 'YYYY-MM-DD'),
        'delivery_app',
        COALESCE((NEW.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
        COALESCE((NEW.raw_user_meta_data ->> 'sms_consent')::boolean, false),
        50,  -- registration bonus
        50,
        'bronze',
        generate_referral_code(),
        true
    );

    -- Log registration bonus
    INSERT INTO crm_loyalty_transactions (
        customer_id,
        amount,
        reason,
        description,
        multiplier
    )
    SELECT id, 50, 'registration_bonus', 'Bonus rejestracyjny', 1
    FROM crm_customers WHERE auth_id = NEW.id;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Customer already exists (e.g. re-registration attempt)
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_delivery_customer failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 5. Trigger: Auto-create customer on delivery signup
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_delivery_customer_created ON auth.users;
CREATE TRIGGER on_delivery_customer_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_delivery_customer();

-- --------------------------------------------------------------------------
-- 6. Function: Auto-upgrade loyalty tier based on lifetime_points
--    Called after loyalty points are added. No downgrade.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_customer RECORD;
    v_new_tier TEXT;
BEGIN
    SELECT loyalty_tier, lifetime_points INTO v_customer
    FROM crm_customers WHERE id = NEW.customer_id;

    IF v_customer.lifetime_points >= 1500 THEN
        v_new_tier := 'gold';
    ELSIF v_customer.lifetime_points >= 500 THEN
        v_new_tier := 'silver';
    ELSE
        v_new_tier := 'bronze';
    END IF;

    -- Only upgrade, never downgrade
    IF v_new_tier != v_customer.loyalty_tier AND (
        (v_new_tier = 'gold') OR
        (v_new_tier = 'silver' AND v_customer.loyalty_tier = 'bronze')
    ) THEN
        UPDATE crm_customers SET loyalty_tier = v_new_tier WHERE id = NEW.customer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_loyalty_transaction_tier_check ON crm_loyalty_transactions;
CREATE TRIGGER on_loyalty_transaction_tier_check
    AFTER INSERT ON crm_loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_loyalty_tier();
