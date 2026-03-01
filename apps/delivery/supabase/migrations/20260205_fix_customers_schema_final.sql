-- Migration: Fix Customers Schema and Backfill
-- Description: Ensure customers table supports anonymous users and backfill missing records

-- 1. Schema Fixes
-- Ensure is_anonymous column exists
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Ensure email is nullable
ALTER TABLE public.customers ALTER COLUMN email DROP NOT NULL;

-- Fix unique constraint on email to allow multiple NULLs
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;
DROP INDEX IF EXISTS customers_email_unique;
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON public.customers(email) WHERE email IS NOT NULL;

-- 2. Update Trigger Function (Safe Version)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_is_anonymous BOOLEAN := false;
BEGIN
  -- Determine if user is anonymous
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
    id,
    email,
    is_anonymous,
    referral_code,
    loyalty_points,
    loyalty_tier,
    marketing_consent
  )
  VALUES (
    NEW.id,
    CASE WHEN user_is_anonymous THEN NULL ELSE NEW.email END,
    user_is_anonymous,
    CASE WHEN user_is_anonymous THEN NULL
         ELSE UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
    END,
    CASE WHEN user_is_anonymous THEN 0 ELSE 50 END,
    'bronze',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_anonymous = EXCLUDED.is_anonymous
  WHERE customers.is_anonymous = true AND EXCLUDED.is_anonymous = false;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Data Repair (CRITICAL)
-- Backfill missing customer records for existing auth users
INSERT INTO public.customers (id, email, is_anonymous, loyalty_points)
SELECT 
  au.id, 
  au.email, 
  (au.email IS NULL OR (au.raw_user_meta_data->>'is_anonymous')::boolean IS TRUE) as is_anonymous,
  CASE WHEN (au.email IS NULL OR (au.raw_user_meta_data->>'is_anonymous')::boolean IS TRUE) THEN 0 ELSE 50 END
FROM auth.users au
LEFT JOIN public.customers c ON au.id = c.id
WHERE c.id IS NULL;
