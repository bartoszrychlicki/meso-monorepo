-- ============================================================================
-- Migration: Extend menu schema for Delivery app support
-- Part of: Meso Delivery → MesoPOS integration
-- Adds Japanese names, dietary flags, spice info, product badges, and tags
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extend menu_categories with delivery-specific fields
-- --------------------------------------------------------------------------
ALTER TABLE menu_categories
    ADD COLUMN IF NOT EXISTS name_jp TEXT,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_menu_categories_is_featured ON menu_categories(is_featured) WHERE is_featured = true;

-- --------------------------------------------------------------------------
-- 2. Extend menu_products with delivery-specific fields
-- --------------------------------------------------------------------------

-- Japanese name & story (marketing copy)
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS name_jp TEXT,
    ADD COLUMN IF NOT EXISTS story TEXT;

-- Pricing: original price for showing discounts (e.g. "was 42.90, now 36.90")
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);

-- Prep time range (Delivery uses min/max, POS has single preparation_time_minutes)
-- We keep POS's preparation_time_minutes AND add these for delivery display
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS prep_time_min INTEGER,
    ADD COLUMN IF NOT EXISTS prep_time_max INTEGER;

-- Calories (Delivery stores as integer; POS has nutritional_info JSONB which could also hold this)
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS calories INTEGER;

-- Dietary flags
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN NOT NULL DEFAULT false;

-- Spice info
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS is_spicy BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS spice_level INTEGER CHECK (spice_level IS NULL OR spice_level BETWEEN 1 AND 3),
    ADD COLUMN IF NOT EXISTS has_spice_level BOOLEAN NOT NULL DEFAULT false;

-- Product badges
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS is_signature BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT false;

-- Convenience flags for frontend (product has variants/addons in JSONB?)
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS has_variants BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_addons BOOLEAN NOT NULL DEFAULT false;

-- Tags for filtering/search
ALTER TABLE menu_products
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- --------------------------------------------------------------------------
-- 3. Indexes for new columns
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_menu_products_is_bestseller ON menu_products(is_bestseller) WHERE is_bestseller = true;
CREATE INDEX IF NOT EXISTS idx_menu_products_is_signature ON menu_products(is_signature) WHERE is_signature = true;
CREATE INDEX IF NOT EXISTS idx_menu_products_is_new ON menu_products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_menu_products_is_spicy ON menu_products(is_spicy) WHERE is_spicy = true;
CREATE INDEX IF NOT EXISTS idx_menu_products_dietary ON menu_products(is_vegetarian, is_vegan, is_gluten_free);
CREATE INDEX IF NOT EXISTS idx_menu_products_tags ON menu_products USING GIN(tags);
