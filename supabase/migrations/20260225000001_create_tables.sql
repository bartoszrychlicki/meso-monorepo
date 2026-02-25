-- Migration: Create all tables in public schema with prefixed names
-- All tables use: id UUID PK, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

-- ============================================================================
-- USERS MODULE
-- ============================================================================

CREATE TABLE public.users_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  address JSONB NOT NULL DEFAULT '{}',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.users_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  pin TEXT,
  location_id UUID REFERENCES public.users_locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- MENU MODULE
-- ============================================================================

CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES public.menu_categories(id),
  type TEXT NOT NULL DEFAULT 'single',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  images JSONB NOT NULL DEFAULT '[]',
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  nutritional_info JSONB,
  variants JSONB NOT NULL DEFAULT '[]',
  modifier_groups JSONB NOT NULL DEFAULT '[]',
  ingredients JSONB NOT NULL DEFAULT '[]',
  recipe_id UUID,
  preparation_time_minutes INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  sku TEXT NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  point_ids TEXT[] NOT NULL DEFAULT '{}',
  pricing JSONB NOT NULL DEFAULT '[]',
  active_promotions TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single',
  required BOOLEAN NOT NULL DEFAULT false,
  min_selections INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER NOT NULL DEFAULT 1,
  modifiers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ORDERS MODULE
-- ============================================================================

CREATE TABLE public.orders_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  channel TEXT NOT NULL DEFAULT 'pos',
  source TEXT NOT NULL DEFAULT 'takeaway',
  location_id UUID REFERENCES public.users_locations(id),
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address JSONB,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  status_history JSONB NOT NULL DEFAULT '[]',
  assigned_to UUID,
  estimated_ready_at TIMESTAMPTZ,
  external_order_id TEXT,
  external_channel TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orders_kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders_orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  location_id UUID REFERENCES public.users_locations(id),
  status TEXT NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_minutes INTEGER NOT NULL DEFAULT 15,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CRM MODULE
-- ============================================================================

CREATE TABLE public.crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  birth_date TEXT,
  registration_date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'pos_terminal',
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  loyalty_tier TEXT NOT NULL DEFAULT 'bronze',
  rfm_segment TEXT,
  rfm_recency_score INTEGER,
  rfm_frequency_score INTEGER,
  rfm_monetary_score INTEGER,
  rfm_last_calculated TEXT,
  addresses JSONB NOT NULL DEFAULT '[]',
  preferences JSONB NOT NULL DEFAULT '{}',
  order_history JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  related_order_id UUID,
  multiplier NUMERIC(3,2) NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  free_item_id UUID,
  max_usage INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  applicable_products TEXT[],
  minimum_order_value NUMERIC(10,2),
  customer_segment TEXT,
  trigger_scenario TEXT NOT NULL DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- RECIPES MODULE
-- ============================================================================

CREATE TABLE public.recipes_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  product_category TEXT NOT NULL DEFAULT 'finished_good',
  ingredients JSONB NOT NULL DEFAULT '[]',
  yield_quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  yield_unit TEXT NOT NULL DEFAULT 'szt',
  preparation_time_minutes INTEGER NOT NULL DEFAULT 0,
  instructions TEXT,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  total_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
  food_cost_percentage NUMERIC(5,2),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  last_updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes_recipe_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes_recipes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]',
  total_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
  changed_by UUID,
  change_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes_ingredient_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes_recipes(id) ON DELETE CASCADE,
  production_date TIMESTAMPTZ NOT NULL,
  quantity_produced NUMERIC(10,2) NOT NULL,
  ingredients_used JSONB NOT NULL DEFAULT '[]',
  total_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  produced_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INVENTORY MODULE
-- ============================================================================

CREATE TABLE public.inventory_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  product_category TEXT NOT NULL DEFAULT 'raw_material',
  unit TEXT NOT NULL,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  min_quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- EMPLOYEES MODULE
-- ============================================================================

CREATE TABLE public.employees_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  employee_code TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  role TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_rate NUMERIC(8,2),
  location_id UUID REFERENCES public.users_locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employees_work_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees_employees(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.users_locations(id),
  status TEXT NOT NULL DEFAULT 'clocked_in',
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  total_break_minutes INTEGER NOT NULL DEFAULT 0,
  total_work_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INTEGRATIONS MODULE
-- ============================================================================

CREATE TABLE public.integrations_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.integrations_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
