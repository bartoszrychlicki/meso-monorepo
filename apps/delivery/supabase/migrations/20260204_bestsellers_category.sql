-- Migration: Add Bestsellers Category
-- Description: Add is_featured flag to categories and create Bestsellery category

-- 1. Add is_featured column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 2. Create or update the Bestsellery category
INSERT INTO categories (id, name, name_jp, slug, icon, description, sort_order, is_active, is_featured)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Bestsellery',
  'ベストセラー',
  'bestsellery',
  '🔥',
  'Nasze najpopularniejsze dania, wybierane przez klientów',
  -100,  -- Negative sort_order to always show first
  true,
  true   -- Mark as featured
)
ON CONFLICT (slug) DO UPDATE SET
  is_featured = true,
  sort_order = -100,
  icon = '🔥';

-- 3. Create a view or virtual category approach:
-- Since products with is_bestseller=true belong to their original categories,
-- we'll handle this in the frontend by showing bestseller products in the Bestsellery category
-- without changing their category_id (to keep them in original categories too)

-- Note: The frontend will need to:
-- 1. Show categories with is_featured=true first
-- 2. When Bestsellery is selected, show products where is_bestseller=true
