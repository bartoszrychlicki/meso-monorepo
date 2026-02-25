-- Migration: Enable RLS and create permissive allow-all policies on all tables

-- ============================================================================
-- users_locations
-- ============================================================================
ALTER TABLE public.users_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to users_locations"
  ON public.users_locations FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- users_users
-- ============================================================================
ALTER TABLE public.users_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to users_users"
  ON public.users_users FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- menu_categories
-- ============================================================================
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to menu_categories"
  ON public.menu_categories FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- menu_products
-- ============================================================================
ALTER TABLE public.menu_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to menu_products"
  ON public.menu_products FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- menu_modifier_groups
-- ============================================================================
ALTER TABLE public.menu_modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to menu_modifier_groups"
  ON public.menu_modifier_groups FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- orders_orders
-- ============================================================================
ALTER TABLE public.orders_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to orders_orders"
  ON public.orders_orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- orders_kitchen_tickets
-- ============================================================================
ALTER TABLE public.orders_kitchen_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to orders_kitchen_tickets"
  ON public.orders_kitchen_tickets FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- crm_customers
-- ============================================================================
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to crm_customers"
  ON public.crm_customers FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- crm_loyalty_transactions
-- ============================================================================
ALTER TABLE public.crm_loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to crm_loyalty_transactions"
  ON public.crm_loyalty_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- crm_coupons
-- ============================================================================
ALTER TABLE public.crm_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to crm_coupons"
  ON public.crm_coupons FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- recipes_recipes
-- ============================================================================
ALTER TABLE public.recipes_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recipes_recipes"
  ON public.recipes_recipes FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- recipes_recipe_versions
-- ============================================================================
ALTER TABLE public.recipes_recipe_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recipes_recipe_versions"
  ON public.recipes_recipe_versions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- recipes_ingredient_usage_logs
-- ============================================================================
ALTER TABLE public.recipes_ingredient_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recipes_ingredient_usage_logs"
  ON public.recipes_ingredient_usage_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- inventory_stock_items
-- ============================================================================
ALTER TABLE public.inventory_stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_stock_items"
  ON public.inventory_stock_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- employees_employees
-- ============================================================================
ALTER TABLE public.employees_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employees_employees"
  ON public.employees_employees FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- employees_work_times
-- ============================================================================
ALTER TABLE public.employees_work_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employees_work_times"
  ON public.employees_work_times FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- integrations_api_keys
-- ============================================================================
ALTER TABLE public.integrations_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to integrations_api_keys"
  ON public.integrations_api_keys FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- integrations_webhook_subscriptions
-- ============================================================================
ALTER TABLE public.integrations_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to integrations_webhook_subscriptions"
  ON public.integrations_webhook_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);
