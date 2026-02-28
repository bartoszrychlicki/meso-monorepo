-- Migration: Extract modifiers from JSONB modifier_groups into standalone menu_modifiers
-- Deduplicates by normalized name, takes newest price, and creates product_modifiers links.

BEGIN;

-- ============================================================================
-- 1. UPDATE existing menu_modifiers with corrected names/prices from JSONB
-- ============================================================================

-- "Jajko marynowane" was 5 PLN in seed, but user set it to 3 PLN on products
UPDATE public.menu_modifiers
SET name = 'Jajko marynowane', price = 3
WHERE id = '55555555-5555-5555-5555-555555550101'::uuid;

-- "Extra chasiu" keep at 8 PLN but standardize name (merge with "Extra chasiu (2x więcej)")
UPDATE public.menu_modifiers
SET name = 'Extra chasiu', price = 8
WHERE id = '55555555-5555-5555-5555-555555550102'::uuid;

-- "Extra nori" → rename to "Nori" at 2 PLN (user uses "Nori" on products)
UPDATE public.menu_modifiers
SET name = 'Nori', price = 2
WHERE id = '55555555-5555-5555-5555-555555550103'::uuid;

-- "Kukurydza" stays at 3 PLN (unchanged)

-- "Sos sojowy" was 0 PLN in seed, but user set 1 PLN on products
UPDATE public.menu_modifiers
SET name = 'Sos sojowy', price = 1
WHERE id = '55555555-5555-5555-5555-555555550201'::uuid;

-- "Sos chilli" stays at 0 PLN (keep from seed)
-- "Ponzu" stays at 0 PLN (keep from seed)

-- ============================================================================
-- 2. INSERT new modifiers extracted from JSONB (not already in menu_modifiers)
-- ============================================================================

INSERT INTO public.menu_modifiers (id, name, price, modifier_action, is_available, sort_order)
VALUES
  -- Ramen extras
  (gen_random_uuid(), 'Pałeczki', 1, 'add', true, 10),
  (gen_random_uuid(), 'Extra kurczak (2x porcja)', 8, 'add', true, 11),
  (gen_random_uuid(), 'Extra mięso mielone (2x porcja)', 10, 'add', true, 12),
  -- Gyoza extras
  (gen_random_uuid(), 'Spicy Mayo', 6, 'add', true, 20),
  (gen_random_uuid(), 'Miseczka ryżu', 5, 'add', true, 21),
  (gen_random_uuid(), 'Sos Teriyaki', 4, 'add', true, 22),
  (gen_random_uuid(), 'Dodatkowe 4 pierożki', 10, 'add', true, 23),
  -- Karaage extras
  (gen_random_uuid(), 'Mały azjatycki coleslaw', 8, 'add', true, 30),
  (gen_random_uuid(), 'Dodatkowy spicy mayo na boku', 6, 'add', true, 31),
  (gen_random_uuid(), 'Dodatkowy Teriyaki na boku', 5, 'add', true, 32);

-- ============================================================================
-- 3. CLEAR existing product_modifiers and REBUILD from JSONB mapping
--    (the old migration only partially linked some products)
-- ============================================================================

DELETE FROM public.product_modifiers;

-- Ramen Vege
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444001'::uuid, id FROM public.menu_modifiers WHERE name = 'Jajko marynowane'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444001'::uuid, id FROM public.menu_modifiers WHERE name = 'Extra chasiu'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444001'::uuid, id FROM public.menu_modifiers WHERE name = 'Nori'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444001'::uuid, id FROM public.menu_modifiers WHERE name = 'Kukurydza';

-- Ramen Tonkotsu Chasiu
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444002'::uuid, id FROM public.menu_modifiers WHERE name = 'Jajko marynowane'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444002'::uuid, id FROM public.menu_modifiers WHERE name = 'Extra chasiu'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444002'::uuid, id FROM public.menu_modifiers WHERE name = 'Nori'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444002'::uuid, id FROM public.menu_modifiers WHERE name = 'Pałeczki';

-- Ramen Shoyu Kurczak
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444003'::uuid, id FROM public.menu_modifiers WHERE name = 'Jajko marynowane'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444003'::uuid, id FROM public.menu_modifiers WHERE name = 'Extra kurczak (2x porcja)'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444003'::uuid, id FROM public.menu_modifiers WHERE name = 'Nori'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444003'::uuid, id FROM public.menu_modifiers WHERE name = 'Pałeczki';

-- Ramen Spicy Miso
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444004'::uuid, id FROM public.menu_modifiers WHERE name = 'Jajko marynowane'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444004'::uuid, id FROM public.menu_modifiers WHERE name = 'Nori'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444004'::uuid, id FROM public.menu_modifiers WHERE name = 'Pałeczki'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444004'::uuid, id FROM public.menu_modifiers WHERE name = 'Extra mięso mielone (2x porcja)';

-- Gyoza wege
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444005'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos sojowy'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444005'::uuid, id FROM public.menu_modifiers WHERE name = 'Spicy Mayo'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444005'::uuid, id FROM public.menu_modifiers WHERE name = 'Miseczka ryżu'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444005'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos Teriyaki'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444005'::uuid, id FROM public.menu_modifiers WHERE name = 'Dodatkowe 4 pierożki';

-- Gyoza wieprzowina
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444006'::uuid, id FROM public.menu_modifiers WHERE name = 'Spicy Mayo';

-- Gyoza krewetka
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444007'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos sojowy'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444007'::uuid, id FROM public.menu_modifiers WHERE name = 'Spicy Mayo'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444007'::uuid, id FROM public.menu_modifiers WHERE name = 'Miseczka ryżu'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444007'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos Teriyaki'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444007'::uuid, id FROM public.menu_modifiers WHERE name = 'Dodatkowe 4 pierożki';

-- Gyoza kurczak
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444008'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos sojowy'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444008'::uuid, id FROM public.menu_modifiers WHERE name = 'Spicy Mayo'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444008'::uuid, id FROM public.menu_modifiers WHERE name = 'Miseczka ryżu'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444008'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos Teriyaki'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444008'::uuid, id FROM public.menu_modifiers WHERE name = 'Dodatkowe 4 pierożki';

-- Gyoza na ryżu
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '53a02f0b-9d9b-4170-9347-b40616f44b6f'::uuid, id FROM public.menu_modifiers WHERE name = 'Spicy Mayo'
UNION ALL
SELECT '53a02f0b-9d9b-4170-9347-b40616f44b6f'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos Teriyaki'
UNION ALL
SELECT '53a02f0b-9d9b-4170-9347-b40616f44b6f'::uuid, id FROM public.menu_modifiers WHERE name = 'Sos sojowy';

-- Karaage fryty teriyaki
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT '44444444-4444-4444-4444-444444444009'::uuid, id FROM public.menu_modifiers WHERE name = 'Mały azjatycki coleslaw'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444009'::uuid, id FROM public.menu_modifiers WHERE name = 'Dodatkowy spicy mayo na boku'
UNION ALL
SELECT '44444444-4444-4444-4444-444444444009'::uuid, id FROM public.menu_modifiers WHERE name = 'Dodatkowy Teriyaki na boku';

COMMIT;
