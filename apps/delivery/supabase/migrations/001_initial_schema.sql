-- ============================================
-- MESO Delivery PWA - Initial Database Schema
-- Faza 1: Baza Danych Supabase
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- 1. LOCATIONS (Franczyzy/Lokalizacje)
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  coordinates GEOGRAPHY(POINT, 4326),
  open_time TIME DEFAULT '11:00',
  close_time TIME DEFAULT '22:00',
  delivery_radius_km DECIMAL(5,2) DEFAULT 5.0,
  delivery_fee DECIMAL(10,2) DEFAULT 7.99,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 45,
  min_order_value DECIMAL(10,2) DEFAULT 35.00,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CATEGORIES (Kategorie menu)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_jp VARCHAR(100),
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(10),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PRODUCTS (Produkty)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  name_jp VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  story TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  image_url TEXT,
  prep_time_min INTEGER DEFAULT 10,
  prep_time_max INTEGER DEFAULT 20,
  calories INTEGER,
  allergens TEXT[],
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_gluten_free BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  spice_level INTEGER CHECK (spice_level BETWEEN 1 AND 3),
  is_signature BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  has_variants BOOLEAN DEFAULT false,
  has_addons BOOLEAN DEFAULT false,
  has_spice_level BOOLEAN DEFAULT false,
  tags TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PRODUCT_VARIANTS (Warianty/rozmiary)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ADDONS (Dodatki)
-- ============================================
CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_jp VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. PRODUCT_ADDONS (Many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS product_addons (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES addons(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, addon_id)
);

-- ============================================
-- 7. CUSTOMERS (Klienci)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  birthday DATE,
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES customers(id),
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. CUSTOMER_ADDRESSES (Adresy klientów)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Dom',
  street VARCHAR(255) NOT NULL,
  building_number VARCHAR(20) NOT NULL,
  apartment_number VARCHAR(20),
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  notes TEXT,
  coordinates GEOGRAPHY(POINT, 4326),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ORDERS (Zamówienia)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status VARCHAR(30) DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'confirmed', 'preparing', 'ready',
    'in_delivery', 'delivered', 'cancelled', 'refunded'
  )),
  delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
  delivery_address JSONB,
  scheduled_time TIMESTAMPTZ,
  estimated_prep_time INTEGER,
  estimated_delivery_time INTEGER,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('blik', 'card', 'cash', 'apple_pay', 'google_pay')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  promo_code VARCHAR(50),
  promo_discount DECIMAL(10,2) DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  loyalty_points_earned INTEGER DEFAULT 0,
  loyalty_points_used INTEGER DEFAULT 0,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. ORDER_ITEMS (Pozycje zamówienia)
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  spice_level INTEGER CHECK (spice_level BETWEEN 1 AND 3),
  variant_id UUID REFERENCES product_variants(id),
  variant_name VARCHAR(100),
  addons JSONB DEFAULT '[]',
  notes TEXT,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. PROMO_CODES (Kody promocyjne)
-- ============================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'free_item', 'free_delivery')),
  discount_value DECIMAL(10,2),
  free_product_id UUID REFERENCES products(id),
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  first_order_only BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_location ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);

-- ============================================
-- TRIGGERS - Updated At
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER - Auto-create customer on auth signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email, referral_code, loyalty_points)
  VALUES (
    NEW.id,
    NEW.email,
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    50  -- Bonus powitalny: 50 punktów
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TRIGGER - Add loyalty points after order delivery
-- ============================================
CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Add loyalty points (1 zł = 1 punkt)
    UPDATE customers
    SET loyalty_points = loyalty_points + NEW.loyalty_points_earned
    WHERE id = NEW.customer_id;

    -- Update delivered_at timestamp
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_delivered
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_delivered();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Public read access for menu data
CREATE POLICY "Public can view active locations" ON locations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view product variants" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Public can view active addons" ON addons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view product addons" ON product_addons
  FOR SELECT USING (true);

CREATE POLICY "Public can view active promo codes" ON promo_codes
  FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Customers can only access their own data
CREATE POLICY "Users can view own profile" ON customers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON customers
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own addresses" ON customer_addresses
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can insert own addresses" ON customer_addresses
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own addresses" ON customer_addresses
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete own addresses" ON customer_addresses
  FOR DELETE USING (auth.uid() = customer_id);

-- Orders - customers can only see their own
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for own orders" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Service role bypass for backend operations
-- (Supabase service role automatically bypasses RLS)
