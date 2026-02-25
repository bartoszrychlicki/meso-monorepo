-- Migration: Create performance indexes on all tables

-- ============================================================================
-- users_locations
-- ============================================================================
CREATE INDEX idx_users_locations_type ON public.users_locations(type);
CREATE INDEX idx_users_locations_is_active ON public.users_locations(is_active);

-- ============================================================================
-- users_users
-- ============================================================================
CREATE INDEX idx_users_users_role ON public.users_users(role);
CREATE INDEX idx_users_users_location_id ON public.users_users(location_id);
CREATE INDEX idx_users_users_is_active ON public.users_users(is_active);
-- username and email already have UNIQUE indexes

-- ============================================================================
-- menu_categories
-- ============================================================================
CREATE INDEX idx_menu_categories_is_active ON public.menu_categories(is_active);
CREATE INDEX idx_menu_categories_sort_order ON public.menu_categories(sort_order);
-- slug already has a UNIQUE index

-- ============================================================================
-- menu_products
-- ============================================================================
CREATE INDEX idx_menu_products_category_id ON public.menu_products(category_id);
CREATE INDEX idx_menu_products_type ON public.menu_products(type);
CREATE INDEX idx_menu_products_is_available ON public.menu_products(is_available);
CREATE INDEX idx_menu_products_is_featured ON public.menu_products(is_featured);
CREATE INDEX idx_menu_products_is_active ON public.menu_products(is_active);
CREATE INDEX idx_menu_products_recipe_id ON public.menu_products(recipe_id);
CREATE INDEX idx_menu_products_sort_order ON public.menu_products(sort_order);
CREATE INDEX idx_menu_products_name ON public.menu_products(name);
-- slug and sku are UNIQUE via constraint

-- ============================================================================
-- menu_modifier_groups
-- ============================================================================
CREATE INDEX idx_menu_modifier_groups_type ON public.menu_modifier_groups(type);

-- ============================================================================
-- orders_orders
-- ============================================================================
CREATE INDEX idx_orders_orders_status ON public.orders_orders(status);
CREATE INDEX idx_orders_orders_channel ON public.orders_orders(channel);
CREATE INDEX idx_orders_orders_source ON public.orders_orders(source);
CREATE INDEX idx_orders_orders_location_id ON public.orders_orders(location_id);
CREATE INDEX idx_orders_orders_customer_id ON public.orders_orders(customer_id);
CREATE INDEX idx_orders_orders_payment_status ON public.orders_orders(payment_status);
CREATE INDEX idx_orders_orders_assigned_to ON public.orders_orders(assigned_to);
CREATE INDEX idx_orders_orders_created_at ON public.orders_orders(created_at);
-- order_number already has a UNIQUE index

-- ============================================================================
-- orders_kitchen_tickets
-- ============================================================================
CREATE INDEX idx_orders_kitchen_tickets_order_id ON public.orders_kitchen_tickets(order_id);
CREATE INDEX idx_orders_kitchen_tickets_location_id ON public.orders_kitchen_tickets(location_id);
CREATE INDEX idx_orders_kitchen_tickets_status ON public.orders_kitchen_tickets(status);
CREATE INDEX idx_orders_kitchen_tickets_priority ON public.orders_kitchen_tickets(priority);
CREATE INDEX idx_orders_kitchen_tickets_created_at ON public.orders_kitchen_tickets(created_at);

-- ============================================================================
-- crm_customers
-- ============================================================================
CREATE INDEX idx_crm_customers_email ON public.crm_customers(email);
CREATE INDEX idx_crm_customers_phone ON public.crm_customers(phone);
CREATE INDEX idx_crm_customers_loyalty_tier ON public.crm_customers(loyalty_tier);
CREATE INDEX idx_crm_customers_rfm_segment ON public.crm_customers(rfm_segment);
CREATE INDEX idx_crm_customers_is_active ON public.crm_customers(is_active);
CREATE INDEX idx_crm_customers_source ON public.crm_customers(source);
CREATE INDEX idx_crm_customers_last_name ON public.crm_customers(last_name);

