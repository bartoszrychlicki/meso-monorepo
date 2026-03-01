-- ============================================
-- Dynamic Config Migration
-- Replace hardcoded values with DB-driven data
-- ============================================

-- 1A. Loyalty Rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN ('free_delivery','discount','free_product')),
  discount_value DECIMAL(10,2),
  free_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active loyalty rewards" ON loyalty_rewards
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access to loyalty_rewards" ON loyalty_rewards
  FOR ALL USING (true) WITH CHECK (true);

-- Seed loyalty rewards (from LOYALTY_REWARDS constant)
INSERT INTO loyalty_rewards (name, description, points_cost, reward_type, discount_value, icon, sort_order) VALUES
  ('Darmowa dostawa', 'Twoje następne zamówienie bez kosztów dostawy', 100, 'free_delivery', NULL, '🚚', 1),
  ('Gyoza (6 szt)', 'Darmowa porcja gyozy do zamówienia', 150, 'free_product', NULL, '🥟', 2),
  ('10 zł rabatu', 'Rabat na następne zamówienie', 200, 'discount', 10.00, '💰', 3),
  ('Ramen do wyboru', 'Dowolny ramen z menu gratis', 300, 'free_product', NULL, '🍜', 4);

-- 1B. Loyalty History table
CREATE TABLE IF NOT EXISTS loyalty_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  points INTEGER NOT NULL, -- positive = earned, negative = spent
  type VARCHAR(20) NOT NULL CHECK (type IN ('earned','spent','bonus','expired')),
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loyalty_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty history" ON loyalty_history
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Service role full access to loyalty_history" ON loyalty_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_loyalty_history_customer_date
  ON loyalty_history(customer_id, created_at DESC);

-- 1C. Promo Banners table
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

ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active promo banners" ON promo_banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access to promo_banners" ON promo_banners
  FOR ALL USING (true) WITH CHECK (true);

-- Seed promo banners (from PROMO_BANNERS constant)
INSERT INTO promo_banners (image_url, title, subtitle, href, sort_order) VALUES
  ('/images/promos/promo-ramen.jpg', 'Nowy Spicy Miso 🔥', 'Sprawdź nasz najostrzejszy ramen w historii!', '/', 1),
  ('/images/promos/promo-delivery.jpg', 'Darmowa dostawa', 'Przy zamówieniu powyżej 60 zł – tylko dziś!', '/', 2),
  ('/images/promos/promo-gyoza.jpg', 'Gyoza Festival 🥟', 'Zestaw 12 szt. w cenie 8 – weekendowa oferta', '/', 3);

-- 1D. App Config table (key-value)
CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view app config" ON app_config
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to app_config" ON app_config
  FOR ALL USING (true) WITH CHECK (true);

-- Seed app config
INSERT INTO app_config (key, value, description) VALUES
  ('loyalty_tier_thresholds', '{"bronze": 0, "silver": 500, "gold": 1500}', 'Points thresholds for loyalty tiers'),
  ('pickup_time_min', '15', 'Minimum pickup time in minutes'),
  ('pickup_time_max', '20', 'Maximum pickup time in minutes');

-- 1E. Add type column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'restaurant';

-- 1F. Update handle_order_delivered trigger to log to loyalty_history
CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Add loyalty points (1 zł = 1 punkt)
    UPDATE customers
    SET loyalty_points = loyalty_points + NEW.loyalty_points_earned
    WHERE id = NEW.customer_id;

    -- Log to loyalty_history
    IF NEW.loyalty_points_earned > 0 THEN
      INSERT INTO loyalty_history (customer_id, label, points, type, order_id)
      VALUES (
        NEW.customer_id,
        'Zamówienie #' || NEW.id,
        NEW.loyalty_points_earned,
        'earned',
        NEW.id
      );
    END IF;

    -- Update delivered_at timestamp
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pickup buffers (minutes) — configurable by operator
INSERT INTO app_config (key, value, description)
VALUES
  ('pickup_buffer_after_open', '30', 'Minuty po otwarciu — najwcześniejszy możliwy odbiór'),
  ('pickup_buffer_before_close', '30', 'Minuty przed zamknięciem — najpóźniejszy możliwy odbiór')
ON CONFLICT (key) DO NOTHING;
