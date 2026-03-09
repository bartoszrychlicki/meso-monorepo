-- Allow large food cost snapshots without failing menu/recipe updates.
ALTER TABLE public.menu_products
  ALTER COLUMN food_cost_percentage TYPE NUMERIC(10,2);

ALTER TABLE public.recipes_recipes
  ALTER COLUMN food_cost_percentage TYPE NUMERIC(10,2);
