-- Migration: Seed data - converted from TypeScript seed files
-- Insert order respects FK constraints

-- ============================================================================
-- 1. LOCATIONS (no FK dependencies)
-- ============================================================================
INSERT INTO public.users_locations (id, name, type, address, phone, is_active, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Kuchnia Centralna', 'central_kitchen', '{"street":"ul. Produkcyjna 12","city":"Warszawa","postal_code":"02-100","country":"Polska","lat":52.2128,"lng":20.9842}', '+48 22 123 45 67', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('11111111-1111-1111-1111-111111111002', 'Food Truck Mokotów', 'food_truck', '{"street":"ul. Puławska 100","city":"Warszawa","postal_code":"02-620","country":"Polska","lat":52.1935,"lng":21.0186}', '+48 22 234 56 78', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('11111111-1111-1111-1111-111111111003', 'Punkt Centrum', 'kiosk', '{"street":"ul. Marszałkowska 50","city":"Warszawa","postal_code":"00-950","country":"Polska","lat":52.2297,"lng":21.0122}', '+48 22 345 67 89', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

-- ============================================================================
-- 2. USERS (FK: location_id -> users_locations)
-- ============================================================================
INSERT INTO public.users_users (id, username, name, email, role, pin, location_id, is_active, created_at, updated_at) VALUES
  ('22222222-2222-2222-2222-222222222001', 'admin', 'Jan Kowalski', 'jan.kowalski@mesopos.pl', 'admin', '1234', '11111111-1111-1111-1111-111111111001', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('22222222-2222-2222-2222-222222222002', 'manager', 'Anna Nowak', 'anna.nowak@mesopos.pl', 'manager', '2345', '11111111-1111-1111-1111-111111111001', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('22222222-2222-2222-2222-222222222003', 'chef', 'Piotr Wiśniewski', 'piotr.wisniewski@mesopos.pl', 'chef', '3456', '11111111-1111-1111-1111-111111111001', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('22222222-2222-2222-2222-222222222004', 'cashier', 'Maria Zielińska', 'maria.zielinska@mesopos.pl', 'cashier', '4567', '11111111-1111-1111-1111-111111111002', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('22222222-2222-2222-2222-222222222005', 'delivery', 'Tomasz Lewandowski', 'tomasz.lewandowski@mesopos.pl', 'delivery', '5678', '11111111-1111-1111-1111-111111111003', true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

-- ============================================================================
-- 3. INVENTORY STOCK ITEMS (no FK dependencies)
-- ============================================================================
INSERT INTO public.inventory_stock_items (id, name, sku, product_category, unit, quantity, min_quantity, cost_per_unit, allergens, is_active, created_at, updated_at) VALUES
  ('88888888-8888-8888-8888-888888880001', 'Wolowina mielona', 'RAW-BEEF-001', 'raw_material', 'g', 42000, 20000, 0.032, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880002', 'Bulki burgerowe', 'RAW-BUN-001', 'raw_material', 'szt', 180, 50, 1.2, ARRAY['gluten','eggs'], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880003', 'Ser cheddar', 'RAW-CHEESE-001', 'raw_material', 'g', 7500, 3000, 0.028, ARRAY['milk'], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880004', 'Salata lodowa', 'RAW-VEG-001', 'raw_material', 'szt', 28, 10, 3.5, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880005', 'Ziemniaki', 'RAW-VEG-002', 'raw_material', 'g', 70000, 30000, 0.003, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880006', 'Bekon wedzony', 'RAW-MEAT-002', 'raw_material', 'g', 4500, 2000, 0.045, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880007', 'Pomidory', 'RAW-VEG-003', 'raw_material', 'g', 14000, 5000, 0.008, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880008', 'Sos BBQ (wlasny)', 'SEMI-SAUCE-001', 'semi_finished', 'ml', 18000, 10000, 0.012, ARRAY['sulphites'], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880009', 'Cebula karmelizowana', 'SEMI-VEG-001', 'semi_finished', 'g', 5500, 2000, 0.015, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880010', 'Olej rzepakowy', 'RAW-OIL-001', 'raw_material', 'ml', 28000, 15000, 0.008, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880011', 'Cola (puszka 330ml)', 'RAW-DRINK-001', 'raw_material', 'szt', 250, 100, 1.8, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880012', 'Woda mineralna (butelka 500ml)', 'RAW-DRINK-002', 'raw_material', 'szt', 120, 50, 1.2, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880013', 'Kubki papierowe 500ml', 'RAW-PKG-001', 'raw_material', 'szt', 450, 200, 0.35, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880014', 'Torby papierowe', 'RAW-PKG-002', 'raw_material', 'szt', 350, 150, 0.8, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880015', 'Kurczak (filet)', 'RAW-MEAT-003', 'raw_material', 'g', 18000, 10000, 0.018, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880016', 'Maslo extra', 'RAW-DAIRY-001', 'raw_material', 'g', 1800, 1000, 0.028, ARRAY['milk'], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880017', 'Mleko 3.2%', 'RAW-DAIRY-002', 'raw_material', 'ml', 22000, 10000, 0.003, ARRAY['milk'], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880018', 'Cytryny', 'RAW-FRUIT-001', 'raw_material', 'szt', 90, 30, 0.8, ARRAY[]::TEXT[], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880019', 'Czekolada deserowa', 'RAW-DESSERT-001', 'raw_material', 'g', 4500, 2000, 0.035, ARRAY['milk','soybeans'], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
  ('88888888-8888-8888-8888-888888880020', 'Lody waniliowe', 'RAW-DESSERT-002', 'raw_material', 'ml', 13000, 5000, 0.018, ARRAY['milk','eggs'], true, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

-- ============================================================================
-- 4. MENU CATEGORIES (no FK dependencies)
-- ============================================================================
INSERT INTO public.menu_categories (id, name, slug, description, sort_order, is_active, color, icon, created_at, updated_at) VALUES
  ('33333333-3333-3333-3333-333333333001', 'Burgery', 'burgery', 'Nasze pyszne burgery z najlepszych skladnikow', 1, true, 'from-orange-500 to-red-600', 'Beef', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),
  ('33333333-3333-3333-3333-333333333002', 'Frytki i dodatki', 'frytki-i-dodatki', 'Chrupiace frytki i pyszne dodatki', 2, true, 'from-yellow-400 to-orange-500', 'French Fries', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),
  ('33333333-3333-3333-3333-333333333003', 'Salatki', 'salatki', 'Swieze salatki na kazda okazje', 3, true, 'from-green-400 to-emerald-600', 'Salad', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),
  ('33333333-3333-3333-3333-333333333004', 'Napoje', 'napoje', 'Napoje zimne i gorace', 4, true, 'from-blue-400 to-cyan-600', 'GlassWater', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),
  ('33333333-3333-3333-3333-333333333005', 'Desery', 'desery', 'Slodkie zakonczenie posilku', 5, true, 'from-pink-400 to-rose-600', 'Cake', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),
  ('33333333-3333-3333-3333-333333333006', 'Zestawy', 'zestawy', 'Zestawy w atrakcyjnych cenach', 6, true, 'from-violet-400 to-purple-600', 'Package', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z');

-- ============================================================================
-- 5. MENU MODIFIER GROUPS (no FK dependencies)
-- ============================================================================
INSERT INTO public.menu_modifier_groups (id, name, type, required, min_selections, max_selections, modifiers, created_at, updated_at) VALUES
  ('55555555-5555-5555-5555-555555555001', 'Dodatki do burgera', 'multiple', false, 0, 4, '[{"id":"55555555-5555-5555-5555-555555550101","name":"Dodatkowy ser","price":3,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550102","name":"Bekon","price":5,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550103","name":"Jalapeno","price":3,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550104","name":"Extra sos","price":2,"is_available":true,"sort_order":4,"modifier_action":"add"}]', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),
  ('55555555-5555-5555-5555-555555555002', 'Sosy', 'single', false, 0, 1, '[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),
  ('55555555-5555-5555-5555-555555555003', 'Rozmiar napoju', 'single', false, 0, 1, '[{"id":"55555555-5555-5555-5555-555555550301","name":"Maly (0.3l)","price":-2,"is_available":true,"sort_order":1,"modifier_action":"substitute"},{"id":"55555555-5555-5555-5555-555555550302","name":"Duzy (0.7l)","price":3,"is_available":true,"sort_order":2,"modifier_action":"substitute"}]', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z');

-- ============================================================================
-- 6. RECIPES (no strict FK, product_id is soft reference)
-- ============================================================================
INSERT INTO public.recipes_recipes (id, product_id, name, description, product_category, ingredients, yield_quantity, yield_unit, preparation_time_minutes, instructions, allergens, total_cost, cost_per_unit, food_cost_percentage, version, is_active, created_by, last_updated_by, created_at, updated_at) VALUES
  -- Beef Patty (semi-finished)
  ('77777777-7777-7777-7777-777777770001', NULL, 'Patty wołowy', 'Grillowany patty z wołowiny 150g', 'semi_finished',
   '[{"id":"ing-bp-1","stock_item_id":"88888888-8888-8888-8888-888888880001","quantity":150,"unit":"g","notes":"Świeża wołowina mielona"}]',
   1, 'szt', 5, E'1. Uformuj patty 150g\n2. Grilluj 3 min z każdej strony\n3. Dopraw solą i pieprzem',
   ARRAY[]::TEXT[], 4.80, 4.80, NULL, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Cheeseburger
  ('77777777-7777-7777-7777-777777770002', '44444444-4444-4444-4444-444444444001', 'Cheeseburger Classic', 'Klasyczny cheeseburger z wołowiną', 'finished_good',
   '[{"id":"ing-cb-1","stock_item_id":"88888888-8888-8888-8888-888888880002","quantity":1,"unit":"szt","notes":"Bułka sezamowa"},{"id":"ing-cb-2","stock_item_id":"88888888-8888-8888-8888-888888880001","quantity":150,"unit":"g","notes":"Patty wołowy"},{"id":"ing-cb-3","stock_item_id":"88888888-8888-8888-8888-888888880003","quantity":40,"unit":"g","notes":"Cheddar topiony"},{"id":"ing-cb-4","stock_item_id":"88888888-8888-8888-8888-888888880004","quantity":30,"unit":"g","notes":"Świeża sałata"},{"id":"ing-cb-5","stock_item_id":"88888888-8888-8888-8888-888888880007","quantity":50,"unit":"g","notes":"Pomidory plastry"},{"id":"ing-cb-6","stock_item_id":"88888888-8888-8888-8888-888888880009","quantity":30,"unit":"g","notes":"Cebula karmelizowana"}]',
   1, 'szt', 12, E'1. Podgrzej bułkę\n2. Usmaż patty\n3. Dodaj ser w ostatniej minucie\n4. Złóż: bułka dolna → sałata → pomidor → patty+ser → cebula → bułka górna',
   ARRAY['gluten','milk','eggs'], 7.57, 7.57, 30.3, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Fries
  ('77777777-7777-7777-7777-777777770003', '44444444-4444-4444-4444-444444444006', 'Frytki klasyczne', 'Złociste, chrupiące frytki z solą morską', 'finished_good',
   '[{"id":"ing-fr-1","stock_item_id":"88888888-8888-8888-8888-888888880005","quantity":250,"unit":"g","notes":"Ziemniaki obrane i pokrojone"},{"id":"ing-fr-2","stock_item_id":"88888888-8888-8888-8888-888888880010","quantity":50,"unit":"ml","notes":"Olej do frytownicy"}]',
   1, 'porcja', 5, E'1. Pokrój ziemniaki\n2. Smaż w 180°C przez 5-6 min\n3. Odsącz i posyp solą',
   ARRAY[]::TEXT[], 1.15, 1.15, 8.9, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Bacon Burger
  ('77777777-7777-7777-7777-777777770004', '44444444-4444-4444-4444-444444444002', 'Bacon Burger', 'Soczysty burger z chrupiącym bekonem i sosem BBQ', 'finished_good',
   '[{"id":"ing-bb-1","stock_item_id":"88888888-8888-8888-8888-888888880002","quantity":1,"unit":"szt","notes":"Bułka burgerowa"},{"id":"ing-bb-2","stock_item_id":"88888888-8888-8888-8888-888888880001","quantity":150,"unit":"g","notes":"Patty wołowy 150g"},{"id":"ing-bb-3","stock_item_id":"88888888-8888-8888-8888-888888880006","quantity":50,"unit":"g","notes":"Bekon chrupiący"},{"id":"ing-bb-4","stock_item_id":"88888888-8888-8888-8888-888888880003","quantity":40,"unit":"g","notes":"Ser cheddar"},{"id":"ing-bb-5","stock_item_id":"88888888-8888-8888-8888-888888880008","quantity":30,"unit":"ml","notes":"Sos BBQ"},{"id":"ing-bb-6","stock_item_id":"88888888-8888-8888-8888-888888880009","quantity":30,"unit":"g","notes":"Cebula karmelizowana"}]',
   1, 'szt', 14, E'1. Usmaż bekon do chrupkości\n2. Grilluj patty\n3. Dodaj ser na patty\n4. Złóż: bułka → sos BBQ → patty+ser → bekon → cebula → bułka',
   ARRAY['gluten','milk','eggs','sulphites'], 9.63, 9.63, 32.1, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Truffle Burger
  ('77777777-7777-7777-7777-777777770005', '44444444-4444-4444-4444-444444444004', 'Truffle Burger', 'Wyjątkowy burger z truflowym majonezem i serem brie', 'finished_good',
   '[{"id":"ing-tb-1","stock_item_id":"88888888-8888-8888-8888-888888880002","quantity":1,"unit":"szt","notes":"Bułka brioche"},{"id":"ing-tb-2","stock_item_id":"88888888-8888-8888-8888-888888880001","quantity":180,"unit":"g","notes":"Patty wołowy premium 180g"},{"id":"ing-tb-3","stock_item_id":"88888888-8888-8888-8888-888888880016","quantity":20,"unit":"g","notes":"Masło truflowe"},{"id":"ing-tb-4","stock_item_id":"88888888-8888-8888-8888-888888880009","quantity":50,"unit":"g","notes":"Cebula karmelizowana w masle"}]',
   1, 'szt', 15, E'1. Karmelizuj cebulę w masle\n2. Grilluj patty 180g\n3. Smaruj bułkę masłem truflowym\n4. Złóż burger',
   ARRAY['gluten','milk','eggs'], 8.27, 8.27, 20.7, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Double Smash Burger
  ('77777777-7777-7777-7777-777777770006', '44444444-4444-4444-4444-444444444005', 'Double Smash Burger', 'Podwójny smash burger z chrupiącymi krawędziami', 'finished_good',
   '[{"id":"ing-ds-1","stock_item_id":"88888888-8888-8888-8888-888888880002","quantity":1,"unit":"szt","notes":"Bułka burgerowa"},{"id":"ing-ds-2","stock_item_id":"88888888-8888-8888-8888-888888880001","quantity":300,"unit":"g","notes":"2× patty smash 150g"},{"id":"ing-ds-3","stock_item_id":"88888888-8888-8888-8888-888888880003","quantity":60,"unit":"g","notes":"2× plaster cheddar"},{"id":"ing-ds-4","stock_item_id":"88888888-8888-8888-8888-888888880009","quantity":30,"unit":"g","notes":"Cebula karmelizowana"}]',
   1, 'szt', 14, E'1. Podziel mięso na 2 kulki po 150g\n2. Smash na gorącej płycie\n3. Dodaj ser na każdy patty\n4. Złóż: bułka → patty1+ser → patty2+ser → pikle → cebula → bułka',
   ARRAY['gluten','milk','eggs'], 12.33, 12.33, 35.2, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Caesar Salad
  ('77777777-7777-7777-7777-777777770007', '44444444-4444-4444-4444-444444444009', 'Sałatka Cezar', 'Klasyczna sałatka Cezar z kurczakiem i parmezanem', 'finished_good',
   '[{"id":"ing-cs-1","stock_item_id":"88888888-8888-8888-8888-888888880004","quantity":150,"unit":"g","notes":"Sałata rzymska"},{"id":"ing-cs-2","stock_item_id":"88888888-8888-8888-8888-888888880015","quantity":100,"unit":"g","notes":"Grillowany filet z kurczaka"},{"id":"ing-cs-3","stock_item_id":"88888888-8888-8888-8888-888888880003","quantity":20,"unit":"g","notes":"Parmezan (zamiennik cheddar)"}]',
   1, 'porcja', 8, E'1. Grilluj kurczaka\n2. Porwij sałatę\n3. Dodaj grzanki i ser\n4. Polej dressingiem cezar',
   ARRAY['gluten','milk','eggs','fish'], 2.92, 2.92, 10.8, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Chicken Salad
  ('77777777-7777-7777-7777-777777770008', '44444444-4444-4444-4444-444444444010', 'Sałatka z kurczakiem', 'Sałatka z grillowanym kurczakiem i dressingiem miodowo-musztardowym', 'finished_good',
   '[{"id":"ing-chs-1","stock_item_id":"88888888-8888-8888-8888-888888880015","quantity":150,"unit":"g","notes":"Grillowany filet z kurczaka"},{"id":"ing-chs-2","stock_item_id":"88888888-8888-8888-8888-888888880004","quantity":100,"unit":"g","notes":"Mix sałat"},{"id":"ing-chs-3","stock_item_id":"88888888-8888-8888-8888-888888880007","quantity":50,"unit":"g","notes":"Pomidorki koktajlowe"}]',
   1, 'porcja', 10, E'1. Grilluj kurczaka\n2. Pokrój warzywa\n3. Ułóż na talerzu\n4. Polej dressingiem',
   ARRAY[]::TEXT[], 3.10, 3.10, 10.7, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Cola
  ('77777777-7777-7777-7777-777777770009', '44444444-4444-4444-4444-444444444011', 'Cola 0.5l', 'Klasyczna cola w puszce', 'finished_good',
   '[{"id":"ing-cola-1","stock_item_id":"88888888-8888-8888-8888-888888880011","quantity":1,"unit":"szt","notes":"Puszka cola 330ml"}]',
   1, 'szt', 0, '1. Podaj schłodzoną',
   ARRAY[]::TEXT[], 1.80, 1.80, 25.8, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Lemonade
  ('77777777-7777-7777-7777-777777770010', '44444444-4444-4444-4444-444444444012', 'Lemoniada domowa', 'Świeża lemoniada z cytryną i miętą', 'finished_good',
   '[{"id":"ing-lem-1","stock_item_id":"88888888-8888-8888-8888-888888880018","quantity":2,"unit":"szt","notes":"Cytryny świeże"},{"id":"ing-lem-2","stock_item_id":"88888888-8888-8888-8888-888888880012","quantity":1,"unit":"szt","notes":"Woda mineralna"}]',
   1, 'szt', 2, E'1. Wyciśnij cytryny\n2. Zmieszaj z wodą i cukrem\n3. Dodaj miętę i lód',
   ARRAY[]::TEXT[], 2.80, 2.80, 28.0, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Water
  ('77777777-7777-7777-7777-777777770011', '44444444-4444-4444-4444-444444444013', 'Woda mineralna 0.5l', 'Naturalna woda mineralna', 'finished_good',
   '[{"id":"ing-wat-1","stock_item_id":"88888888-8888-8888-8888-888888880012","quantity":1,"unit":"szt","notes":"Butelka wody 500ml"}]',
   1, 'szt', 0, '1. Podaj schłodzoną',
   ARRAY[]::TEXT[], 1.20, 1.20, 24.0, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Latte
  ('77777777-7777-7777-7777-777777770012', '44444444-4444-4444-4444-444444444014', 'Kawa latte', 'Aromatyczna kawa latte z mleczną pianką', 'finished_good',
   '[{"id":"ing-lat-1","stock_item_id":"88888888-8888-8888-8888-888888880017","quantity":250,"unit":"ml","notes":"Mleko spienione"}]',
   1, 'szt', 3, E'1. Zaparz espresso\n2. Spień mleko\n3. Polej espresso mlekiem',
   ARRAY['milk'], 0.75, 0.75, 5.8, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Brownie
  ('77777777-7777-7777-7777-777777770013', '44444444-4444-4444-4444-444444444015', 'Brownie czekoladowe', 'Ciepłe, wilgotne brownie z belgijskiej czekolady', 'finished_good',
   '[{"id":"ing-brw-1","stock_item_id":"88888888-8888-8888-8888-888888880019","quantity":80,"unit":"g","notes":"Czekolada deserowa belgijska"},{"id":"ing-brw-2","stock_item_id":"88888888-8888-8888-8888-888888880016","quantity":50,"unit":"g","notes":"Masło"}]',
   1, 'szt', 2, E'1. Podgrzej brownie\n2. Podaj z lodami waniliowymi',
   ARRAY['gluten','milk','eggs','soybeans'], 4.20, 4.20, 28.0, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),

  -- Ice Cream
  ('77777777-7777-7777-7777-777777770014', '44444444-4444-4444-4444-444444444016', 'Lody 2 gałki', 'Dwie gałki rzemieślniczych lodów', 'finished_good',
   '[{"id":"ing-ice-1","stock_item_id":"88888888-8888-8888-8888-888888880020","quantity":150,"unit":"ml","notes":"Lody waniliowe/czekoladowe/truskawkowe"}]',
   1, 'porcja', 2, E'1. Nałóż 2 gałki lodów\n2. Podaj w pucharku',
   ARRAY['milk','eggs'], 2.70, 2.70, 20.8, 1, true, 'system', NULL, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');

-- ============================================================================
-- 7. MENU PRODUCTS (FK: category_id -> menu_categories)
-- ============================================================================

-- Burger extras + sauces modifier groups JSON (reused across products)
-- burgerExtrasGroup + saucesGroup combined
-- saucesGroup only

INSERT INTO public.menu_products (id, name, slug, description, category_id, type, price, images, is_available, is_featured, allergens, nutritional_info, variants, modifier_groups, ingredients, recipe_id, preparation_time_minutes, sort_order, color, sku, tax_rate, is_active, point_ids, pricing, created_at, updated_at) VALUES
  -- Cheeseburger (with_variants)
  ('44444444-4444-4444-4444-444444444001', 'Cheeseburger', 'cheeseburger',
   'Klasyczny cheeseburger z podwojnym serem cheddar, swiezymi warzywami i naszym autorskim sosem.',
   '33333333-3333-3333-3333-333333333001', 'with_variants', 24.99, '[]', true, true,
   ARRAY['gluten','milk','eggs'],
   '{"calories":550,"protein":28,"carbs":42,"fat":30,"fiber":3}',
   '[{"id":"44444444-4444-4444-4444-444444440101","name":"Maly","price":-5,"is_available":true,"sort_order":1,"variant_type":"size"},{"id":"44444444-4444-4444-4444-444444440102","name":"Sredni","price":0,"is_available":true,"sort_order":2,"variant_type":"size"},{"id":"44444444-4444-4444-4444-444444440103","name":"Duzy","price":5,"is_available":true,"sort_order":3,"variant_type":"size"}]',
   '[{"id":"55555555-5555-5555-5555-555555555001","name":"Dodatki do burgera","type":"multiple","required":false,"min_selections":0,"max_selections":4,"modifiers":[{"id":"55555555-5555-5555-5555-555555550101","name":"Dodatkowy ser","price":3,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550102","name":"Bekon","price":5,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550103","name":"Jalapeno","price":3,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550104","name":"Extra sos","price":2,"is_available":true,"sort_order":4,"modifier_action":"add"}]},{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880001","stock_item_name":"Wolowina mielona","quantity":150,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880002","stock_item_name":"Bulki burgerowe","quantity":1,"unit":"szt"},{"stock_item_id":"88888888-8888-8888-8888-888888880003","stock_item_name":"Ser cheddar","quantity":40,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880004","stock_item_name":"Salata","quantity":30,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880007","stock_item_name":"Pomidory","quantity":50,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880009","stock_item_name":"Cebula","quantity":30,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770002', 12, 1, 'from-orange-500 to-red-600', 'BUR-001', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":24.99},{"channel":"pickup","price":22.99},{"channel":"eat_in","price":24.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Bacon Burger (single)
  ('44444444-4444-4444-4444-444444444002', 'Bacon Burger', 'bacon-burger',
   'Soczysty burger z chrupiącym bekonem, serem i sosem BBQ.',
   '33333333-3333-3333-3333-333333333001', 'single', 29.99, '[]', true, false,
   ARRAY['gluten','milk','eggs'],
   '{"calories":680,"protein":35,"carbs":44,"fat":38,"fiber":2}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555001","name":"Dodatki do burgera","type":"multiple","required":false,"min_selections":0,"max_selections":4,"modifiers":[{"id":"55555555-5555-5555-5555-555555550101","name":"Dodatkowy ser","price":3,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550102","name":"Bekon","price":5,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550103","name":"Jalapeno","price":3,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550104","name":"Extra sos","price":2,"is_available":true,"sort_order":4,"modifier_action":"add"}]},{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880001","stock_item_name":"Wolowina mielona","quantity":150,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880002","stock_item_name":"Bulki burgerowe","quantity":1,"unit":"szt"},{"stock_item_id":"88888888-8888-8888-8888-888888880006","stock_item_name":"Bekon","quantity":50,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880003","stock_item_name":"Ser cheddar","quantity":40,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880008","stock_item_name":"Sos BBQ","quantity":30,"unit":"ml"},{"stock_item_id":"88888888-8888-8888-8888-888888880009","stock_item_name":"Cebula","quantity":30,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770004', 14, 2, 'from-orange-500 to-red-600', 'BUR-002', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":29.99},{"channel":"pickup","price":27.99},{"channel":"eat_in","price":29.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Veggie Burger (single, no recipe_id)
  ('44444444-4444-4444-4444-444444444003', 'Veggie Burger', 'veggie-burger',
   'Burger wegański z kotletem z ciecierzycy, awokado i sosem tahini.',
   '33333333-3333-3333-3333-333333333001', 'single', 22.99, '[]', true, false,
   ARRAY['gluten','soybeans'],
   '{"calories":420,"protein":18,"carbs":48,"fat":18,"fiber":8}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[]',
   NULL, 10, 3, 'from-green-500 to-emerald-600', 'BUR-003', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":22.99},{"channel":"pickup","price":20.99},{"channel":"eat_in","price":22.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Truffle Burger
  ('44444444-4444-4444-4444-444444444004', 'Truffle Burger', 'truffle-burger',
   'Wyjątkowy burger z truflowym majonezem, serem brie i karmelizowaną cebulą.',
   '33333333-3333-3333-3333-333333333001', 'single', 39.99, '[]', true, true,
   ARRAY['gluten','milk','eggs'],
   '{"calories":720,"protein":32,"carbs":46,"fat":42,"fiber":3}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555001","name":"Dodatki do burgera","type":"multiple","required":false,"min_selections":0,"max_selections":4,"modifiers":[{"id":"55555555-5555-5555-5555-555555550101","name":"Dodatkowy ser","price":3,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550102","name":"Bekon","price":5,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550103","name":"Jalapeno","price":3,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550104","name":"Extra sos","price":2,"is_available":true,"sort_order":4,"modifier_action":"add"}]},{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880001","stock_item_name":"Wolowina mielona","quantity":180,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880002","stock_item_name":"Bulki burgerowe","quantity":1,"unit":"szt"},{"stock_item_id":"88888888-8888-8888-8888-888888880016","stock_item_name":"Maslo","quantity":20,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880009","stock_item_name":"Cebula","quantity":50,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770005', 15, 4, 'from-amber-600 to-yellow-800', 'BUR-004', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":39.99},{"channel":"pickup","price":37.99},{"channel":"eat_in","price":39.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Double Smash Burger
  ('44444444-4444-4444-4444-444444444005', 'Double Smash Burger', 'double-smash-burger',
   'Podwójny smash burger z chrupiącymi krawędziami, serem i piklami.',
   '33333333-3333-3333-3333-333333333001', 'single', 34.99, '[]', true, true,
   ARRAY['gluten','milk','eggs'],
   '{"calories":780,"protein":42,"carbs":40,"fat":45,"fiber":2}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555001","name":"Dodatki do burgera","type":"multiple","required":false,"min_selections":0,"max_selections":4,"modifiers":[{"id":"55555555-5555-5555-5555-555555550101","name":"Dodatkowy ser","price":3,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550102","name":"Bekon","price":5,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550103","name":"Jalapeno","price":3,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550104","name":"Extra sos","price":2,"is_available":true,"sort_order":4,"modifier_action":"add"}]},{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880001","stock_item_name":"Wolowina mielona","quantity":300,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880002","stock_item_name":"Bulki burgerowe","quantity":1,"unit":"szt"},{"stock_item_id":"88888888-8888-8888-8888-888888880003","stock_item_name":"Ser cheddar","quantity":60,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880009","stock_item_name":"Cebula","quantity":30,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770006', 14, 5, 'from-orange-500 to-red-600', 'BUR-005', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":34.99},{"channel":"pickup","price":32.99},{"channel":"eat_in","price":34.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Classic Fries
  ('44444444-4444-4444-4444-444444444006', 'Frytki klasyczne', 'frytki-klasyczne',
   'Złociste, chrupiące frytki z solą morską.',
   '33333333-3333-3333-3333-333333333002', 'single', 12.99, '[]', true, false,
   ARRAY[]::TEXT[],
   '{"calories":340,"protein":4,"carbs":44,"fat":16,"fiber":4}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880005","stock_item_name":"Ziemniaki","quantity":250,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880010","stock_item_name":"Olej do frytownicy","quantity":50,"unit":"ml"}]',
   '77777777-7777-7777-7777-777777770003', 5, 1, 'from-yellow-400 to-orange-500', 'FRY-001', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":12.99},{"channel":"pickup","price":10.99},{"channel":"eat_in","price":12.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Sweet Potato Fries
  ('44444444-4444-4444-4444-444444444007', 'Frytki z batatów', 'frytki-z-batatow',
   'Słodkie frytki z batatów z aromatycznymi przyprawami.',
   '33333333-3333-3333-3333-333333333002', 'single', 14.99, '[]', true, false,
   ARRAY[]::TEXT[],
   '{"calories":310,"protein":3,"carbs":52,"fat":12,"fiber":6}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[]',
   NULL, 6, 2, 'from-yellow-400 to-orange-500', 'FRY-002', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":14.99},{"channel":"pickup","price":12.99},{"channel":"eat_in","price":14.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Loaded Fries
  ('44444444-4444-4444-4444-444444444008', 'Loaded frytki', 'loaded-frytki',
   'Frytki z roztopisonym serem, chrupiącym bekonem i szczypiorkiem.',
   '33333333-3333-3333-3333-333333333002', 'single', 18.99, '[]', true, true,
   ARRAY['gluten','milk'],
   '{"calories":520,"protein":18,"carbs":48,"fat":28,"fiber":4}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[]',
   NULL, 7, 3, 'from-yellow-400 to-orange-500', 'FRY-003', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":18.99},{"channel":"pickup","price":16.99},{"channel":"eat_in","price":18.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Caesar Salad
  ('44444444-4444-4444-4444-444444444009', 'Sałatka Cezar', 'salatka-cezar',
   'Klasyczna sałatka Cezar z chrupiącymi grzankami, parmezanem i dressingiem.',
   '33333333-3333-3333-3333-333333333003', 'single', 26.99, '[]', true, false,
   ARRAY['gluten','milk','eggs','fish'],
   '{"calories":380,"protein":22,"carbs":18,"fat":24,"fiber":4}',
   '[]', '[]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880004","stock_item_name":"Salata","quantity":150,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880015","stock_item_name":"Kurczak","quantity":100,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880003","stock_item_name":"Ser cheddar","quantity":20,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770007', 8, 1, 'from-green-400 to-emerald-600', 'SAL-001', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":26.99},{"channel":"pickup","price":24.99},{"channel":"eat_in","price":26.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Chicken Salad
  ('44444444-4444-4444-4444-444444444010', 'Sałatka z kurczakiem', 'salatka-z-kurczakiem',
   'Sałatka z grillowanym kurczakiem, awokado, pomidorami i dressingiem miodowo-musztardowym.',
   '33333333-3333-3333-3333-333333333003', 'single', 28.99, '[]', true, false,
   ARRAY[]::TEXT[],
   '{"calories":420,"protein":32,"carbs":16,"fat":26,"fiber":5}',
   '[]', '[]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880015","stock_item_name":"Kurczak","quantity":150,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880004","stock_item_name":"Salata","quantity":100,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880007","stock_item_name":"Pomidory","quantity":50,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770008', 10, 2, 'from-green-400 to-emerald-600', 'SAL-002', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":28.99},{"channel":"pickup","price":26.99},{"channel":"eat_in","price":28.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Cola
  ('44444444-4444-4444-4444-444444444011', 'Cola 0.5l', 'cola',
   'Klasyczna cola w butelce 0.5l.',
   '33333333-3333-3333-3333-333333333004', 'single', 6.99, '[]', true, false,
   ARRAY[]::TEXT[],
   '{"calories":210,"protein":0,"carbs":54,"fat":0,"fiber":0}',
   '[]', '[]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880011","stock_item_name":"Cola 0.5l","quantity":1,"unit":"szt"}]',
   '77777777-7777-7777-7777-777777770009', 0, 1, 'from-blue-400 to-cyan-600', 'DRI-001', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":6.99},{"channel":"pickup","price":5.99},{"channel":"eat_in","price":6.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Lemonade
  ('44444444-4444-4444-4444-444444444012', 'Lemoniada domowa', 'lemoniada-domowa',
   'Świeża lemoniada z cytryną, miętą i miodem.',
   '33333333-3333-3333-3333-333333333004', 'single', 9.99, '[]', true, true,
   ARRAY[]::TEXT[],
   '{"calories":120,"protein":0,"carbs":30,"fat":0,"fiber":0}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555003","name":"Rozmiar napoju","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550301","name":"Maly (0.3l)","price":-2,"is_available":true,"sort_order":1,"modifier_action":"substitute"},{"id":"55555555-5555-5555-5555-555555550302","name":"Duzy (0.7l)","price":3,"is_available":true,"sort_order":2,"modifier_action":"substitute"}]}]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880018","stock_item_name":"Cytryny","quantity":100,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770010', 2, 2, 'from-yellow-300 to-lime-500', 'DRI-002', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":9.99},{"channel":"pickup","price":8.99},{"channel":"eat_in","price":9.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Water
  ('44444444-4444-4444-4444-444444444013', 'Woda mineralna 0.5l', 'woda-mineralna',
   'Naturalna woda mineralna w butelce 0.5l.',
   '33333333-3333-3333-3333-333333333004', 'single', 4.99, '[]', true, false,
   ARRAY[]::TEXT[],
   '{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}',
   '[]', '[]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880012","stock_item_name":"Woda 0.5l","quantity":1,"unit":"szt"}]',
   '77777777-7777-7777-7777-777777770011', 0, 3, 'from-blue-400 to-cyan-600', 'DRI-003', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":4.99},{"channel":"pickup","price":4.49},{"channel":"eat_in","price":4.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Latte
  ('44444444-4444-4444-4444-444444444014', 'Kawa latte', 'kawa-latte',
   'Aromatyczna kawa latte z mleczną pianką.',
   '33333333-3333-3333-3333-333333333004', 'single', 12.99, '[]', true, false,
   ARRAY['milk'],
   '{"calories":190,"protein":8,"carbs":18,"fat":8,"fiber":0}',
   '[]', '[]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880017","stock_item_name":"Mleko","quantity":250,"unit":"ml"}]',
   '77777777-7777-7777-7777-777777770012', 3, 4, 'from-amber-700 to-yellow-900', 'DRI-004', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":12.99},{"channel":"pickup","price":11.99},{"channel":"eat_in","price":12.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Brownie
  ('44444444-4444-4444-4444-444444444015', 'Brownie czekoladowe', 'brownie-czekoladowe',
   'Ciepłe, wilgotne brownie z belgijskiej czekolady podawane z lodami waniliowymi.',
   '33333333-3333-3333-3333-333333333005', 'single', 14.99, '[]', true, false,
   ARRAY['gluten','milk','eggs'],
   '{"calories":480,"protein":6,"carbs":58,"fat":26,"fiber":3}',
   '[]', '[]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880019","stock_item_name":"Czekolada","quantity":80,"unit":"g"},{"stock_item_id":"88888888-8888-8888-8888-888888880016","stock_item_name":"Maslo","quantity":50,"unit":"g"}]',
   '77777777-7777-7777-7777-777777770013', 2, 1, 'from-pink-400 to-rose-600', 'DES-001', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":14.99},{"channel":"pickup","price":13.49},{"channel":"eat_in","price":14.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Ice Cream
  ('44444444-4444-4444-4444-444444444016', 'Lody 2 gałki', 'lody-2-galki',
   'Dwie gałki rzemieślniczych lodów do wyboru: wanilia, czekolada, truskawka, pistacja.',
   '33333333-3333-3333-3333-333333333005', 'single', 12.99, '[]', true, false,
   ARRAY['milk'],
   '{"calories":320,"protein":6,"carbs":36,"fat":18,"fiber":0}',
   '[]', '[]',
   '[{"stock_item_id":"88888888-8888-8888-8888-888888880020","stock_item_name":"Lody waniliowe","quantity":150,"unit":"ml"}]',
   '77777777-7777-7777-7777-777777770014', 2, 2, 'from-pink-400 to-rose-600', 'DES-002', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":12.99},{"channel":"pickup","price":11.99},{"channel":"eat_in","price":12.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Burger Combo
  ('44444444-4444-4444-4444-444444444017', 'Zestaw Burger', 'zestaw-burger',
   'Burger do wyboru + frytki klasyczne + napój 0.5l. Oszczędzasz 10%!',
   '33333333-3333-3333-3333-333333333006', 'combo', 34.99, '[]', true, true,
   ARRAY['gluten','milk','eggs'],
   '{"calories":980,"protein":38,"carbs":96,"fat":48,"fiber":7}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555001","name":"Dodatki do burgera","type":"multiple","required":false,"min_selections":0,"max_selections":4,"modifiers":[{"id":"55555555-5555-5555-5555-555555550101","name":"Dodatkowy ser","price":3,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550102","name":"Bekon","price":5,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550103","name":"Jalapeno","price":3,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550104","name":"Extra sos","price":2,"is_available":true,"sort_order":4,"modifier_action":"add"}]},{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[]',
   NULL, 15, 1, 'from-violet-400 to-purple-600', 'COM-001', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":34.99},{"channel":"pickup","price":31.99},{"channel":"eat_in","price":34.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'),

  -- Premium Combo
  ('44444444-4444-4444-4444-444444444018', 'Zestaw Premium', 'zestaw-premium',
   'Truffle Burger + frytki z batatów + lemoniada domowa + brownie. Doświadczenie premium!',
   '33333333-3333-3333-3333-333333333006', 'combo', 44.99, '[]', true, true,
   ARRAY['gluten','milk','eggs'],
   '{"calories":1520,"protein":44,"carbs":158,"fat":76,"fiber":12}',
   '[]',
   '[{"id":"55555555-5555-5555-5555-555555555002","name":"Sosy","type":"single","required":false,"min_selections":0,"max_selections":1,"modifiers":[{"id":"55555555-5555-5555-5555-555555550201","name":"BBQ","price":0,"is_available":true,"sort_order":1,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550202","name":"Czosnkowy","price":0,"is_available":true,"sort_order":2,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550203","name":"Ostry","price":0,"is_available":true,"sort_order":3,"modifier_action":"add"},{"id":"55555555-5555-5555-5555-555555550204","name":"Majonez","price":0,"is_available":true,"sort_order":4,"modifier_action":"add"}]}]',
   '[]',
   NULL, 18, 2, 'from-violet-400 to-purple-600', 'COM-002', 8, true,
   ARRAY['11111111-1111-1111-1111-111111111002','11111111-1111-1111-1111-111111111003'],
   '[{"channel":"delivery","price":44.99},{"channel":"pickup","price":41.99},{"channel":"eat_in","price":44.99}]',
   '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z');

-- ============================================================================
-- 8. EMPLOYEES (FK: location_id -> users_locations)
-- ============================================================================
INSERT INTO public.employees_employees (id, first_name, last_name, email, phone, employee_code, pin, role, employment_type, hourly_rate, overtime_rate, location_id, is_active, created_at, updated_at) VALUES
  ('55555555-5555-5555-5555-555555555001', 'Anna', 'Kowalska', 'anna.kowalska@mesopos.pl', '+48 501 111 111', 'EMP001', '1234', 'chef', 'full_time', 28, 42, '11111111-1111-1111-1111-111111111001', true, '2024-01-15T00:00:00.000Z', '2024-01-15T00:00:00.000Z'),
  ('55555555-5555-5555-5555-555555555002', 'Jan', 'Kowalski', 'jan.k@mesopos.pl', '+48 501 222 222', 'EMP002', '2345', 'cook', 'full_time', 22, 33, '11111111-1111-1111-1111-111111111001', true, '2024-02-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'),
  ('55555555-5555-5555-5555-555555555003', 'Maria', 'Wiśniewska', 'maria.w@mesopos.pl', '+48 501 333 333', 'EMP003', '3456', 'cashier', 'part_time', 20, NULL, '11111111-1111-1111-1111-111111111002', true, '2024-02-15T00:00:00.000Z', '2024-02-15T00:00:00.000Z'),
  ('55555555-5555-5555-5555-555555555004', 'Piotr', 'Nowak', 'piotr.n@mesopos.pl', '+48 501 444 444', 'EMP004', '4567', 'delivery', 'contract', 18, NULL, '11111111-1111-1111-1111-111111111002', true, '2024-03-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z'),
  ('55555555-5555-5555-5555-555555555005', 'Katarzyna', 'Lewandowska', 'katarzyna.l@mesopos.pl', '+48 501 555 555', 'EMP005', '5678', 'manager', 'full_time', 35, 52.5, '11111111-1111-1111-1111-111111111003', true, '2024-01-10T00:00:00.000Z', '2024-01-10T00:00:00.000Z'),
  ('55555555-5555-5555-5555-555555555006', 'Tomasz', 'Zieliński', 'tomasz.z@mesopos.pl', '+48 501 666 666', 'EMP006', '6789', 'warehouse', 'full_time', 20, 30, '11111111-1111-1111-1111-111111111001', true, '2024-03-15T00:00:00.000Z', '2024-03-15T00:00:00.000Z');

-- ============================================================================
-- 9. WORK TIMES (FK: employee_id -> employees, location_id -> locations)
-- Use fixed timestamps for seed data reproducibility
-- ============================================================================
INSERT INTO public.employees_work_times (id, employee_id, location_id, status, clock_in, clock_out, total_break_minutes, total_work_minutes, created_at, updated_at) VALUES
  ('77777777-7777-7777-7777-777777777001', '55555555-5555-5555-5555-555555555001', '11111111-1111-1111-1111-111111111001', 'clocked_in', '2026-02-25T06:00:00.000Z', NULL, 0, NULL, '2026-02-25T06:00:00.000Z', '2026-02-25T06:00:00.000Z'),
  ('77777777-7777-7777-7777-777777777002', '55555555-5555-5555-5555-555555555002', '11111111-1111-1111-1111-111111111001', 'clocked_in', '2026-02-25T06:30:00.000Z', NULL, 0, NULL, '2026-02-25T06:30:00.000Z', '2026-02-25T06:30:00.000Z'),
  ('77777777-7777-7777-7777-777777777003', '55555555-5555-5555-5555-555555555003', '11111111-1111-1111-1111-111111111002', 'clocked_in', '2026-02-25T08:00:00.000Z', NULL, 0, NULL, '2026-02-25T08:00:00.000Z', '2026-02-25T08:00:00.000Z'),
  ('77777777-7777-7777-7777-777777777004', '55555555-5555-5555-5555-555555555006', '11111111-1111-1111-1111-111111111001', 'clocked_out', '2026-02-25T04:00:00.000Z', '2026-02-25T10:00:00.000Z', 30, 330, '2026-02-25T04:00:00.000Z', '2026-02-25T10:00:00.000Z'),
  ('77777777-7777-7777-7777-777777777005', '55555555-5555-5555-5555-555555555004', '11111111-1111-1111-1111-111111111002', 'clocked_out', '2026-02-25T06:00:00.000Z', '2026-02-25T09:00:00.000Z', 15, 165, '2026-02-25T06:00:00.000Z', '2026-02-25T09:00:00.000Z');

-- ============================================================================
-- 10. CRM CUSTOMERS (no FK dependencies)
-- ============================================================================
INSERT INTO public.crm_customers (id, first_name, last_name, email, phone, birth_date, registration_date, source, marketing_consent, loyalty_points, loyalty_tier, rfm_segment, rfm_recency_score, rfm_frequency_score, rfm_monetary_score, rfm_last_calculated, addresses, preferences, order_history, notes, is_active, created_at, updated_at) VALUES
  ('99999999-9999-9999-9999-999999990001', 'Anna', 'Kowalska', 'anna.kowalska@example.com', '+48 501 234 567', '1990-05-15T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'mobile_app', true, 350, 'bronze', NULL, NULL, NULL, NULL, NULL,
   '[{"id":"addr-001","customer_id":"99999999-9999-9999-9999-999999990001","label":"Dom","street":"ul. Marszałkowska","building_number":"100","apartment_number":"25","postal_code":"00-001","city":"Warszawa","is_default":true,"delivery_instructions":"Dzwonek na dole, 2 piętro","created_at":"2024-01-01T00:00:00.000Z"}]',
   '{"favorite_products":[],"dietary_restrictions":["gluten_free"],"default_payment_method":"card"}',
   '{"total_orders":12,"total_spent":450.0,"average_order_value":37.5,"last_order_date":"2024-02-01T00:00:00.000Z","first_order_date":"2024-01-05T00:00:00.000Z"}',
   NULL, true, '2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'),

  ('99999999-9999-9999-9999-999999990002', 'Jan', 'Kowalski', 'jan.kowalski@example.com', '+48 502 234 567', '1988-03-22T00:00:00.000Z', '2024-01-15T00:00:00.000Z', 'pos_terminal', false, 180, 'bronze', NULL, NULL, NULL, NULL, NULL,
   '[]',
   '{}',
   '{"total_orders":5,"total_spent":215.0,"average_order_value":43.0,"last_order_date":"2024-01-30T00:00:00.000Z","first_order_date":"2024-01-15T00:00:00.000Z"}',
   'Zawsze zamawia z dodatkiem ostrego sosu', true, '2024-01-15T00:00:00.000Z', '2024-01-30T00:00:00.000Z'),

  ('99999999-9999-9999-9999-999999990003', 'Piotr', 'Nowak', 'piotr.nowak@example.com', '+48 503 345 678', '1985-08-20T00:00:00.000Z', '2023-10-01T00:00:00.000Z', 'pos_terminal', true, 750, 'silver', NULL, NULL, NULL, NULL, NULL,
   '[{"id":"addr-003","customer_id":"99999999-9999-9999-9999-999999990003","label":"Biuro","street":"ul. Świętokrzyska","building_number":"21","apartment_number":null,"postal_code":"00-002","city":"Warszawa","is_default":true,"delivery_instructions":"Recepcja, 1 piętro","created_at":"2023-10-01T00:00:00.000Z"}]',
   '{"favorite_products":[],"dietary_restrictions":[],"default_payment_method":"blik"}',
   '{"total_orders":35,"total_spent":1250.0,"average_order_value":35.71,"last_order_date":"2024-01-28T00:00:00.000Z","first_order_date":"2023-10-05T00:00:00.000Z"}',
   'Stały klient, preferuje burgery ostrzejsze', true, '2023-10-01T00:00:00.000Z', '2024-01-28T00:00:00.000Z'),

  ('99999999-9999-9999-9999-999999990004', 'Maria', 'Wiśniewska', 'maria.wisniewska@example.com', '+48 504 456 789', '1978-12-10T00:00:00.000Z', '2023-06-01T00:00:00.000Z', 'mobile_app', true, 1850, 'gold', NULL, NULL, NULL, NULL, NULL,
   '[{"id":"addr-002","customer_id":"99999999-9999-9999-9999-999999990004","label":"Dom","street":"ul. Emilii Plater","building_number":"53","apartment_number":"12A","postal_code":"00-113","city":"Warszawa","is_default":true,"delivery_instructions":"Domofon - Wiśniewska","created_at":"2023-06-01T00:00:00.000Z"},{"id":"addr-004","customer_id":"99999999-9999-9999-9999-999999990004","label":"Biuro","street":"ul. Złota","building_number":"44","apartment_number":null,"postal_code":"00-120","city":"Warszawa","is_default":false,"delivery_instructions":"Ochrona przy wejściu","created_at":"2023-07-15T00:00:00.000Z"}]',
   '{"favorite_products":[],"dietary_restrictions":[],"default_payment_method":"card"}',
   '{"total_orders":78,"total_spent":3200.0,"average_order_value":41.03,"last_order_date":"2024-02-05T00:00:00.000Z","first_order_date":"2023-06-08T00:00:00.000Z"}',
   'VIP - zawsze pyta o nowości w menu', true, '2023-06-01T00:00:00.000Z', '2024-02-05T00:00:00.000Z'),

  ('99999999-9999-9999-9999-999999990005', 'Tomasz', 'Kaczmarek', NULL, '+48 505 567 890', NULL, '2024-02-06T00:00:00.000Z', 'pos_terminal', false, 0, 'bronze', NULL, NULL, NULL, NULL, NULL,
   '[]',
   '{}',
   '{"total_orders":0,"total_spent":0,"average_order_value":0,"last_order_date":null,"first_order_date":null}',
   NULL, true, '2024-02-06T00:00:00.000Z', '2024-02-06T00:00:00.000Z');

-- ============================================================================
-- 11. ORDERS (FK: location_id -> users_locations)
-- Using fixed date 2026-02-25 for reproducibility
-- ============================================================================
INSERT INTO public.orders_orders (id, order_number, status, channel, source, location_id, customer_name, customer_phone, delivery_address, items, subtotal, tax, discount, total, payment_method, payment_status, notes, status_history, assigned_to, estimated_ready_at, created_at, updated_at) VALUES
  -- Order 1: Delivered
  ('55555555-5555-5555-5555-555555555001', 'ZAM-20260225-001', 'delivered', 'pos', 'dine_in',
   '11111111-1111-1111-1111-111111111002', 'Katarzyna Malinowska', '+48 501 234 567', NULL,
   '[{"id":"item-001-1","product_id":"44444444-4444-4444-4444-444444444001","product_name":"Cheeseburger Klasyczny","quantity":1,"unit_price":24.99,"modifiers":[{"modifier_id":"mod-extra-cheese","modifier_group_id":"mg-extras","name":"Dodatkowy ser","price":3.0,"quantity":1}],"subtotal":27.99},{"id":"item-001-2","product_id":"prod-fries-regular","product_name":"Frytki klasyczne","variant_id":"var-fries-medium","variant_name":"Srednie","quantity":1,"unit_price":12.99,"modifiers":[],"subtotal":12.99}]',
   40.98, 9.42, 0, 54.97, 'card', 'paid', '',
   '[{"status":"pending","timestamp":"2026-02-25T10:15:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T10:16:00.000Z"},{"status":"preparing","timestamp":"2026-02-25T10:18:00.000Z"},{"status":"ready","timestamp":"2026-02-25T10:30:00.000Z"},{"status":"delivered","timestamp":"2026-02-25T10:32:00.000Z","note":"Wydano klientowi"}]',
   '22222222-2222-2222-2222-222222222004', NULL, '2026-02-25T10:15:00.000Z', '2026-02-25T10:32:00.000Z'),

  -- Order 2: Delivered
  ('55555555-5555-5555-5555-555555555002', 'ZAM-20260225-002', 'delivered', 'phone', 'takeaway',
   '11111111-1111-1111-1111-111111111003', 'Marcin Kowalczyk', '+48 502 345 678', NULL,
   '[{"id":"item-002-1","product_id":"44444444-4444-4444-4444-444444444002","product_name":"Bacon Burger","quantity":2,"unit_price":29.99,"modifiers":[],"subtotal":59.98},{"id":"item-002-2","product_id":"prod-cola","product_name":"Cola","variant_id":"var-cola-large","variant_name":"Duza","quantity":2,"unit_price":8.99,"modifiers":[],"subtotal":17.98},{"id":"item-002-3","product_id":"prod-fries-regular","product_name":"Frytki klasyczne","variant_id":"var-fries-large","variant_name":"Duze","quantity":1,"unit_price":14.99,"modifiers":[],"subtotal":14.99}]',
   92.95, 17.46, 0, 72.96, 'cash', 'paid', NULL,
   '[{"status":"pending","timestamp":"2026-02-25T10:45:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T10:47:00.000Z"},{"status":"preparing","timestamp":"2026-02-25T10:50:00.000Z"},{"status":"ready","timestamp":"2026-02-25T11:05:00.000Z"},{"status":"delivered","timestamp":"2026-02-25T11:08:00.000Z","note":"Odebrane przez klienta"}]',
   '22222222-2222-2222-2222-222222222004', NULL, '2026-02-25T10:45:00.000Z', '2026-02-25T11:08:00.000Z'),

  -- Order 3: Cancelled
  ('55555555-5555-5555-5555-555555555003', 'ZAM-20260225-003', 'cancelled', 'online', 'delivery',
   '11111111-1111-1111-1111-111111111003', 'Agnieszka Wozniak', '+48 503 456 789',
   '{"street":"ul. Nowy Swiat 15/3","city":"Warszawa","postal_code":"00-029","country":"Polska"}',
   '[{"id":"item-003-1","product_id":"44444444-4444-4444-4444-444444444003","product_name":"Veggie Burger","quantity":1,"unit_price":26.99,"modifiers":[{"modifier_id":"mod-extra-avocado","modifier_group_id":"mg-extras","name":"Dodatkowe awokado","price":5.0,"quantity":1}],"subtotal":31.99}]',
   31.99, 6.00, 0, 29.99, 'online', 'refunded', 'Zmiana planow',
   '[{"status":"pending","timestamp":"2026-02-25T11:20:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T11:22:00.000Z"},{"status":"cancelled","timestamp":"2026-02-25T11:30:00.000Z","note":"Zmiana planow - klient anulowal"}]',
   NULL, NULL, '2026-02-25T11:20:00.000Z', '2026-02-25T11:30:00.000Z'),

  -- Order 4: Preparing
  ('55555555-5555-5555-5555-555555555004', 'ZAM-20260225-004', 'preparing', 'pos', 'dine_in',
   '11111111-1111-1111-1111-111111111002', 'Pawel Szymanski', '+48 504 567 890', NULL,
   '[{"id":"item-004-1","product_id":"44444444-4444-4444-4444-444444444001","product_name":"Cheeseburger Klasyczny","quantity":1,"unit_price":24.99,"modifiers":[],"subtotal":24.99},{"id":"item-004-2","product_id":"prod-salad-caesar","product_name":"Salatka Caesar","quantity":1,"unit_price":22.99,"modifiers":[],"subtotal":22.99}]',
   47.98, 9.04, 0, 47.98, 'blik', 'paid', NULL,
   '[{"status":"pending","timestamp":"2026-02-25T12:00:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T12:02:00.000Z"},{"status":"preparing","timestamp":"2026-02-25T12:05:00.000Z"}]',
   '22222222-2222-2222-2222-222222222003', '2026-02-25T12:20:00.000Z', '2026-02-25T12:00:00.000Z', '2026-02-25T12:05:00.000Z'),

  -- Order 5: Preparing
  ('55555555-5555-5555-5555-555555555005', 'ZAM-20260225-005', 'preparing', 'delivery_app', 'delivery',
   '11111111-1111-1111-1111-111111111001', 'Joanna Kaminska', '+48 505 678 901',
   '{"street":"ul. Mokotowska 25/10","city":"Warszawa","postal_code":"00-560","country":"Polska"}',
   '[{"id":"item-005-1","product_id":"44444444-4444-4444-4444-444444444002","product_name":"Bacon Burger","quantity":1,"unit_price":29.99,"modifiers":[{"modifier_id":"mod-jalapeno","modifier_group_id":"mg-extras","name":"Jalapeno","price":2.0,"quantity":1}],"subtotal":31.99},{"id":"item-005-2","product_id":"prod-fries-regular","product_name":"Frytki klasyczne","variant_id":"var-fries-small","variant_name":"Male","quantity":2,"unit_price":9.99,"modifiers":[],"subtotal":19.98},{"id":"item-005-3","product_id":"prod-cola","product_name":"Cola","variant_id":"var-cola-medium","variant_name":"Srednia","quantity":1,"unit_price":6.99,"modifiers":[],"subtotal":6.99},{"id":"item-005-4","product_id":"prod-brownie","product_name":"Brownie czekoladowe","quantity":1,"unit_price":12.99,"modifiers":[],"subtotal":12.99}]',
   71.95, 13.55, 0, 89.95, 'online', 'paid', NULL,
   '[{"status":"pending","timestamp":"2026-02-25T12:15:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T12:17:00.000Z"},{"status":"accepted","timestamp":"2026-02-25T12:18:00.000Z"},{"status":"preparing","timestamp":"2026-02-25T12:20:00.000Z"}]',
   '22222222-2222-2222-2222-222222222003', '2026-02-25T12:35:00.000Z', '2026-02-25T12:15:00.000Z', '2026-02-25T12:20:00.000Z'),

  -- Order 6: Ready
  ('55555555-5555-5555-5555-555555555006', 'ZAM-20260225-006', 'ready', 'pos', 'takeaway',
   '11111111-1111-1111-1111-111111111002', 'Tomasz Jankowski', '+48 506 789 012', NULL,
   '[{"id":"item-006-1","product_id":"44444444-4444-4444-4444-444444444001","product_name":"Cheeseburger Klasyczny","quantity":1,"unit_price":24.99,"modifiers":[{"modifier_id":"mod-double-meat","modifier_group_id":"mg-extras","name":"Podwojna porcja miesa","price":8.0,"quantity":1}],"subtotal":32.99},{"id":"item-006-2","product_id":"prod-lemonade","product_name":"Lemoniada domowa","variant_id":"var-lemonade-large","variant_name":"Duza","quantity":1,"unit_price":12.99,"modifiers":[],"subtotal":12.99}]',
   45.98, 8.65, 0, 59.98, 'card', 'paid', NULL,
   '[{"status":"pending","timestamp":"2026-02-25T12:30:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T12:31:00.000Z"},{"status":"preparing","timestamp":"2026-02-25T12:33:00.000Z"},{"status":"ready","timestamp":"2026-02-25T12:45:00.000Z","note":"Gotowe do odbioru"}]',
   '22222222-2222-2222-2222-222222222004', NULL, '2026-02-25T12:30:00.000Z', '2026-02-25T12:45:00.000Z'),

  -- Order 7: Out for delivery
  ('55555555-5555-5555-5555-555555555007', 'ZAM-20260225-007', 'out_for_delivery', 'phone', 'delivery',
   '11111111-1111-1111-1111-111111111001', 'Ewa Grabowska', '+48 507 890 123',
   '{"street":"ul. Polna 8/2","city":"Warszawa","postal_code":"00-625","country":"Polska"}',
   '[{"id":"item-007-1","product_id":"44444444-4444-4444-4444-444444444002","product_name":"Bacon Burger","quantity":1,"unit_price":29.99,"modifiers":[],"subtotal":29.99},{"id":"item-007-2","product_id":"prod-fries-regular","product_name":"Frytki klasyczne","variant_id":"var-fries-medium","variant_name":"Srednie","quantity":1,"unit_price":12.99,"modifiers":[],"subtotal":12.99},{"id":"item-007-3","product_id":"prod-water","product_name":"Woda mineralna","quantity":2,"unit_price":4.99,"modifiers":[],"subtotal":9.98}]',
   52.96, 9.99, 0, 67.96, 'cash', 'pending', 'Prosze dzwonic domofonem',
   '[{"status":"pending","timestamp":"2026-02-25T12:45:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T12:47:00.000Z"},{"status":"preparing","timestamp":"2026-02-25T12:50:00.000Z"},{"status":"ready","timestamp":"2026-02-25T13:05:00.000Z"},{"status":"out_for_delivery","timestamp":"2026-02-25T13:08:00.000Z","note":"Kurier w drodze"}]',
   '22222222-2222-2222-2222-222222222005', NULL, '2026-02-25T12:45:00.000Z', '2026-02-25T13:08:00.000Z'),

  -- Order 8: Pending
  ('55555555-5555-5555-5555-555555555008', 'ZAM-20260225-008', 'pending', 'online', 'delivery',
   '11111111-1111-1111-1111-111111111003', 'Robert Dabkowski', '+48 508 901 234',
   '{"street":"ul. Chmielna 20/5","city":"Warszawa","postal_code":"00-020","country":"Polska"}',
   '[{"id":"item-008-1","product_id":"44444444-4444-4444-4444-444444444003","product_name":"Veggie Burger","quantity":1,"unit_price":26.99,"modifiers":[{"modifier_id":"mod-extra-sauce","modifier_group_id":"mg-sauces","name":"Dodatkowy sos","price":2.0,"quantity":1}],"subtotal":28.99}]',
   28.99, 5.46, 0, 34.99, 'online', 'paid', NULL,
   '[{"status":"pending","timestamp":"2026-02-25T13:00:00.000Z"}]',
   NULL, NULL, '2026-02-25T13:00:00.000Z', '2026-02-25T13:00:00.000Z'),

  -- Order 9: Pending
  ('55555555-5555-5555-5555-555555555009', 'ZAM-20260225-009', 'pending', 'pos', 'takeaway',
   '11111111-1111-1111-1111-111111111002', 'Malgorzata Lis', '+48 509 012 345', NULL,
   '[{"id":"item-009-1","product_id":"44444444-4444-4444-4444-444444444001","product_name":"Cheeseburger Klasyczny","quantity":1,"unit_price":24.99,"modifiers":[],"subtotal":24.99},{"id":"item-009-2","product_id":"prod-fries-regular","product_name":"Frytki klasyczne","variant_id":"var-fries-small","variant_name":"Male","quantity":1,"unit_price":9.99,"modifiers":[],"subtotal":9.99}]',
   34.98, 6.59, 0, 42.98, 'blik', 'paid', NULL,
   '[{"status":"pending","timestamp":"2026-02-25T13:10:00.000Z"}]',
   '22222222-2222-2222-2222-222222222004', NULL, '2026-02-25T13:10:00.000Z', '2026-02-25T13:10:00.000Z'),

  -- Order 10: Confirmed
  ('55555555-5555-5555-5555-555555555010', 'ZAM-20260225-010', 'confirmed', 'delivery_app', 'delivery',
   '11111111-1111-1111-1111-111111111001', 'Krzysztof Nowicki', '+48 510 123 456',
   '{"street":"ul. Wilcza 33/7","city":"Warszawa","postal_code":"00-544","country":"Polska"}',
   '[{"id":"item-010-1","product_id":"44444444-4444-4444-4444-444444444002","product_name":"Bacon Burger","quantity":1,"unit_price":29.99,"modifiers":[{"modifier_id":"mod-extra-cheese","modifier_group_id":"mg-extras","name":"Dodatkowy ser","price":3.0,"quantity":1}],"subtotal":32.99},{"id":"item-010-2","product_id":"prod-fries-regular","product_name":"Frytki klasyczne","variant_id":"var-fries-large","variant_name":"Duze","quantity":1,"unit_price":14.99,"modifiers":[],"subtotal":14.99},{"id":"item-010-3","product_id":"prod-cola","product_name":"Cola","variant_id":"var-cola-medium","variant_name":"Srednia","quantity":1,"unit_price":6.99,"modifiers":[],"subtotal":6.99}]',
   54.97, 10.36, 0, 79.96, 'online', 'paid', NULL,
   '[{"status":"pending","timestamp":"2026-02-25T13:15:00.000Z"},{"status":"confirmed","timestamp":"2026-02-25T13:17:00.000Z"}]',
   '22222222-2222-2222-2222-222222222003', '2026-02-25T13:35:00.000Z', '2026-02-25T13:15:00.000Z', '2026-02-25T13:17:00.000Z');

-- ============================================================================
-- 12. KITCHEN TICKETS (FK: order_id -> orders_orders, location_id -> users_locations)
-- Note: order_id references in seed data use non-existent order UUIDs from kitchen-tickets.ts
-- We use NULL for order_id to avoid FK violations, since the TS data references different order IDs
-- ============================================================================
INSERT INTO public.orders_kitchen_tickets (id, order_id, order_number, location_id, status, items, priority, started_at, completed_at, estimated_minutes, notes, created_at, updated_at) VALUES
  ('aaaa0000-0000-0000-0000-000000000001', NULL, 'ZAM-20250207-004', '11111111-1111-1111-1111-111111111001', 'preparing',
   '[{"id":"ki-001","order_item_id":"oi-004-1","product_name":"Cheeseburger","quantity":2,"modifiers":["Dodatkowy ser"],"is_done":true}]',
   1, '2026-02-25T12:55:00.000Z', NULL, 12, NULL,
   '2026-02-25T12:52:00.000Z', '2026-02-25T12:55:00.000Z'),

  ('aaaa0000-0000-0000-0000-000000000002', NULL, 'ZAM-20250207-005', '11111111-1111-1111-1111-111111111001', 'preparing',
   '[{"id":"ki-002","order_item_id":"oi-005-1","product_name":"Bacon Burger","quantity":1,"modifiers":[],"is_done":false},{"id":"ki-003","order_item_id":"oi-005-2","product_name":"Frytki","variant_name":"Duże","quantity":2,"modifiers":["Sos czosnkowy"],"is_done":true},{"id":"ki-004","order_item_id":"oi-005-3","product_name":"Lemoniada","variant_name":"Średnia","quantity":1,"modifiers":[],"is_done":true}]',
   2, '2026-02-25T12:58:00.000Z', NULL, 15, 'Klient prosi o dobrze wysmażone mięso',
   '2026-02-25T12:56:00.000Z', '2026-02-25T12:58:00.000Z'),

  ('aaaa0000-0000-0000-0000-000000000003', NULL, 'ZAM-20250207-006', '11111111-1111-1111-1111-111111111001', 'ready',
   '[{"id":"ki-005","order_item_id":"oi-006-1","product_name":"Double Smash Burger","quantity":1,"modifiers":["Dodatkowy bekon"],"is_done":true},{"id":"ki-006","order_item_id":"oi-006-2","product_name":"Frytki","variant_name":"Średnie","quantity":1,"modifiers":[],"is_done":true}]',
   1, '2026-02-25T12:44:00.000Z', '2026-02-25T12:58:00.000Z', 14, NULL,
   '2026-02-25T12:40:00.000Z', '2026-02-25T12:58:00.000Z'),

  ('aaaa0000-0000-0000-0000-000000000004', NULL, 'ZAM-20250207-008', '11111111-1111-1111-1111-111111111002', 'pending',
   '[{"id":"ki-007","order_item_id":"oi-008-1","product_name":"Zestaw Burger","quantity":1,"modifiers":["Burger klasyczny","Frytki średnie","Cola 0.3L"],"is_done":false}]',
   1, NULL, NULL, 15, NULL,
   '2026-02-25T12:59:00.000Z', '2026-02-25T12:59:00.000Z'),

  ('aaaa0000-0000-0000-0000-000000000005', NULL, 'ZAM-20250207-009', '11111111-1111-1111-1111-111111111002', 'pending',
   '[{"id":"ki-008","order_item_id":"oi-009-1","product_name":"Veggie Burger","quantity":1,"modifiers":[],"is_done":false},{"id":"ki-009","order_item_id":"oi-009-2","product_name":"Sałatka Cezar","quantity":1,"modifiers":["Bez grzanek"],"is_done":false}]',
   1, NULL, NULL, 10, NULL,
   '2026-02-25T12:59:30.000Z', '2026-02-25T12:59:30.000Z');
