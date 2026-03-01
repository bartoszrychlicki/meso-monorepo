-- ============================================
-- MESO Delivery PWA - FULL DATABASE SETUP
-- Skopiuj cały ten plik i wklej w Supabase SQL Editor
-- ============================================

-- ============================================
-- CZĘŚĆ 1: SCHEMAT (TABELE, INDEKSY, RLS)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_addresses_updated_at ON customer_addresses;
CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
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
    50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    UPDATE customers
    SET loyalty_points = loyalty_points + NEW.loyalty_points_earned
    WHERE id = NEW.customer_id;
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_delivered ON orders;
CREATE TRIGGER on_order_delivered
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_delivered();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

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
DROP POLICY IF EXISTS "Public can view active locations" ON locations;
CREATE POLICY "Public can view active locations" ON locations
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active categories" ON categories;
CREATE POLICY "Public can view active categories" ON categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view product variants" ON product_variants;
CREATE POLICY "Public can view product variants" ON product_variants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active addons" ON addons;
CREATE POLICY "Public can view active addons" ON addons
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view product addons" ON product_addons;
CREATE POLICY "Public can view product addons" ON product_addons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active promo codes" ON promo_codes;
CREATE POLICY "Public can view active promo codes" ON promo_codes
  FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Customers can only access their own data
DROP POLICY IF EXISTS "Users can view own profile" ON customers;
CREATE POLICY "Users can view own profile" ON customers
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON customers;
CREATE POLICY "Users can update own profile" ON customers
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own addresses" ON customer_addresses;
CREATE POLICY "Users can view own addresses" ON customer_addresses
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON customer_addresses;
CREATE POLICY "Users can insert own addresses" ON customer_addresses
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON customer_addresses;
CREATE POLICY "Users can update own addresses" ON customer_addresses
  FOR UPDATE USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON customer_addresses;
CREATE POLICY "Users can delete own addresses" ON customer_addresses
  FOR DELETE USING (auth.uid() = customer_id);

-- Orders - customers can only see their own
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can create own orders" ON orders;
CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create order items for own orders" ON order_items;
CREATE POLICY "Users can create order items for own orders" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- ============================================
-- CZĘŚĆ 2: SEED DATA (MENU MESO)
-- ============================================

