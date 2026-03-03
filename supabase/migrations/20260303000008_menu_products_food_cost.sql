-- Persist FC% at menu product level.
-- FC% depends on selling price, so it belongs to menu_products, not recipes_recipes.
ALTER TABLE public.menu_products
  ADD COLUMN IF NOT EXISTS food_cost_percentage NUMERIC(5,2);
