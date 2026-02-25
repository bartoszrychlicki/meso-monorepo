-- Fix: change _by columns from UUID to TEXT (seed data uses 'system' string)

ALTER TABLE public.crm_loyalty_transactions ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.crm_coupons ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.recipes_recipes ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.recipes_recipes ALTER COLUMN last_updated_by TYPE TEXT;
ALTER TABLE public.recipes_recipe_versions ALTER COLUMN changed_by TYPE TEXT;
ALTER TABLE public.recipes_ingredient_usage_logs ALTER COLUMN produced_by TYPE TEXT;
ALTER TABLE public.integrations_api_keys ALTER COLUMN created_by TYPE TEXT;