-- LOKALIZACJA DOMYŚLNA
INSERT INTO locations (name, slug, address, city, postal_code, phone, is_default, is_active)
VALUES (
  'MESO Gdańsk Długa',
  'gdansk-dluga',
  'ul. Długa 15',
  'Gdańsk',
  '80-001',
  '+48 500 123 456',
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- KATEGORIE
INSERT INTO categories (name, name_jp, slug, icon, description, sort_order, is_active) VALUES
('Ramen', 'ラーメン', 'ramen', '🍜', 'Autorskie rameny w głębokim, aromatycznym bulionie', 1, true),
('Gyoza', '餃子', 'gyoza', '🥟', 'Chrupiące pierożki z różnymi nadzieniami', 2, true),
('Rice Bowls', '丼', 'rice-bowls', '🍚', 'Sycące miski ryżowe z mięsem karaage', 3, true),
('Dodatki', NULL, 'dodatki', '🥢', 'Uzupełnij swoje zamówienie', 4, true),
('Napoje', NULL, 'napoje', '🥤', 'Orzeźwiające napoje i herbaty', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- DODATKI (ADDONS)
INSERT INTO addons (name, name_jp, price, sort_order, is_active) VALUES
('Jajko marynowane', '味玉', 5.00, 1, true),
('Extra chashu (2 plastry)', 'チャーシュー', 12.00, 2, true),
('Extra kurczak karaage (3 szt)', '唐揚げ', 10.00, 3, true),
('Extra makaron', '麺', 6.00, 4, true),
('Spicy mayo', 'スパイシーマヨ', 4.00, 5, true),
('Prażony czosnek', 'ニンニク', 3.00, 6, true),
('Edamame', '枝豆', 8.00, 7, true),
('Kimchi', 'キムチ', 6.00, 8, true),
('Nori (5 arkuszy)', '海苔', 4.00, 9, true),
('Bamboo shoots', 'メンマ', 5.00, 10, true)
ON CONFLICT DO NOTHING;

-- PRODUKTY - RAMEN
INSERT INTO products (
  category_id, name, name_jp, slug, description, story, price, original_price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_spicy, spice_level, is_bestseller, is_signature, has_variants, has_addons, has_spice_level, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'ramen'),
  'Spicy Miso', '辛味噌ラーメン', 'spicy-miso',
  'Intensywny, rozgrzewający bulion miso z pikantnym mięsem mielonym, świeżym chilli i aromatycznym olejem sezamowym.',
  'Nasz legendarny "Kac-Killer". Bulion, który budzi i rozgrzewa nawet w najgorszy poniedziałek. Stworzony przez szefa kuchni po podróży do Sapporo.',
  36.90, NULL,
  '/images/menu/spicy-miso.jpg', 8, 12, 650,
  ARRAY['gluten', 'soy', 'sesame'],
  true, 2, true, true, true, true, true,
  ARRAY['spicy', 'bestseller', 'pork', 'signature'],
  1
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, story, price, original_price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_spicy, is_bestseller, is_signature, has_variants, has_addons, has_spice_level, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'ramen'),
  'Tonkotsu Chashu', '豚骨チャーシュー', 'tonkotsu-chashu',
  'Kremowy, mleczny bulion wieprzowy gotowany 18 godzin. Podawany z rozpływającym się chashu i jajkiem ajitama.',
  'Klasyk z Fukuoki. Nasz bulion gotujemy przez 18 godzin, aż osiągnie idealną kremową konsystencję. Chashu marynujemy w sosie teriyaki przez 48 godzin.',
  42.90, NULL,
  '/images/menu/tonkotsu-chashu.jpg', 10, 15, 780,
  ARRAY['gluten', 'soy', 'egg'],
  false, false, true, true, true, false,
  ARRAY['creamy', 'signature', 'pork', 'premium'],
  2
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, story, price, original_price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_spicy, has_variants, has_addons, has_spice_level, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'ramen'),
  'Shoyu Chicken', '醤油チキン', 'shoyu-chicken',
  'Lekki, przejrzysty bulion na bazie sosu sojowego z delikatnym kurczakiem teriyaki i warzywami.',
  'Dla tych, którzy cenią subtelność. Inspirowany tradycyjnym Tokyo-style ramen, z nutą słodyczy z mirin.',
  34.90, NULL,
  '/images/menu/shoyu-chicken.jpg', 8, 12, 520,
  ARRAY['gluten', 'soy'],
  false, false, false, true, true, false,
  ARRAY['light', 'chicken', 'classic'],
  3
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, story, price, original_price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_vegetarian, is_vegan, is_spicy, spice_level, has_variants, has_addons, has_spice_level, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'ramen'),
  'Vege Tantanmen', 'ベジ担々麺', 'vege-tantanmen',
  'Pikantny bulion sezamowy z tofu, pak choi, shiitake i chrupiącymi warzywami. W 100% wegański.',
  'Dowód, że wegańskie może być równie intensywne. Pasta sezamowa z Japonii + lokalne warzywa = umami bez kompromisów.',
  32.90, NULL,
  '/images/menu/vege-tantanmen.jpg', 8, 12, 480,
  ARRAY['soy', 'sesame', 'peanuts'],
  true, true, true, 2, true, true, true,
  ARRAY['vegan', 'vegetarian', 'spicy', 'healthy'],
  4
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, story, price, original_price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_spicy, is_new, has_variants, has_addons, has_spice_level, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'ramen'),
  'Miso Classic', '味噌ラーメン', 'miso-classic',
  'Tradycyjny bulion miso z wieprzowiną, jajkiem, kukurydzą i masłem. Comfort food w najczystszej postaci.',
  'Hokkaido style - tam gdzie miso ramen się narodził. Dodajemy masło, bo Japończycy wiedzą, że tłuszcz = smak.',
  34.90, NULL,
  '/images/menu/miso-classic.jpg', 8, 12, 620,
  ARRAY['gluten', 'soy', 'dairy'],
  false, true, true, true, false,
  ARRAY['classic', 'pork', 'comfort'],
  5
) ON CONFLICT (slug) DO NOTHING;

