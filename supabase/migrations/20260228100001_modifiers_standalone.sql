-- Migration: Create standalone menu_modifiers and product_modifiers tables
-- Migrates modifier data from menu_products.modifier_groups JSONB and
-- menu_modifier_groups.modifiers JSONB into proper relational tables.

-- ============================================================================
-- 1. CREATE menu_modifiers TABLE
-- ============================================================================
CREATE TABLE public.menu_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  modifier_action TEXT NOT NULL DEFAULT 'add',
  recipe_id UUID,  -- nullable, no FK constraint for now
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CREATE product_modifiers JUNCTION TABLE
-- ============================================================================
CREATE TABLE public.product_modifiers (
  product_id UUID NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES public.menu_modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, modifier_id)
);

-- ============================================================================
-- 3. ENABLE RLS WITH PERMISSIVE POLICIES
-- ============================================================================
ALTER TABLE public.menu_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to menu_modifiers"
  ON public.menu_modifiers FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to product_modifiers"
  ON public.product_modifiers FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. MIGRATE EXISTING JSONB DATA
--    Extract unique modifiers from menu_modifier_groups.modifiers JSONB,
--    preserving original UUIDs. Then link them to products via product_modifiers.
-- ============================================================================

-- 4a. Insert unique modifiers from menu_modifier_groups table
--     The modifiers JSONB array contains objects with: id, name, price,
--     is_available, sort_order, modifier_action
INSERT INTO public.menu_modifiers (id, name, price, modifier_action, is_available, sort_order)
SELECT DISTINCT ON ((mod->>'id')::UUID)
  (mod->>'id')::UUID AS id,
  mod->>'name' AS name,
  (mod->>'price')::NUMERIC(10,2) AS price,
  COALESCE(mod->>'modifier_action', 'add') AS modifier_action,
  COALESCE((mod->>'is_available')::BOOLEAN, true) AS is_available,
  COALESCE((mod->>'sort_order')::INTEGER, 0) AS sort_order
FROM public.menu_modifier_groups mg,
     jsonb_array_elements(mg.modifiers) AS mod
WHERE jsonb_array_length(mg.modifiers) > 0
ON CONFLICT (id) DO NOTHING;

-- 4b. Create product_modifiers links by extracting modifier IDs from
--     menu_products.modifier_groups JSONB (array of groups, each with modifiers array)
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT DISTINCT
  p.id AS product_id,
  (mod->>'id')::UUID AS modifier_id
FROM public.menu_products p,
     jsonb_array_elements(p.modifier_groups) AS grp,
     jsonb_array_elements(grp->'modifiers') AS mod
WHERE jsonb_array_length(p.modifier_groups) > 0
  AND (mod->>'id')::UUID IN (SELECT mm.id FROM public.menu_modifiers mm)
ON CONFLICT (product_id, modifier_id) DO NOTHING;

-- ============================================================================
-- 5. CREATE INDEXES
-- ============================================================================
CREATE INDEX idx_menu_modifiers_name ON public.menu_modifiers(name);
CREATE INDEX idx_menu_modifiers_is_available ON public.menu_modifiers(is_available);
CREATE INDEX idx_product_modifiers_product_id ON public.product_modifiers(product_id);
CREATE INDEX idx_product_modifiers_modifier_id ON public.product_modifiers(modifier_id);

-- ============================================================================
-- 6. CREATE updated_at TRIGGER
-- ============================================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.menu_modifiers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
