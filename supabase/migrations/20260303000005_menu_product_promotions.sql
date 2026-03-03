-- ============================================================================
-- Migration: Add POS product-level promotion metadata
-- Part of: MENU-006 (promotions on menu items in POS)
-- ============================================================================

ALTER TABLE public.menu_products
  ADD COLUMN IF NOT EXISTS promo_label TEXT,
  ADD COLUMN IF NOT EXISTS promo_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_ends_at TIMESTAMPTZ;

ALTER TABLE public.menu_products
  DROP CONSTRAINT IF EXISTS menu_products_promo_window_check;

ALTER TABLE public.menu_products
  ADD CONSTRAINT menu_products_promo_window_check
  CHECK (
    promo_starts_at IS NULL
    OR promo_ends_at IS NULL
    OR promo_ends_at >= promo_starts_at
  );

ALTER TABLE public.menu_products
  DROP CONSTRAINT IF EXISTS menu_products_original_price_nonnegative_check;

ALTER TABLE public.menu_products
  ADD CONSTRAINT menu_products_original_price_nonnegative_check
  CHECK (original_price IS NULL OR original_price >= 0);

ALTER TABLE public.menu_products
  DROP CONSTRAINT IF EXISTS menu_products_promo_label_not_blank_check;

ALTER TABLE public.menu_products
  ADD CONSTRAINT menu_products_promo_label_not_blank_check
  CHECK (
    promo_label IS NULL
    OR char_length(btrim(promo_label)) > 0
  );

CREATE INDEX IF NOT EXISTS idx_menu_products_promo_window
  ON public.menu_products (promo_starts_at, promo_ends_at)
  WHERE promo_starts_at IS NOT NULL OR promo_ends_at IS NOT NULL;
