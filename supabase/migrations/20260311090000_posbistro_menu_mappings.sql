-- ============================================================================
-- Migration: POSBistro menu mapping storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integrations_posbistro_menu_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_type TEXT NOT NULL
    CHECK (mapping_type IN ('product', 'variant', 'modifier')),
  meso_product_id UUID REFERENCES public.menu_products(id) ON DELETE CASCADE,
  meso_variant_id UUID,
  meso_modifier_id UUID REFERENCES public.menu_modifiers(id) ON DELETE CASCADE,
  posbistro_product_type TEXT
    CHECK (posbistro_product_type IN ('SIMPLE', 'DELIVERY', 'PACKAGE', 'SET', 'PIZZA')),
  posbistro_variation_id UUID,
  posbistro_variation_sku INTEGER,
  posbistro_addon_id UUID,
  posbistro_addon_sku INTEGER,
  posbistro_name TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT posbistro_menu_mappings_entity_shape_check CHECK (
    (
      mapping_type = 'product'
      AND meso_product_id IS NOT NULL
      AND meso_variant_id IS NULL
      AND meso_modifier_id IS NULL
      AND (posbistro_variation_id IS NOT NULL OR posbistro_variation_sku IS NOT NULL)
      AND posbistro_addon_id IS NULL
      AND posbistro_addon_sku IS NULL
    )
    OR
    (
      mapping_type = 'variant'
      AND meso_product_id IS NOT NULL
      AND meso_variant_id IS NOT NULL
      AND meso_modifier_id IS NULL
      AND (posbistro_variation_id IS NOT NULL OR posbistro_variation_sku IS NOT NULL)
      AND posbistro_addon_id IS NULL
      AND posbistro_addon_sku IS NULL
    )
    OR
    (
      mapping_type = 'modifier'
      AND meso_product_id IS NULL
      AND meso_variant_id IS NULL
      AND meso_modifier_id IS NOT NULL
      AND posbistro_variation_id IS NULL
      AND posbistro_variation_sku IS NULL
      AND (posbistro_addon_id IS NOT NULL OR posbistro_addon_sku IS NOT NULL)
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posbistro_menu_mappings_product_unique
  ON public.integrations_posbistro_menu_mappings (meso_product_id)
  WHERE mapping_type = 'product';

CREATE UNIQUE INDEX IF NOT EXISTS idx_posbistro_menu_mappings_variant_unique
  ON public.integrations_posbistro_menu_mappings (meso_product_id, meso_variant_id)
  WHERE mapping_type = 'variant';

CREATE UNIQUE INDEX IF NOT EXISTS idx_posbistro_menu_mappings_modifier_unique
  ON public.integrations_posbistro_menu_mappings (meso_modifier_id)
  WHERE mapping_type = 'modifier';

CREATE INDEX IF NOT EXISTS idx_posbistro_menu_mappings_type_active
  ON public.integrations_posbistro_menu_mappings (mapping_type, is_active);

ALTER TABLE public.integrations_posbistro_menu_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_posbistro_menu_mappings" ON public.integrations_posbistro_menu_mappings;
CREATE POLICY "staff_all_posbistro_menu_mappings" ON public.integrations_posbistro_menu_mappings
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "service_role_posbistro_menu_mappings" ON public.integrations_posbistro_menu_mappings;
CREATE POLICY "service_role_posbistro_menu_mappings" ON public.integrations_posbistro_menu_mappings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_integrations_posbistro_menu_mappings_updated_at
  ON public.integrations_posbistro_menu_mappings;
CREATE TRIGGER update_integrations_posbistro_menu_mappings_updated_at
  BEFORE UPDATE ON public.integrations_posbistro_menu_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
