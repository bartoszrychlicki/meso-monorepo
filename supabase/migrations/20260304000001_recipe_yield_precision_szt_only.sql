-- Increase yield_quantity precision from NUMERIC(10,2) to NUMERIC(10,4)
-- and standardize yield_unit to 'szt' (pieces only)

ALTER TABLE public.recipes_recipes
  ALTER COLUMN yield_quantity TYPE NUMERIC(10,4);

UPDATE public.recipes_recipes
  SET yield_unit = 'szt'
  WHERE yield_unit != 'szt';