-- ============================================================================
-- crm_loyalty_transactions
-- ============================================================================
CREATE INDEX idx_crm_loyalty_transactions_customer_id ON public.crm_loyalty_transactions(customer_id);
CREATE INDEX idx_crm_loyalty_transactions_reason ON public.crm_loyalty_transactions(reason);
CREATE INDEX idx_crm_loyalty_transactions_related_order_id ON public.crm_loyalty_transactions(related_order_id);
CREATE INDEX idx_crm_loyalty_transactions_created_at ON public.crm_loyalty_transactions(created_at);

-- ============================================================================
-- crm_coupons
-- ============================================================================
CREATE INDEX idx_crm_coupons_is_active ON public.crm_coupons(is_active);
CREATE INDEX idx_crm_coupons_valid_from ON public.crm_coupons(valid_from);
CREATE INDEX idx_crm_coupons_valid_until ON public.crm_coupons(valid_until);
CREATE INDEX idx_crm_coupons_discount_type ON public.crm_coupons(discount_type);
CREATE INDEX idx_crm_coupons_trigger_scenario ON public.crm_coupons(trigger_scenario);
-- code already has a UNIQUE index

-- ============================================================================
-- recipes_recipes
-- ============================================================================
CREATE INDEX idx_recipes_recipes_product_id ON public.recipes_recipes(product_id);
CREATE INDEX idx_recipes_recipes_product_category ON public.recipes_recipes(product_category);
CREATE INDEX idx_recipes_recipes_is_active ON public.recipes_recipes(is_active);
CREATE INDEX idx_recipes_recipes_name ON public.recipes_recipes(name);

-- ============================================================================
-- recipes_recipe_versions
-- ============================================================================
CREATE INDEX idx_recipes_recipe_versions_recipe_id ON public.recipes_recipe_versions(recipe_id);
CREATE INDEX idx_recipes_recipe_versions_version ON public.recipes_recipe_versions(version);

-- ============================================================================
-- recipes_ingredient_usage_logs
-- ============================================================================
CREATE INDEX idx_recipes_ingredient_usage_logs_recipe_id ON public.recipes_ingredient_usage_logs(recipe_id);
CREATE INDEX idx_recipes_ingredient_usage_logs_production_date ON public.recipes_ingredient_usage_logs(production_date);

-- ============================================================================
-- inventory_stock_items
-- ============================================================================
CREATE INDEX idx_inventory_stock_items_product_category ON public.inventory_stock_items(product_category);
CREATE INDEX idx_inventory_stock_items_is_active ON public.inventory_stock_items(is_active);
CREATE INDEX idx_inventory_stock_items_name ON public.inventory_stock_items(name);
-- sku already has a UNIQUE index

-- ============================================================================
-- employees_employees
-- ============================================================================
CREATE INDEX idx_employees_employees_role ON public.employees_employees(role);
CREATE INDEX idx_employees_employees_location_id ON public.employees_employees(location_id);
CREATE INDEX idx_employees_employees_is_active ON public.employees_employees(is_active);
CREATE INDEX idx_employees_employees_employment_type ON public.employees_employees(employment_type);
-- employee_code already has a UNIQUE index

-- ============================================================================
-- employees_work_times
-- ============================================================================
CREATE INDEX idx_employees_work_times_employee_id ON public.employees_work_times(employee_id);
CREATE INDEX idx_employees_work_times_location_id ON public.employees_work_times(location_id);
CREATE INDEX idx_employees_work_times_status ON public.employees_work_times(status);
CREATE INDEX idx_employees_work_times_clock_in ON public.employees_work_times(clock_in);

-- ============================================================================
-- integrations_api_keys
-- ============================================================================
CREATE INDEX idx_integrations_api_keys_is_active ON public.integrations_api_keys(is_active);
CREATE INDEX idx_integrations_api_keys_key_prefix ON public.integrations_api_keys(key_prefix);

-- ============================================================================
-- integrations_webhook_subscriptions
-- ============================================================================
CREATE INDEX idx_integrations_webhook_subscriptions_is_active ON public.integrations_webhook_subscriptions(is_active);
