-- ============================================================================
-- Migration: Seed delivery menu data into POS
-- Part of: Meso Delivery → MesoPOS integration
-- Inserts Japanese food categories, products with JSONB variants/modifiers
-- Uses fixed UUIDs for cross-referencing (promo codes, rewards, etc.)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Categories (Japanese food — delivery menu)
-- --------------------------------------------------------------------------
INSERT INTO menu_categories (id, name, name_jp, slug, icon, description, sort_order, is_active, is_featured, color)
VALUES
    ('d0000001-0000-0000-0000-000000000001', 'Ramen', 'ラーメン', 'ramen', '🍜', 'Japońskie zupy ramen', 100, true, false, NULL),
    ('d0000001-0000-0000-0000-000000000002', 'Gyoza', '餃子', 'gyoza', '🥟', 'Japońskie pierożki', 101, true, false, NULL),
    ('d0000001-0000-0000-0000-000000000003', 'Rice Bowls', '丼', 'rice-bowls', '🍚', 'Miski ryżowe', 102, true, false, NULL),
    ('d0000001-0000-0000-0000-000000000004', 'Dodatki', NULL, 'dodatki-jp', '🥢', 'Przystawki i dodatki', 103, true, false, NULL),
    ('d0000001-0000-0000-0000-000000000005', 'Napoje', NULL, 'napoje-jp', '🥤', 'Napoje japońskie i inne', 104, true, false, NULL),
    ('d0000001-0000-0000-0000-000000000006', 'Bestsellery', 'ベストセラー', 'bestsellery', '🔥', 'Nasze najlepiej sprzedające się dania', -100, true, true, NULL)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------------------------
