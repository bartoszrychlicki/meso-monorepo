-- ============================================
-- Migration 000009: Delivery app config & promo banners
-- Tables needed by Delivery frontend that don't exist in POS
-- ============================================

-- App config (key-value store for delivery app settings)
CREATE TABLE IF NOT EXISTS app_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo banners (marketing banners for delivery app)
CREATE TABLE IF NOT EXISTS promo_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    href VARCHAR(500) DEFAULT '/',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC function to find auth user by email (used in auth upgrade flow)
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(lookup_email text)
RETURNS uuid AS $$
    SELECT id FROM auth.users
    WHERE email = lookup_email
    ORDER BY created_at DESC
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, auth;

-- RLS for app_config: public read, staff/service_role write
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_public_read" ON app_config
    FOR SELECT USING (true);

CREATE POLICY "app_config_staff_write" ON app_config
    FOR ALL USING (
        (auth.jwt() ->> 'app_role') = 'staff'
        OR current_setting('role', true) = 'service_role'
    );

-- RLS for promo_banners: public read, staff/service_role write
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_banners_public_read" ON promo_banners
    FOR SELECT USING (true);

CREATE POLICY "promo_banners_staff_write" ON promo_banners
    FOR ALL USING (
        (auth.jwt() ->> 'app_role') = 'staff'
        OR current_setting('role', true) = 'service_role'
    );

-- Updated_at trigger for app_config
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
