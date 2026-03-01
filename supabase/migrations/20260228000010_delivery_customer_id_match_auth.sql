-- ============================================================================
-- Migration 000010: Match crm_customers.id with auth.users.id for delivery
--
-- Problem: The original trigger creates crm_customers with gen_random_uuid()
-- as id and auth.users.id as auth_id. This means Delivery frontend code can't
-- use auth.uid() directly as customer_id in orders, loyalty, etc.
--
-- Fix: Replace the trigger function so that for delivery customers,
-- crm_customers.id = auth.users.id. This way all existing Delivery frontend
-- patterns like `.eq('customer_id', user.id)` continue working.
-- ============================================================================

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
        id,           -- USE auth.users.id so Delivery can use auth.uid() directly
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
        NEW.id,       -- crm_customers.id = auth.users.id
        NEW.id,       -- auth_id = auth.users.id (same value, for queries using either)
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

    -- Log registration bonus (customer_id = NEW.id directly)
    INSERT INTO crm_loyalty_transactions (
        customer_id,
        amount,
        reason,
        description,
        multiplier
    ) VALUES (
        NEW.id,   -- direct reference, no subquery needed
        50,
        'registration_bonus',
        'Bonus rejestracyjny',
        1
    );

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
