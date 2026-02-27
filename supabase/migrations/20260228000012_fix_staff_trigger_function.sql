-- ============================================================================
-- Fix: Re-apply handle_new_pos_staff() function and recreate trigger
-- The original migration (000011) failed because the trigger already existed
-- from a previous direct deployment, so the function update was rolled back.
-- ============================================================================

-- Drop the old trigger so we can recreate cleanly
DROP TRIGGER IF EXISTS on_auth_user_created_staff ON auth.users;

-- Re-create the function with the correct implementation
CREATE OR REPLACE FUNCTION handle_new_pos_staff()
RETURNS TRIGGER AS $$
BEGIN
    -- Only handle staff users, not delivery customers
    IF (NEW.raw_user_meta_data ->> 'app_role') IS DISTINCT FROM 'staff' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.users_users (id, email, name, username, role, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
        split_part(COALESCE(NEW.email, ''), '@', 1),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'cashier'),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = now();

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_pos_staff failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
CREATE TRIGGER on_auth_user_created_staff
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_pos_staff();
