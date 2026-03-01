-- Migration: Anonymous Sign-ins Support
-- Description: Modify customers table and triggers to support anonymous users

-- ============================================
-- 1. MODYFIKACJA TABELI CUSTOMERS
-- ============================================

-- Email może być NULL dla anonymous users
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

-- Dodanie kolumny is_anonymous
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Usunięcie starego UNIQUE constraint z email
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;

-- Nowy constraint: email UNIQUE tylko dla non-null wartości
DROP INDEX IF EXISTS customers_email_unique;
CREATE UNIQUE INDEX customers_email_unique ON customers(email) WHERE email IS NOT NULL;

-- ============================================
-- 2. NOWY TRIGGER handle_new_user()
-- ============================================

-- Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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
    CASE WHEN user_is_anonymous THEN NULL ELSE NEW.email END,
    user_is_anonymous,
    CASE WHEN user_is_anonymous THEN NULL
         ELSE UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
    END,
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
    referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    loyalty_points = loyalty_points + 50
  WHERE id = p_user_id AND is_anonymous = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Customers policies
DROP POLICY IF EXISTS "Users can view own profile" ON customers;
DROP POLICY IF EXISTS "Users can update own profile" ON customers;
DROP POLICY IF EXISTS "Users can insert own profile" ON customers;

CREATE POLICY "Users can view own profile"
ON customers FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON customers FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON customers FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Orders policies
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

-- Customer addresses policies
DROP POLICY IF EXISTS "Users can manage own addresses" ON customer_addresses;

CREATE POLICY "Users can manage own addresses"
ON customer_addresses FOR ALL
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());
