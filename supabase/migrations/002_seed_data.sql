-- ============================================
-- MESO Delivery PWA - Seed Data
-- Menu MESO: Ramen, Gyoza, Karaage
-- ============================================

-- ============================================
-- LOKALIZACJA DOMYŚLNA
-- ============================================
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

-- ============================================
-- KATEGORIE
-- ============================================
INSERT INTO categories (name, name_jp, slug, icon, description, sort_order, is_active) VALUES
('Ramen', 'ラーメン', 'ramen', '🍜', 'Autorskie rameny w głębokim, aromatycznym bulionie', 1, true),
('Gyoza', '餃子', 'gyoza', '🥟', 'Chrupiące pierożki z różnymi nadzieniami', 2, true),
('Rice Bowls', '丼', 'rice-bowls', '🍚', 'Sycące miski ryżowe z mięsem karaage', 3, true),
('Dodatki', NULL, 'dodatki', '🥢', 'Uzupełnij swoje zamówienie', 4, true),
('Napoje', NULL, 'napoje', '🥤', 'Orzeźwiające napoje i herbaty', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DODATKI (ADDONS)
-- ============================================
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

-- ============================================
-- PRODUKTY - RAMEN
-- ============================================

-- Spicy Miso (Bestseller)
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

-- Tonkotsu Chashu (Signature)
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

-- Shoyu Chicken
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
  false, true, true, false,
  ARRAY['light', 'chicken', 'classic'],
  3
) ON CONFLICT (slug) DO NOTHING;

-- Vege Tantanmen
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

-- Miso Classic
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

-- ============================================
-- PRODUKTY - GYOZA
-- ============================================

-- Gyoza z kurczakiem
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

-- Gyoza z krewetką
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

-- Gyoza wegańskie
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

-- ============================================
-- PRODUKTY - RICE BOWLS (KARAAGE)
-- ============================================

-- Karaage Rice Teriyaki
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

-- Karaage Rice Spicy
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

-- Karaage Fries
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

-- ============================================
-- PRODUKTY - DODATKI (osobne)
-- ============================================

-- Ryż
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

-- Edamame
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

-- ============================================
-- PRODUKTY - NAPOJE
-- ============================================

-- Ramune
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

-- Matcha Latte
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

-- Yuzu Soda
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

-- ============================================
-- WARIANTY PRODUKTÓW (ROZMIARY RAMEN)
-- ============================================

-- Warianty dla wszystkich ramenów
DO $$
DECLARE
  ramen_id UUID;
BEGIN
  FOR ramen_id IN SELECT id FROM products WHERE category_id = (SELECT id FROM categories WHERE slug = 'ramen')
  LOOP
    INSERT INTO product_variants (product_id, name, price_modifier, is_default, sort_order) VALUES
      (ramen_id, 'Standardowy (400ml)', 0, true, 1),
      (ramen_id, 'Duży (550ml)', 8.00, false, 2)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- POWIĄZANIA PRODUKT-DODATKI
-- ============================================

-- Wszystkie rameny mogą mieć wszystkie dodatki
DO $$
DECLARE
  ramen_id UUID;
  addon_id UUID;
BEGIN
  FOR ramen_id IN SELECT id FROM products WHERE category_id = (SELECT id FROM categories WHERE slug = 'ramen')
  LOOP
    FOR addon_id IN SELECT id FROM addons WHERE is_active = true
    LOOP
      INSERT INTO product_addons (product_id, addon_id) VALUES (ramen_id, addon_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Rice bowls mogą mieć wybrane dodatki
DO $$
DECLARE
  bowl_id UUID;
  addon_id UUID;
BEGIN
  FOR bowl_id IN SELECT id FROM products WHERE category_id = (SELECT id FROM categories WHERE slug = 'rice-bowls')
  LOOP
    FOR addon_id IN SELECT id FROM addons WHERE name IN ('Jajko marynowane', 'Spicy mayo', 'Kimchi', 'Edamame')
    LOOP
      INSERT INTO product_addons (product_id, addon_id) VALUES (bowl_id, addon_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- KODY PROMOCYJNE
-- ============================================
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_value, first_order_only, is_active) VALUES
('PIERWSZYRAMEN', 'percent', 15, 0, true, true),
('MESOCLUB', 'percent', 10, 50, false, true),
('DOSTAWAZERO', 'free_delivery', NULL, 45, false, true),
('LATO2024', 'fixed', 10, 40, false, true)
ON CONFLICT (code) DO NOTHING;

-- Kod z darmowym produktem
INSERT INTO promo_codes (code, discount_type, free_product_id, min_order_value, is_active)
SELECT 'GYOZAFREE', 'free_item', id, 60, true
FROM products WHERE slug = 'gyoza-chicken'
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- UPDATE has_addons flag
-- ============================================
UPDATE products SET has_addons = true
WHERE id IN (SELECT DISTINCT product_id FROM product_addons);

-- ============================================
-- VERIFICATION QUERIES (dla testów)
-- ============================================
-- SELECT * FROM categories ORDER BY sort_order;
-- SELECT name, price, is_bestseller, is_signature FROM products ORDER BY category_id, sort_order;
-- SELECT p.name, v.name as variant, v.price_modifier FROM products p JOIN product_variants v ON p.id = v.product_id;
-- SELECT p.name, a.name as addon FROM products p JOIN product_addons pa ON p.id = pa.product_id JOIN addons a ON pa.addon_id = a.id;
-- SELECT * FROM promo_codes;
