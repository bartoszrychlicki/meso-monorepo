-- Migration: Safe Anonymous Sign-ins Trigger
-- Description: Create a safe handle_new_user() that works with any Supabase version

-- Create a more robust function that handles all cases
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_is_anonymous BOOLEAN := false;
BEGIN
  -- Try to get is_anonymous status from various sources
  -- Method 1: Check raw_app_meta_data (where Supabase stores it for anonymous users)
  IF NEW.raw_app_meta_data IS NOT NULL AND NEW.raw_app_meta_data ? 'provider' THEN
    IF NEW.raw_app_meta_data->>'provider' = 'anonymous' THEN
      user_is_anonymous := true;
    END IF;
  END IF;
  
  -- Method 2: Check raw_user_meta_data as fallback
  IF NOT user_is_anonymous AND NEW.raw_user_meta_data IS NOT NULL THEN
    user_is_anonymous := COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false);
  END IF;

  -- Method 3: If email is null, likely anonymous
  IF NOT user_is_anonymous AND NEW.email IS NULL THEN
    user_is_anonymous := true;
  END IF;

  INSERT INTO customers (
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
    -- Log the error but don't fail the user creation
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
