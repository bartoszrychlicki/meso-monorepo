-- =============================================
-- LOYALTY COUPONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS loyalty_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  coupon_type VARCHAR(20) NOT NULL CHECK (coupon_type IN ('free_delivery', 'discount', 'free_product')),
  discount_value DECIMAL(10,2),
  free_product_name VARCHAR(255),
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  points_spent INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(20) NOT NULL DEFAULT 'reward' CHECK (source IN ('reward', 'referral_welcome')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_coupons_customer ON loyalty_coupons(customer_id, status);
CREATE INDEX idx_loyalty_coupons_code ON loyalty_coupons(code);
CREATE INDEX idx_loyalty_coupons_expires ON loyalty_coupons(expires_at) WHERE status = 'active';

-- RLS
ALTER TABLE loyalty_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupons"
  ON loyalty_coupons FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Service role full access to coupons"
  ON loyalty_coupons FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- ADD lifetime_points TO customers
-- =============================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_points INTEGER NOT NULL DEFAULT 0;

-- Backfill lifetime_points from current loyalty_points
UPDATE customers SET lifetime_points = loyalty_points WHERE lifetime_points = 0 AND loyalty_points > 0;

-- =============================================
-- ADD min_tier TO loyalty_rewards
-- =============================================

ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS min_tier VARCHAR(20) NOT NULL DEFAULT 'bronze'
  CHECK (min_tier IN ('bronze', 'silver', 'gold'));

-- =============================================
-- UPDATE handle_order_delivered TRIGGER
-- Adds: lifetime_points, first order bonus, referral bonus, tier upgrade
-- =============================================

CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_customer RECORD;
  v_earned INTEGER;
  v_is_first_order BOOLEAN;
  v_referrer_id UUID;
  v_order_count INTEGER;
  v_thresholds JSONB;
  v_new_tier VARCHAR(20);
  v_current_lifetime INTEGER;
BEGIN
  -- Only fire when status changes to 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN

    -- Set delivered_at timestamp
    NEW.delivered_at := now();

    -- Get customer data
    SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;
    v_earned := COALESCE(NEW.loyalty_points_earned, 0);

    -- Check if first delivered order
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE customer_id = NEW.customer_id
      AND status = 'delivered'
      AND id != NEW.id;
    v_is_first_order := (v_order_count = 0);

    -- Add earned points to loyalty_points and lifetime_points
    UPDATE customers
    SET loyalty_points = loyalty_points + v_earned,
        lifetime_points = lifetime_points + v_earned
    WHERE id = NEW.customer_id;

    -- Log earned points
    INSERT INTO loyalty_history (customer_id, label, points, type, order_id)
    VALUES (NEW.customer_id, 'Zamowienie #' || NEW.id, v_earned, 'earned', NEW.id);

    -- First order bonus: +50
    IF v_is_first_order THEN
      UPDATE customers
      SET loyalty_points = loyalty_points + 50,
          lifetime_points = lifetime_points + 50
      WHERE id = NEW.customer_id;

      INSERT INTO loyalty_history (customer_id, label, points, type, order_id)
      VALUES (NEW.customer_id, 'Bonus za pierwsze zamowienie', 50, 'bonus', NEW.id);
    END IF;

    -- Referral bonus: +100 for referrer on referred user's first order
    IF v_is_first_order AND v_customer.referred_by IS NOT NULL THEN
      v_referrer_id := v_customer.referred_by;

      UPDATE customers
      SET loyalty_points = loyalty_points + 100,
          lifetime_points = lifetime_points + 100
      WHERE id = v_referrer_id;

      INSERT INTO loyalty_history (customer_id, label, points, type)
      VALUES (v_referrer_id, 'Polecenie: ' || COALESCE(v_customer.name, v_customer.email), 100, 'bonus');
    END IF;

    -- Tier upgrade check
    SELECT value INTO v_thresholds FROM app_config WHERE key = 'loyalty_tier_thresholds';
    IF v_thresholds IS NOT NULL THEN
      SELECT lifetime_points INTO v_current_lifetime FROM customers WHERE id = NEW.customer_id;

      IF v_current_lifetime >= COALESCE((v_thresholds->>'gold')::int, 1500) THEN
        v_new_tier := 'gold';
      ELSIF v_current_lifetime >= COALESCE((v_thresholds->>'silver')::int, 500) THEN
        v_new_tier := 'silver';
      ELSE
        v_new_tier := 'bronze';
      END IF;

      -- Only upgrade, never downgrade
      UPDATE customers
      SET loyalty_tier = v_new_tier
      WHERE id = NEW.customer_id
        AND (
          (loyalty_tier = 'bronze' AND v_new_tier IN ('silver', 'gold'))
          OR (loyalty_tier = 'silver' AND v_new_tier = 'gold')
        );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATE handle_new_user TRIGGER
-- Adds: log registration bonus to loyalty_history, set lifetime_points
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  INSERT INTO customers (id, email, name, loyalty_points, lifetime_points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    50,
    50
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_customer_id;

  -- Log registration bonus
  IF v_customer_id IS NOT NULL THEN
    INSERT INTO loyalty_history (customer_id, label, points, type)
    VALUES (v_customer_id, 'Bonus rejestracyjny', 50, 'bonus');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
