-- Ensure the trigger exists and is properly attached to auth.users
-- This migration is idempotent

-- First, ensure the function exists with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_is_anonymous BOOLEAN := false;
  v_customer_id UUID;
BEGIN
  -- Detect anonymous users
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
  INSERT INTO public.customers (
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
    name = COALESCE(EXCLUDED.name, public.customers.name),
    is_anonymous = EXCLUDED.is_anonymous,
    loyalty_points = CASE
      WHEN public.customers.is_anonymous = true AND EXCLUDED.is_anonymous = false
      THEN public.customers.loyalty_points + 50
      ELSE public.customers.loyalty_points
    END,
    lifetime_points = CASE
      WHEN public.customers.is_anonymous = true AND EXCLUDED.is_anonymous = false
      THEN public.customers.lifetime_points + 50
      ELSE public.customers.lifetime_points
    END,
    referral_code = COALESCE(public.customers.referral_code, EXCLUDED.referral_code)
  WHERE public.customers.is_anonymous = true AND EXCLUDED.is_anonymous = false
  RETURNING id INTO v_customer_id;

  -- Log registration bonus only for permanent users
  IF v_customer_id IS NOT NULL AND NOT user_is_anonymous THEN
    INSERT INTO public.loyalty_history (customer_id, label, points, type)
    VALUES (v_customer_id, 'Bonus rejestracyjny', 50, 'bonus');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create the trigger with explicit schema references
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create customer records for any auth users that are missing them
INSERT INTO public.customers (id, email, name, is_anonymous, referral_code, loyalty_points, loyalty_tier, lifetime_points, marketing_consent)
SELECT
  u.id,
  CASE WHEN u.raw_app_meta_data->>'provider' = 'anonymous' OR u.email IS NULL OR u.email = '' THEN NULL ELSE u.email END,
  CASE WHEN u.raw_app_meta_data->>'provider' = 'anonymous' OR u.email IS NULL OR u.email = '' THEN NULL
       ELSE COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
  END,
  CASE WHEN u.raw_app_meta_data->>'provider' = 'anonymous' OR u.email IS NULL OR u.email = '' THEN true ELSE false END,
  CASE WHEN u.raw_app_meta_data->>'provider' = 'anonymous' OR u.email IS NULL OR u.email = '' THEN NULL
       ELSE UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
  END,
  CASE WHEN u.raw_app_meta_data->>'provider' = 'anonymous' OR u.email IS NULL OR u.email = '' THEN 0 ELSE 50 END,
  'bronze',
  CASE WHEN u.raw_app_meta_data->>'provider' = 'anonymous' OR u.email IS NULL OR u.email = '' THEN 0 ELSE 50 END,
  false
FROM auth.users u
LEFT JOIN public.customers c ON c.id = u.id
WHERE c.id IS NULL
ON CONFLICT (id) DO NOTHING;