-- 2. Products — Ramen
-- --------------------------------------------------------------------------
INSERT INTO menu_products (
    id, name, name_jp, slug, description, story, category_id, type, price, original_price,
    image_url, is_available, is_featured, allergens, calories,
    prep_time_min, prep_time_max, preparation_time_minutes,
    is_vegetarian, is_vegan, is_gluten_free, is_spicy, spice_level, has_spice_level,
    is_signature, is_bestseller, is_new, has_variants, has_addons,
    tags, sort_order, sku, tax_rate, is_active,
    variants, modifier_groups
) VALUES
-- Spicy Miso
(
    'd0000002-0000-0000-0000-000000000001',
    'Spicy Miso', '辛味噌ラーメン', 'spicy-miso',
    'Intensywny, rozgrzewający bulion miso z pikantnym mięsem mielonym, świeżym chilli i aromatycznym olejem sezamowym.',
    'Nasz legendarny "Kac-Killer". Bulion, który budzi i rozgrzewa nawet w najgorszy poniedziałek. Stworzony przez szefa kuchni po podróży do Sapporo.',
    'd0000001-0000-0000-0000-000000000001', 'single', 36.90, 42.90,
    NULL, true, false, '{gluten,soy,sesame}', 650,
    8, 12, 10,
    false, false, false, true, 2, true,
    true, true, false, true, true,
    '{spicy,bestseller,pork,signature}', 1, 'RAMEN-SPICY-MISO', 8, true,
    '[{"name": "Standardowy (400ml)", "price_modifier": 0, "is_default": true}, {"name": "Duży (550ml)", "price_modifier": 8, "is_default": false}]'::jsonb,
    '[{"name": "Dodatki do ramen", "type": "multi", "required": false, "min_selections": 0, "max_selections": 10, "modifiers": [
        {"name": "Jajko marynowane", "name_jp": "味玉", "price": 5.00},
        {"name": "Extra chashu (2 plastry)", "name_jp": "チャーシュー", "price": 12.00},
        {"name": "Extra kurczak karaage (3 szt)", "name_jp": "唐揚げ", "price": 10.00},
        {"name": "Extra makaron", "name_jp": "麺", "price": 6.00},
        {"name": "Spicy mayo", "name_jp": "スパイシーマヨ", "price": 4.00},
        {"name": "Prażony czosnek", "name_jp": "ニンニク", "price": 3.00},
        {"name": "Edamame", "name_jp": "枝豆", "price": 8.00},
        {"name": "Kimchi", "name_jp": "キムチ", "price": 6.00},
        {"name": "Nori (5 arkuszy)", "name_jp": "海苔", "price": 4.00},
        {"name": "Bamboo shoots", "name_jp": "メンマ", "price": 5.00}
    ]}]'::jsonb
),
-- Tonkotsu Chashu
(
    'd0000002-0000-0000-0000-000000000002',
    'Tonkotsu Chashu', '豚骨チャーシュー', 'tonkotsu-chashu',
    'Kremowy, mleczny bulion wieprzowy gotowany 18 godzin. Podawany z rozpływającym się chashu i jajkiem ajitama.',
    'Klasyk z Fukuoki. Nasz bulion gotujemy przez 18 godzin, aż osiągnie idealną kremową konsystencję. Chashu marynujemy w sosie teriyaki przez 48 godzin.',
    'd0000001-0000-0000-0000-000000000001', 'single', 42.90, NULL,
    NULL, true, false, '{gluten,soy,egg}', 780,
    10, 15, 12,
    false, false, false, false, NULL, false,
    true, false, false, true, true,
    '{creamy,signature,pork,premium}', 2, 'RAMEN-TONKOTSU', 8, true,
    '[{"name": "Standardowy (400ml)", "price_modifier": 0, "is_default": true}, {"name": "Duży (550ml)", "price_modifier": 8, "is_default": false}]'::jsonb,
    '[{"name": "Dodatki do ramen", "type": "multi", "required": false, "min_selections": 0, "max_selections": 10, "modifiers": [
        {"name": "Jajko marynowane", "name_jp": "味玉", "price": 5.00},
        {"name": "Extra chashu (2 plastry)", "name_jp": "チャーシュー", "price": 12.00},
        {"name": "Extra kurczak karaage (3 szt)", "name_jp": "唐揚げ", "price": 10.00},
        {"name": "Extra makaron", "name_jp": "麺", "price": 6.00},
        {"name": "Spicy mayo", "name_jp": "スパイシーマヨ", "price": 4.00},
        {"name": "Prażony czosnek", "name_jp": "ニンニク", "price": 3.00},
        {"name": "Edamame", "name_jp": "枝豆", "price": 8.00},
        {"name": "Kimchi", "name_jp": "キムチ", "price": 6.00},
        {"name": "Nori (5 arkuszy)", "name_jp": "海苔", "price": 4.00},
        {"name": "Bamboo shoots", "name_jp": "メンマ", "price": 5.00}
    ]}]'::jsonb
),
-- Shoyu Chicken
(
    'd0000002-0000-0000-0000-000000000003',
    'Shoyu Chicken', '醤油チキン', 'shoyu-chicken',
    'Lekki, przejrzysty bulion na bazie sosu sojowego z delikatnym kurczakiem teriyaki i warzywami.',
    'Dla tych, którzy cenią subtelność. Inspirowany tradycyjnym Tokyo-style ramen, z nutą słodyczy z mirin.',
    'd0000001-0000-0000-0000-000000000001', 'single', 34.90, NULL,
    NULL, true, false, '{gluten,soy}', 520,
    8, 12, 10,
    false, false, false, false, NULL, false,
    false, false, false, true, true,
    '{light,chicken,classic}', 3, 'RAMEN-SHOYU', 8, true,
    '[{"name": "Standardowy (400ml)", "price_modifier": 0, "is_default": true}, {"name": "Duży (550ml)", "price_modifier": 8, "is_default": false}]'::jsonb,
    '[{"name": "Dodatki do ramen", "type": "multi", "required": false, "min_selections": 0, "max_selections": 10, "modifiers": [
        {"name": "Jajko marynowane", "name_jp": "味玉", "price": 5.00},
        {"name": "Extra chashu (2 plastry)", "name_jp": "チャーシュー", "price": 12.00},
        {"name": "Extra kurczak karaage (3 szt)", "name_jp": "唐揚げ", "price": 10.00},
        {"name": "Extra makaron", "name_jp": "麺", "price": 6.00},
        {"name": "Spicy mayo", "name_jp": "スパイシーマヨ", "price": 4.00},
        {"name": "Prażony czosnek", "name_jp": "ニンニク", "price": 3.00},
        {"name": "Edamame", "name_jp": "枝豆", "price": 8.00},
        {"name": "Kimchi", "name_jp": "キムチ", "price": 6.00},
        {"name": "Nori (5 arkuszy)", "name_jp": "海苔", "price": 4.00},
        {"name": "Bamboo shoots", "name_jp": "メンマ", "price": 5.00}
    ]}]'::jsonb
),
-- Vege Tantanmen
(
    'd0000002-0000-0000-0000-000000000004',
    'Vege Tantanmen', 'ベジ担々麺', 'vege-tantanmen',
    'Pikantny bulion sezamowy z tofu, pak choi, shiitake i chrupiącymi warzywami. W 100% wegański.',
    'Dowód, że wegańskie może być równie intensywne. Pasta sezamowa z Japonii + lokalne warzywa = umami bez kompromisów.',
    'd0000001-0000-0000-0000-000000000001', 'single', 32.90, NULL,
    NULL, true, false, '{soy,sesame,peanuts}', 480,
    8, 12, 10,
    true, true, false, true, 2, true,
    false, false, false, true, true,
    '{vegan,vegetarian,spicy,healthy}', 4, 'RAMEN-VEGE', 8, true,
    '[{"name": "Standardowy (400ml)", "price_modifier": 0, "is_default": true}, {"name": "Duży (550ml)", "price_modifier": 8, "is_default": false}]'::jsonb,
    '[{"name": "Dodatki do ramen", "type": "multi", "required": false, "min_selections": 0, "max_selections": 10, "modifiers": [
        {"name": "Jajko marynowane", "name_jp": "味玉", "price": 5.00},
        {"name": "Extra makaron", "name_jp": "麺", "price": 6.00},
        {"name": "Edamame", "name_jp": "枝豆", "price": 8.00},
        {"name": "Kimchi", "name_jp": "キムチ", "price": 6.00},
        {"name": "Nori (5 arkuszy)", "name_jp": "海苔", "price": 4.00},
        {"name": "Bamboo shoots", "name_jp": "メンマ", "price": 5.00}
    ]}]'::jsonb
),
-- Miso Classic
(
    'd0000002-0000-0000-0000-000000000005',
    'Miso Classic', '味噌ラーメン', 'miso-classic',
    'Tradycyjny bulion miso z wieprzowiną, jajkiem, kukurydzą i masłem. Comfort food w najczystszej postaci.',
    'Hokkaido style - tam gdzie miso ramen się narodził. Dodajemy masło, bo Japończycy wiedzą, że tłuszcz = smak.',
    'd0000001-0000-0000-0000-000000000001', 'single', 34.90, NULL,
    NULL, true, false, '{gluten,soy,dairy}', 620,
    8, 12, 10,
    false, false, false, false, NULL, false,
    false, false, true, true, true,
    '{classic,pork,comfort}', 5, 'RAMEN-MISO', 8, true,
    '[{"name": "Standardowy (400ml)", "price_modifier": 0, "is_default": true}, {"name": "Duży (550ml)", "price_modifier": 8, "is_default": false}]'::jsonb,
    '[{"name": "Dodatki do ramen", "type": "multi", "required": false, "min_selections": 0, "max_selections": 10, "modifiers": [
        {"name": "Jajko marynowane", "name_jp": "味玉", "price": 5.00},
        {"name": "Extra chashu (2 plastry)", "name_jp": "チャーシュー", "price": 12.00},
        {"name": "Extra kurczak karaage (3 szt)", "name_jp": "唐揚げ", "price": 10.00},
        {"name": "Extra makaron", "name_jp": "麺", "price": 6.00},
        {"name": "Spicy mayo", "name_jp": "スパイシーマヨ", "price": 4.00},
        {"name": "Prażony czosnek", "name_jp": "ニンニク", "price": 3.00},
        {"name": "Edamame", "name_jp": "枝豆", "price": 8.00},
        {"name": "Kimchi", "name_jp": "キムチ", "price": 6.00},
        {"name": "Nori (5 arkuszy)", "name_jp": "海苔", "price": 4.00},
        {"name": "Bamboo shoots", "name_jp": "メンマ", "price": 5.00}
    ]}]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3. Products — Gyoza
