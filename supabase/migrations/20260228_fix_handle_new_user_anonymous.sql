-- Fix: handle_new_user trigger was breaking anonymous sign-ins
-- The loyalty migration (20260227) removed anonymous user detection,
-- exception handling, and the ON CONFLICT upgrade logic.
-- This restores the robust anonymous-safe trigger with loyalty features.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_is_anonymous BOOLEAN := false;
  v_customer_id UUID;
BEGIN
  -- Detect anonymous users (same logic as 20260203_safe_anonymous_trigger)
  IF NEW.raw_app_meta_data IS NOT NULL AND NEW.raw_app_meta_data ? 'provider' THEN
    IF NEW.raw_app_meta_data->>'provider' = 'anonymous' THEN
      user_is_anonymous := true;
    END IF;
  END IF;

  IF NOT user_is_anonymous AND NEW.raw_user_meta_data IS NOT NULL THEN
    user_is_anonymous := COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false);
  END IF;

  IF NOT user_is_anonymous AND NEW.email IS NULL THEN
    user_is_anonymous := true;
  END IF;

  -- Insert customer record
  INSERT INTO customers (
    id, email, name, is_anonymous, referral_code,
    loyalty_points, loyalty_tier, lifetime_points, marketing_consent
  )
  VALUES (
    NEW.id,
    CASE WHEN user_is_anonymous THEN NULL ELSE NEW.email END,
    CASE WHEN user_is_anonymous THEN NULL
         ELSE COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    END,
    user_is_anonymous,
    CASE WHEN user_is_anonymous THEN NULL
         ELSE UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
    END,
    CASE WHEN user_is_anonymous THEN 0 ELSE 50 END,
    'bronze',
    CASE WHEN user_is_anonymous THEN 0 ELSE 50 END,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, customers.name),
    is_anonymous = EXCLUDED.is_anonymous,
    loyalty_points = CASE
      WHEN customers.is_anonymous = true AND EXCLUDED.is_anonymous = false
      THEN customers.loyalty_points + 50
      ELSE customers.loyalty_points
    END,
    lifetime_points = CASE
      WHEN customers.is_anonymous = true AND EXCLUDED.is_anonymous = false
      THEN customers.lifetime_points + 50
      ELSE customers.lifetime_points
    END,
    referral_code = COALESCE(customers.referral_code, EXCLUDED.referral_code)
  WHERE customers.is_anonymous = true AND EXCLUDED.is_anonymous = false
  RETURNING id INTO v_customer_id;

  -- Log registration bonus only for permanent users
  IF v_customer_id IS NOT NULL AND NOT user_is_anonymous THEN
    INSERT INTO loyalty_history (customer_id, label, points, type)
    VALUES (v_customer_id, 'Bonus rejestracyjny', 50, 'bonus');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
