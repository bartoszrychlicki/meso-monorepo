-- ============================================================================
-- Migration: POS Auth — Staff trigger + cleanup
--
-- 1. Drop PIN column from users_users (no longer needed)
-- 2. Create trigger function handle_new_pos_staff() that auto-creates
--    users_users record when a new auth.users row has app_role='staff'
-- 3. Attach trigger to auth.users INSERT
-- ============================================================================

-- 1. Drop PIN column
ALTER TABLE public.users_users DROP COLUMN IF EXISTS pin;

-- 2. Create trigger function for POS staff
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

-- 3. Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created_staff
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_pos_staff();
