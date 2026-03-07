-- Fix: Add SET search_path to is_staff() SECURITY DEFINER function
-- Prevents search_path hijacking attack
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users_users
    WHERE email = (auth.jwt() ->> 'email')
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth;
