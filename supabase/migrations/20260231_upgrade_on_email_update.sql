-- Fix: anonymous-to-permanent upgrade via AFTER UPDATE trigger on auth.users
-- Problem: updateUser() creates a new auth user with email=NULL during INSERT,
-- then Supabase sets the email in a follow-up UPDATE. The AFTER INSERT trigger
-- sees email=NULL and marks the customer as anonymous. The client-side endpoint
-- fails because getUser() returns the old anonymous user's data (stale JWT).
--
-- Solution: Add an AFTER UPDATE trigger that fires when email changes from
-- NULL to non-NULL on an auth user, upgrading the customer record automatically.
-- Also add an RPC helper function for the backup API endpoint.

-- 1. AFTER UPDATE trigger: upgrade customer when auth user gets an email
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only fire when email changes from NULL/empty to a real value
  IF (OLD.email IS NULL OR OLD.email = '') AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    UPDATE public.customers SET
      email = NEW.email,
      name = COALESCE(
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      is_anonymous = false,
      marketing_consent = COALESCE(
        (NEW.raw_user_meta_data->>'marketing_consent')::boolean,
        false
      ),
      loyalty_points = loyalty_points + 50,
      lifetime_points = lifetime_points + 50,
      referral_code = COALESCE(
        referral_code,
        UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
      )
    WHERE id = NEW.id AND is_anonymous = true
    RETURNING id INTO v_customer_id;

    -- Log the registration bonus
    IF v_customer_id IS NOT NULL THEN
      INSERT INTO public.loyalty_history (customer_id, label, points, type)
      VALUES (v_customer_id, 'Bonus rejestracyjny', 50, 'bonus');
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_user_email_update trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();

-- 2. RPC function: find auth user ID by email (used by the backup endpoint)
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(lookup_email text)
RETURNS uuid AS $$
  SELECT id FROM auth.users
  WHERE email = lookup_email
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, auth;

-- 3. Retroactively fix any existing customers whose auth user has an email
-- but the customer is still marked as anonymous
UPDATE public.customers c SET
  email = u.email,
  name = COALESCE(
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  is_anonymous = false,
  loyalty_points = c.loyalty_points + 50,
  lifetime_points = c.lifetime_points + 50,
  referral_code = COALESCE(
    c.referral_code,
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
  )
FROM auth.users u
WHERE u.id = c.id
  AND c.is_anonymous = true
  AND u.email IS NOT NULL
  AND u.email != '';