-- --------------------------------------------------------------------------
INSERT INTO menu_products (
    id, name, name_jp, slug, description, category_id, type, price,
    calories, prep_time_min, prep_time_max, preparation_time_minutes,
    allergens, is_bestseller, is_vegetarian, is_vegan,
    tags, sort_order, sku, tax_rate, is_active, has_variants, has_addons
) VALUES
(
    'd0000002-0000-0000-0000-000000000010',
    'Gyoza z kurczakiem', '鶏餃子', 'gyoza-chicken',
    'Klasyczne pierożki z soczystym nadzieniem z kurczaka, imbiru i dymki. Podawane z sosem ponzu.',
    'd0000001-0000-0000-0000-000000000002', 'single', 24.90,
    320, 5, 8, 6,
    '{gluten,soy}', true, false, false,
    '{chicken,bestseller,appetizer}', 1, 'GYOZA-CHICKEN', 8, true, false, false
),
(
    'd0000002-0000-0000-0000-000000000011',
    'Gyoza z krewetką', '海老餃子', 'gyoza-shrimp',
    'Premium pierożki z krewetką, wodnym kasztanem i odrobiną chilli. Delikatnie pikantne.',
    'd0000001-0000-0000-0000-000000000002', 'single', 29.90,
    280, 5, 8, 6,
    '{gluten,soy,shellfish}', false, false, false,
    '{seafood,premium,appetizer}', 2, 'GYOZA-SHRIMP', 8, true, false, false
),
(
    'd0000002-0000-0000-0000-000000000012',
    'Gyoza wegańskie', 'ベジ餃子', 'gyoza-vegan',
    'Pierożki z tofu, shiitake, kapustą pekińską i marchwią. Z wegańskim sosem dipping.',
    'd0000001-0000-0000-0000-000000000002', 'single', 22.90,
    240, 5, 8, 6,
    '{gluten,soy}', false, true, true,
    '{vegan,vegetarian,healthy,appetizer}', 3, 'GYOZA-VEGAN', 8, true, false, false
)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------------------------
-- 4. Products — Rice Bowls
-- --------------------------------------------------------------------------
INSERT INTO menu_products (
    id, name, name_jp, slug, description, category_id, type, price,
    calories, prep_time_min, prep_time_max, preparation_time_minutes,
    allergens, is_bestseller, is_new, is_spicy, spice_level, has_spice_level,
    tags, sort_order, sku, tax_rate, is_active, has_variants, has_addons,
    modifier_groups
) VALUES
(
    'd0000002-0000-0000-0000-000000000020',
    'Karaage Rice Teriyaki', '唐揚げ丼', 'karaage-rice-teriyaki',
    'Chrupiący kurczak karaage na ryżu, polany sosem teriyaki, z ogórkiem i sezamem.',
    'd0000001-0000-0000-0000-000000000003', 'single', 32.90,
    720, 8, 12, 10,
    '{gluten,soy,sesame}', true, false, false, NULL, false,
    '{chicken,rice,bestseller}', 1, 'RICE-TERIYAKI', 8, true, false, true,
    '[{"name": "Dodatki", "type": "multi", "required": false, "min_selections": 0, "max_selections": 4, "modifiers": [
        {"name": "Jajko marynowane", "name_jp": "味玉", "price": 5.00},
        {"name": "Spicy mayo", "name_jp": "スパイシーマヨ", "price": 4.00},
        {"name": "Kimchi", "name_jp": "キムチ", "price": 6.00},
        {"name": "Edamame", "name_jp": "枝豆", "price": 8.00}
    ]}]'::jsonb
),
(
    'd0000002-0000-0000-0000-000000000021',
    'Karaage Rice Spicy', '辛唐揚げ丼', 'karaage-rice-spicy',
    'Karaage w ostrym sosie gochujang, z kimchi, ogórkiem i jajkiem sadzonym.',
    'd0000001-0000-0000-0000-000000000003', 'single', 34.90,
    780, 8, 12, 10,
    '{gluten,soy,egg}', false, false, true, 2, true,
    '{chicken,rice,spicy,korean-fusion}', 2, 'RICE-SPICY', 8, true, false, true,
    '[{"name": "Dodatki", "type": "multi", "required": false, "min_selections": 0, "max_selections": 4, "modifiers": [
        {"name": "Jajko marynowane", "name_jp": "味玉", "price": 5.00},
        {"name": "Spicy mayo", "name_jp": "スパイシーマヨ", "price": 4.00},
        {"name": "Kimchi", "name_jp": "キムチ", "price": 6.00},
        {"name": "Edamame", "name_jp": "枝豆", "price": 8.00}
    ]}]'::jsonb
),
(
    'd0000002-0000-0000-0000-000000000022',
    'Karaage & Fries', '唐揚げ&フライ', 'karaage-fries',
    'Combo street food: kurczak karaage + frytki + spicy mayo + sos ponzu.',
    'd0000001-0000-0000-0000-000000000003', 'single', 28.90,
    650, 6, 10, 8,
    '{gluten,soy,egg}', false, true, false, NULL, false,
    '{chicken,fries,street-food,new}', 3, 'RICE-FRIES', 8, true, false, false,
    '[]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------------------------
-- 5. Products — Dodatki & Napoje
-- --------------------------------------------------------------------------
INSERT INTO menu_products (
    id, name, name_jp, slug, description, category_id, type, price,
    calories, prep_time_min, prep_time_max, preparation_time_minutes,
    allergens, is_vegetarian, is_vegan,
    tags, sort_order, sku, tax_rate, is_active, has_variants, has_addons
) VALUES
-- Dodatki
(
    'd0000002-0000-0000-0000-000000000030',
    'Ryż japoński', 'ご飯', 'rice-jp',
    'Porcja kleistego ryżu japońskiego premium.',
    'd0000001-0000-0000-0000-000000000004', 'single', 8.00,
    200, 2, 3, 2,
    '{}', true, true,
    '{side,rice}', 1, 'SIDE-RICE', 8, true, false, false
),
(
    'd0000002-0000-0000-0000-000000000031',
    'Edamame z solą morską', '枝豆', 'edamame-side',
    'Młode strączki soi parzone i posypane solą morską.',
    'd0000001-0000-0000-0000-000000000004', 'single', 12.00,
    150, 3, 5, 4,
    '{soy}', true, true,
    '{vegan,healthy,appetizer}', 2, 'SIDE-EDAMAME', 8, true, false, false
),
-- Napoje
(
    'd0000002-0000-0000-0000-000000000040',
    'Ramune Original', 'ラムネ', 'ramune-original',
    'Kultowy japoński napój gazowany w charakterystycznej butelce z kulką.',
    'd0000001-0000-0000-0000-000000000005', 'single', 9.90,
    80, 0, 1, 0,
    '{}', true, true,
    '{drink,japanese,classic}', 1, 'DRINK-RAMUNE', 23, true, false, false
),
(
    'd0000002-0000-0000-0000-000000000041',
    'Matcha Latte', '抹茶ラテ', 'matcha-latte',
    'Kremowa matcha z mlekiem owsianym. Na ciepło lub na zimno.',
    'd0000001-0000-0000-0000-000000000005', 'single', 14.90,
    120, 2, 4, 3,
    '{dairy}', true, false,
    '{drink,matcha,premium}', 2, 'DRINK-MATCHA', 23, true, false, false
),
(
    'd0000002-0000-0000-0000-000000000042',
    'Yuzu Honey Soda', '柚子ソーダ', 'yuzu-soda',
    'Orzeźwiająca lemoniada z cytrusem yuzu i miodem.',
    'd0000001-0000-0000-0000-000000000005', 'single', 12.90,
    90, 1, 2, 1,
    '{}', true, false,
    '{drink,refreshing,japanese}', 3, 'DRINK-YUZU', 23, true, false, false
)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------------------------
-- 6. Delivery config for existing locations that support delivery
-- --------------------------------------------------------------------------
-- Add delivery config for Food Truck Mokotów and Punkt Centrum
INSERT INTO orders_delivery_config (location_id, delivery_radius_km, delivery_fee, min_order_amount, estimated_delivery_minutes)
SELECT id, 5.0, 7.99, 35.00, 40
FROM users_locations
WHERE name = 'Food Truck Mokotów' AND NOT EXISTS (
    SELECT 1 FROM orders_delivery_config WHERE location_id = users_locations.id
);

INSERT INTO orders_delivery_config (location_id, delivery_radius_km, delivery_fee, min_order_amount, estimated_delivery_minutes)
SELECT id, 3.0, 5.99, 35.00, 30
FROM users_locations
WHERE name = 'Punkt Centrum' AND NOT EXISTS (
    SELECT 1 FROM orders_delivery_config WHERE location_id = users_locations.id
);
