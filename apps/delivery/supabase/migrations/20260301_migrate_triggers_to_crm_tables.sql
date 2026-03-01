-- Migration: Create auth triggers for POS crm_customers table
--
-- Creates two triggers on auth.users:
-- 1. handle_new_delivery_customer: On INSERT, creates crm_customers record + 50pt registration bonus
-- 2. handle_delivery_email_update: On UPDATE, syncs email changes to crm_customers
--
-- IMPORTANT: crm_customers.id is set to auth.users.id so the app can query with .eq('id', user.id)

-- ═══════════════════════════════════════════════════════════════
-- 1. Trigger function: handle new user registration
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_delivery_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_marketing_consent boolean;
  v_customer_id uuid;
BEGIN
  -- Only process users with app_role = 'customer'
  IF NEW.raw_user_meta_data->>'app_role' != 'customer' THEN
    RETURN NEW;
  END IF;

  -- Skip if crm_customers record already exists for this auth user
  IF EXISTS (SELECT 1 FROM public.crm_customers WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Extract metadata
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nowy');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'Klient');
  v_marketing_consent := COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false);

  -- Create customer record (id = auth.users.id for app compatibility)
  INSERT INTO public.crm_customers (
    id,
    auth_id,
    first_name,
    last_name,
    email,
    phone,
    registration_date,
    source,
    marketing_consent,
    loyalty_points,
    loyalty_tier,
    lifetime_points,
    is_active
  ) VALUES (
    NEW.id,
    NEW.id,
    v_first_name,
    v_last_name,
    NEW.email,
    COALESCE(NEW.phone, ''),
    NOW()::text,
    'web',
    v_marketing_consent,
    50,
    'bronze',
    50,
    true
  );

  v_customer_id := NEW.id;

  -- Insert registration bonus into loyalty transactions
  INSERT INTO public.crm_loyalty_transactions (
    customer_id,
    amount,
    reason,
    description,
    created_by
  ) VALUES (
    v_customer_id,
    50,
    'bonus',
    'Bonus rejestracyjny',
    'system'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block auth signup
  RAISE WARNING 'handle_new_delivery_customer error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Trigger function: sync email updates
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_delivery_email_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if email actually changed
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.crm_customers
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_delivery_email_update error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Create triggers on auth.users
-- ═══════════════════════════════════════════════════════════════

-- Drop if they exist (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created_delivery ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated_delivery ON auth.users;

CREATE TRIGGER on_auth_user_created_delivery
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_delivery_customer();

CREATE TRIGGER on_auth_user_updated_delivery
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_delivery_email_update();
