-- Migration: Fix Anonymous Sign-ins Trigger
-- Description: Update handle_new_user() to use NEW.is_anonymous column instead of raw_user_meta_data

-- Nowa funkcja obsługująca zarówno anonymous jak i permanent users
-- Supabase Auth stores is_anonymous as a direct column on auth.users, not in raw_user_meta_data
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_is_anonymous BOOLEAN;
BEGIN
  -- Use NEW.is_anonymous directly (Supabase Auth v2+)
  -- Fallback to raw_user_meta_data for backwards compatibility
  user_is_anonymous := COALESCE(
    NEW.is_anonymous,
    (NEW.raw_user_meta_data->>'is_anonymous')::boolean,
    false
  );

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
  ON CONFLICT (id) DO NOTHING; -- Ignore if customer already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
