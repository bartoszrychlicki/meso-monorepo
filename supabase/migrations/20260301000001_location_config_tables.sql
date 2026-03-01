-- ============================================================================
-- Migration: location_receipt_config + location_kds_config tables
-- Per-location receipt and KDS settings with NULL = use global default
-- ============================================================================

-- 1. location_receipt_config
CREATE TABLE IF NOT EXISTS location_receipt_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES users_locations(id) ON DELETE CASCADE,
    receipt_header TEXT,
    receipt_footer TEXT,
    print_automatically BOOLEAN,
    show_logo BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(location_id)
);

CREATE INDEX IF NOT EXISTS idx_location_receipt_config_location
    ON location_receipt_config(location_id);

CREATE TRIGGER set_updated_at_location_receipt_config
    BEFORE UPDATE ON location_receipt_config
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

ALTER TABLE location_receipt_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_receipt_config" ON location_receipt_config
    FOR SELECT USING (true);

CREATE POLICY "staff_manage_receipt_config" ON location_receipt_config
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    );

-- 2. location_kds_config
CREATE TABLE IF NOT EXISTS location_kds_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES users_locations(id) ON DELETE CASCADE,
    alert_time_minutes INTEGER,
    auto_accept_orders BOOLEAN,
    sound_enabled BOOLEAN,
    display_priority BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(location_id)
);

CREATE INDEX IF NOT EXISTS idx_location_kds_config_location
    ON location_kds_config(location_id);

CREATE TRIGGER set_updated_at_location_kds_config
    BEFORE UPDATE ON location_kds_config
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

ALTER TABLE location_kds_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_kds_config" ON location_kds_config
    FOR SELECT USING (true);

CREATE POLICY "staff_manage_kds_config" ON location_kds_config
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    );

-- 3. Seed global defaults into app_config
INSERT INTO app_config (key, value, description) VALUES
    ('receipt_defaults', '{"header": "MESO Restaurant\\nul. Przykładowa 123\\n00-001 Warszawa", "footer": "Dziękujemy za zamówienie!\\nZapraszamy ponownie", "print_automatically": true, "show_logo": true}', 'Global default receipt settings (fallback for locations without override)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_config (key, value, description) VALUES
    ('kds_defaults', '{"alert_time_minutes": 10, "auto_accept_orders": false, "sound_enabled": true, "display_priority": true}', 'Global default KDS settings (fallback for locations without override)')
ON CONFLICT (key) DO NOTHING;
