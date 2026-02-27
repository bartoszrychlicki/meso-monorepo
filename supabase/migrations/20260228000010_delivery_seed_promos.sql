-- ============================================================================
-- Migration: Seed delivery promo codes and loyalty rewards
-- Part of: Meso Delivery → MesoPOS integration
-- Populates crm_promotions and crm_loyalty_rewards with Delivery data
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Promo codes (from Delivery's promo_codes table)
-- --------------------------------------------------------------------------
INSERT INTO crm_promotions (code, name, description, discount_type, discount_value, free_item_id,
    min_order_amount, first_order_only, trigger_scenario, max_uses, max_uses_per_customer,
    is_active, channels)
VALUES
(
    'PIERWSZYRAMEN',
    'Pierwszy ramen -15%',
    'Zniżka 15% na pierwsze zamówienie',
    'percent', 15, NULL,
    0, true, 'new_customer', NULL, 1,
    true, '{delivery,pickup}'
),
(
    'MESOCLUB',
    'MESO Club -10%',
    'Zniżka 10% dla członków MESO Club',
    'percent', 10, NULL,
    50, false, 'manual', NULL, NULL,
    true, '{delivery,pickup}'
),
(
    'DOSTAWAZERO',
    'Darmowa dostawa',
    'Darmowa dostawa przy zamówieniu powyżej 45 zł',
    'free_delivery', NULL, NULL,
    45, false, 'manual', NULL, NULL,
    true, '{delivery}'
),
(
    'LATO2024',
    'Lato 2024 -10 zł',
    'Rabat 10 zł na zamówienie powyżej 40 zł',
    'fixed', 10, NULL,
    40, false, 'seasonal', NULL, NULL,
    true, '{delivery,pickup}'
),
(
    'GYOZAFREE',
    'Darmowa Gyoza',
    'Darmowa porcja gyozy z kurczakiem przy zamówieniu powyżej 60 zł',
    'free_item', NULL, 'd0000002-0000-0000-0000-000000000010',
    60, false, 'manual', NULL, NULL,
    true, '{delivery,pickup}'
)
ON CONFLICT (code) DO NOTHING;

-- --------------------------------------------------------------------------
-- 2. Loyalty rewards (from Delivery's loyalty_rewards table)
-- --------------------------------------------------------------------------
INSERT INTO crm_loyalty_rewards (name, description, points_cost, reward_type,
    discount_value, free_product_id, icon, min_tier, sort_order, is_active)
VALUES
(
    'Darmowa dostawa',
    'Twoje następne zamówienie bez kosztów dostawy',
    100, 'free_delivery',
    NULL, NULL, '🚚', 'bronze', 1, true
),
(
    'Gyoza (6 szt)',
    'Darmowa porcja gyozy do zamówienia',
    150, 'free_product',
    NULL, 'd0000002-0000-0000-0000-000000000010', '🥟', 'bronze', 2, true
),
(
    '10 zł rabatu',
    'Rabat na następne zamówienie',
    200, 'discount',
    10.00, NULL, '💰', 'bronze', 3, true
),
(
    'Ramen do wyboru',
    'Dowolny ramen z menu gratis',
    300, 'free_product',
    NULL, NULL, '🍜', 'bronze', 4, true
)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 3. Promo banners (from Delivery's promo_banners table)
--    Stored in a new table if needed, or as app_config
-- --------------------------------------------------------------------------
-- We'll use the POS pattern: store as configuration
-- (These can be managed via POS admin panel later)