-- PRODUKTY - GYOZA
INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_bestseller, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'gyoza'),
  'Gyoza z kurczakiem (6 szt)', '鶏餃子', 'gyoza-chicken',
  'Klasyczne pierożki z soczystym nadzieniem z kurczaka, imbiru i dymki. Podawane z sosem ponzu.',
  24.90,
  '/images/menu/gyoza-chicken.jpg', 5, 8, 320,
  ARRAY['gluten', 'soy'],
  true,
  ARRAY['chicken', 'bestseller', 'appetizer'],
  1
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'gyoza'),
  'Gyoza z krewetką (6 szt)', '海老餃子', 'gyoza-shrimp',
  'Premium pierożki z krewetką, wodnym kasztanem i odrobiną chilli. Delikatnie pikantne.',
  29.90,
  '/images/menu/gyoza-shrimp.jpg', 5, 8, 280,
  ARRAY['gluten', 'soy', 'shellfish'],
  ARRAY['seafood', 'premium', 'appetizer'],
  2
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_vegetarian, is_vegan, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'gyoza'),
  'Gyoza wegańskie (6 szt)', 'ベジ餃子', 'gyoza-vegan',
  'Pierożki z tofu, shiitake, kapustą pekińską i marchwią. Z wegańskim sosem dipping.',
  22.90,
  '/images/menu/gyoza-vegan.jpg', 5, 8, 240,
  ARRAY['gluten', 'soy'],
  true, true,
  ARRAY['vegan', 'vegetarian', 'healthy', 'appetizer'],
  3
) ON CONFLICT (slug) DO NOTHING;

-- PRODUKTY - RICE BOWLS (KARAAGE)
INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_bestseller, has_spice_level, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'rice-bowls'),
  'Karaage Rice Teriyaki', '唐揚げ丼', 'karaage-rice-teriyaki',
  'Chrupiący kurczak karaage na ryżu, polany sosem teriyaki, z ogórkiem i sezamem.',
  32.90,
  '/images/menu/karaage-rice-teriyaki.jpg', 8, 12, 720,
  ARRAY['gluten', 'soy', 'sesame'],
  true, false,
  ARRAY['chicken', 'rice', 'bestseller'],
  1
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_spicy, spice_level, has_spice_level, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'rice-bowls'),
  'Karaage Rice Spicy', '辛唐揚げ丼', 'karaage-rice-spicy',
  'Karaage w ostrym sosie gochujang, z kimchi, ogórkiem i jajkiem sadzonym.',
  34.90,
  '/images/menu/karaage-rice-spicy.jpg', 8, 12, 780,
  ARRAY['gluten', 'soy', 'egg'],
  true, 2, true,
  ARRAY['chicken', 'rice', 'spicy', 'korean-fusion'],
  2
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_new, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'rice-bowls'),
  'Karaage & Fries', '唐揚げ&フライ', 'karaage-fries',
  'Combo street food: kurczak karaage + frytki + spicy mayo + sos ponzu.',
  28.90,
  '/images/menu/karaage-fries.jpg', 6, 10, 650,
  ARRAY['gluten', 'soy', 'egg'],
  true,
  ARRAY['chicken', 'fries', 'street-food', 'new'],
  3
) ON CONFLICT (slug) DO NOTHING;

-- PRODUKTY - DODATKI (osobne)
INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'dodatki'),
  'Ryż japoński', 'ご飯', 'rice',
  'Porcja kleistego ryżu japońskiego premium.',
  8.00,
  '/images/menu/rice.jpg', 2, 3, 200,
  ARRAY['side', 'rice'],
  1
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_vegetarian, is_vegan, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'dodatki'),
  'Edamame z solą morską', '枝豆', 'edamame',
  'Młode strączki soi parzone i posypane solą morską.',
  12.00,
  '/images/menu/edamame.jpg', 3, 5, 150,
  ARRAY['soy'],
  true, true,
  ARRAY['vegan', 'healthy', 'appetizer'],
  2
) ON CONFLICT (slug) DO NOTHING;

