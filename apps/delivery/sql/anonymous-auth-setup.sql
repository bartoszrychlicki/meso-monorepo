-- ============================================
-- MESO Delivery - Anonymous Sign-ins Setup
-- ============================================
-- Uruchom te komendy w Supabase Dashboard → SQL Editor
-- WAŻNE: Wykonaj krok po kroku, sprawdzając rezultaty

-- ============================================
-- 1. MODYFIKACJA TABELI CUSTOMERS
-- ============================================

-- 1.1 Email może być NULL dla anonymous users
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

-- 1.2 Dodanie kolumny is_anonymous
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- 1.3 Usunięcie starego UNIQUE constraint z email
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;

-- 1.4 Nowy constraint: email UNIQUE tylko dla non-null wartości
DROP INDEX IF EXISTS customers_email_unique;
CREATE UNIQUE INDEX customers_email_unique ON customers(email) WHERE email IS NOT NULL;

-- ============================================
-- 2. NOWY TRIGGER handle_new_user()
-- ============================================

-- Najpierw usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Nowa funkcja obsługująca zarówno anonymous jak i permanent users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_is_anonymous BOOLEAN;
BEGIN
  -- Sprawdź czy user jest anonimowy (z raw_user_meta_data)
  user_is_anonymous := COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false);

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
    -- Anonymous users nie mają email
    CASE WHEN user_is_anonymous THEN NULL ELSE NEW.email END,
    user_is_anonymous,
    -- Anonimowi nie dostają kodu polecającego (dostają przy konwersji)
    CASE WHEN user_is_anonymous THEN NULL
         ELSE UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
    END,
    -- Anonimowi nie dostają bonusu powitalnego (dostają przy konwersji)
    CASE WHEN user_is_anonymous THEN 0 ELSE 50 END,
    'bronze',
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Utwórz nowy trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 3. FUNKCJA KONWERSJI ANONYMOUS → PERMANENT
-- ============================================

CREATE OR REPLACE FUNCTION convert_anonymous_to_permanent(
  p_user_id UUID,
  p_email TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET
    email = p_email,
    is_anonymous = false,
    -- Generuj kod polecający przy konwersji
    referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    -- Bonus 50 pkt za założenie konta
    loyalty_points = loyalty_points + 50
  WHERE id = p_user_id AND is_anonymous = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. RLS POLICIES DLA CUSTOMERS
-- ============================================

-- Włącz RLS jeśli nie jest włączony
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Usuń stare policies
DROP POLICY IF EXISTS "Users can view own profile" ON customers;
DROP POLICY IF EXISTS "Users can update own profile" ON customers;
DROP POLICY IF EXISTS "Users can insert own profile" ON customers;

-- Nowe policies
CREATE POLICY "Users can view own profile"
ON customers FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON customers FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Insert jest obsługiwany przez trigger, ale na wszelki wypadek
CREATE POLICY "Users can insert own profile"
ON customers FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================
-- 5. RLS POLICIES DLA ORDERS (Anonymous mogą składać zamówienia)
-- ============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;

CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Users can create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- ============================================
-- 6. RLS POLICIES DLA CUSTOMER_ADDRESSES
-- ============================================

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own addresses" ON customer_addresses;

CREATE POLICY "Users can manage own addresses"
ON customer_addresses FOR ALL
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- ============================================
-- 7. AUTOMATYCZNE CZYSZCZENIE ANONYMOUS USERS (opcjonalne)
-- ============================================
-- Wymaga pg_cron extension - uruchom ręcznie lub przez scheduled function

-- Przykładowa funkcja do czyszczenia starych anonymous bez zamówień:
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM auth.users
    WHERE is_anonymous = true
      AND created_at < NOW() - INTERVAL '30 days'
      AND id NOT IN (SELECT DISTINCT customer_id FROM orders)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- WERYFIKACJA
-- ============================================

-- Sprawdź czy trigger działa:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Sprawdź strukturę customers:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'customers';

-- ============================================
-- KONFIGURACJA W SUPABASE DASHBOARD
-- ============================================
-- 1. Authentication → Providers → Włącz "Allow anonymous sign-ins"
-- 2. Authentication → URL Configuration:
--    - Site URL: http://localhost:3000
--    - Redirect URLs: http://localhost:3000/callback
-- 3. (Opcjonalnie) Authentication → Settings → Włącz CAPTCHA
