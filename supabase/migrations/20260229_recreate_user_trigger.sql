-- Fix: The trigger binding on auth.users was lost.
-- The function handle_new_user() exists but the trigger was not attached.
-- This re-creates the trigger to ensure customer records are created on auth sign-up.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