-- PRODUKTY - NAPOJE
INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'napoje'),
  'Ramune Original', 'ラムネ', 'ramune-original',
  'Kultowy japoński napój gazowany w charakterystycznej butelce z kulką.',
  9.90,
  '/images/menu/ramune.jpg', 0, 1, 80,
  ARRAY['drink', 'japanese', 'classic'],
  1
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories, allergens,
  is_vegetarian, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'napoje'),
  'Matcha Latte', '抹茶ラテ', 'matcha-latte',
  'Kremowa matcha z mlekiem owsianym. Na ciepło lub na zimno.',
  14.90,
  '/images/menu/matcha-latte.jpg', 2, 4, 120,
  ARRAY['dairy'],
  true,
  ARRAY['drink', 'matcha', 'premium'],
  2
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, name, name_jp, slug, description, price,
  image_url, prep_time_min, prep_time_max, calories,
  is_vegetarian, is_vegan, tags, sort_order
) VALUES (
  (SELECT id FROM categories WHERE slug = 'napoje'),
  'Yuzu Honey Soda', '柚子ソーダ', 'yuzu-soda',
  'Orzeźwiająca lemoniada z cytrusem yuzu i miodem.',
  12.90,
  '/images/menu/yuzu-soda.jpg', 1, 2, 90,
  true, false,
  ARRAY['drink', 'refreshing', 'japanese'],
  3
) ON CONFLICT (slug) DO NOTHING;

-- WARIANTY PRODUKTÓW (ROZMIARY RAMEN)
INSERT INTO product_variants (product_id, name, price_modifier, is_default, sort_order)
SELECT id, 'Standardowy (400ml)', 0, true, 1
FROM products WHERE category_id = (SELECT id FROM categories WHERE slug = 'ramen')
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, name, price_modifier, is_default, sort_order)
SELECT id, 'Duży (550ml)', 8.00, false, 2
FROM products WHERE category_id = (SELECT id FROM categories WHERE slug = 'ramen')
ON CONFLICT DO NOTHING;

-- POWIĄZANIA PRODUKT-DODATKI (Wszystkie rameny)
INSERT INTO product_addons (product_id, addon_id)
SELECT p.id, a.id
FROM products p
CROSS JOIN addons a
WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'ramen')
  AND a.is_active = true
ON CONFLICT DO NOTHING;

-- POWIĄZANIA PRODUKT-DODATKI (Rice bowls - wybrane dodatki)
INSERT INTO product_addons (product_id, addon_id)
SELECT p.id, a.id
FROM products p
CROSS JOIN addons a
WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'rice-bowls')
  AND a.name IN ('Jajko marynowane', 'Spicy mayo', 'Kimchi', 'Edamame')
ON CONFLICT DO NOTHING;

-- KODY PROMOCYJNE
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_value, first_order_only, is_active) VALUES
('PIERWSZYRAMEN', 'percent', 15, 0, true, true),
('MESOCLUB', 'percent', 10, 50, false, true),
('DOSTAWAZERO', 'free_delivery', NULL, 45, false, true),
('LATO2024', 'fixed', 10, 40, false, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, discount_type, free_product_id, min_order_value, is_active)
SELECT 'GYOZAFREE', 'free_item', id, 60, true
FROM products WHERE slug = 'gyoza-chicken'
ON CONFLICT (code) DO NOTHING;

-- UPDATE has_addons flag
UPDATE products SET has_addons = true
WHERE id IN (SELECT DISTINCT product_id FROM product_addons);

-- ============================================
-- GOTOWE! Zweryfikuj dane:
-- ============================================
-- SELECT COUNT(*) as categories FROM categories;
-- SELECT COUNT(*) as products FROM products;
-- SELECT COUNT(*) as addons FROM addons;
-- SELECT COUNT(*) as promo_codes FROM promo_codes;
-- SELECT name, price, is_bestseller FROM products ORDER BY category_id, sort_order;
