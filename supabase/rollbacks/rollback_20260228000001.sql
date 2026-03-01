-- Rollback: 20260228000001_delivery_extend_menu.sql
-- Removes delivery-specific columns from menu schema

DROP INDEX IF EXISTS idx_menu_products_tags;
DROP INDEX IF EXISTS idx_menu_products_dietary;
DROP INDEX IF EXISTS idx_menu_products_is_spicy;
DROP INDEX IF EXISTS idx_menu_products_is_new;
DROP INDEX IF EXISTS idx_menu_products_is_signature;
DROP INDEX IF EXISTS idx_menu_products_is_bestseller;
DROP INDEX IF EXISTS idx_menu_categories_is_featured;

ALTER TABLE menu_products
    DROP COLUMN IF EXISTS name_jp,
    DROP COLUMN IF EXISTS story,
    DROP COLUMN IF EXISTS original_price,
    DROP COLUMN IF EXISTS prep_time_min,
    DROP COLUMN IF EXISTS prep_time_max,
    DROP COLUMN IF EXISTS calories,
    DROP COLUMN IF EXISTS is_vegetarian,
    DROP COLUMN IF EXISTS is_vegan,
    DROP COLUMN IF EXISTS is_gluten_free,
    DROP COLUMN IF EXISTS is_spicy,
    DROP COLUMN IF EXISTS spice_level,
    DROP COLUMN IF EXISTS has_spice_level,
    DROP COLUMN IF EXISTS is_signature,
    DROP COLUMN IF EXISTS is_bestseller,
    DROP COLUMN IF EXISTS is_new,
    DROP COLUMN IF EXISTS has_variants,
    DROP COLUMN IF EXISTS has_addons,
    DROP COLUMN IF EXISTS tags;

ALTER TABLE menu_categories
    DROP COLUMN IF EXISTS name_jp,
    DROP COLUMN IF EXISTS is_featured;
