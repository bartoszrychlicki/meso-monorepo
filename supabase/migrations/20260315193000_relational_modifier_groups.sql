-- Relational modifier groups for products.
-- Adds explicit product <-> group and group <-> modifier junctions,
-- backfills current data, and exposes a shared read model for catalog reads.

-- ============================================================================
-- 1. CREATE JUNCTION TABLES
-- ============================================================================
CREATE TABLE public.modifier_group_modifiers (
  group_id UUID NOT NULL REFERENCES public.menu_modifier_groups(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES public.menu_modifiers(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, modifier_id)
);

CREATE TABLE public.product_modifier_groups (
  product_id UUID NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.menu_modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id)
);

CREATE INDEX idx_modifier_group_modifiers_group_id
  ON public.modifier_group_modifiers(group_id, sort_order);
CREATE INDEX idx_modifier_group_modifiers_modifier_id
  ON public.modifier_group_modifiers(modifier_id);
CREATE INDEX idx_product_modifier_groups_product_id
  ON public.product_modifier_groups(product_id, sort_order);
CREATE INDEX idx_product_modifier_groups_group_id
  ON public.product_modifier_groups(group_id);

ALTER TABLE public.modifier_group_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_modifier_group_modifiers"
  ON public.modifier_group_modifiers
  FOR SELECT
  USING (true);

CREATE POLICY "staff_manage_modifier_group_modifiers"
  ON public.modifier_group_modifiers
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "anon_read_product_modifier_groups"
  ON public.product_modifier_groups
  FOR SELECT
  USING (true);

CREATE POLICY "staff_manage_product_modifier_groups"
  ON public.product_modifier_groups
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ============================================================================
-- 2. BACKFILL GROUP DEFINITIONS FROM LEGACY JSON SNAPSHOTS
-- ============================================================================
INSERT INTO public.menu_modifier_groups (
  id,
  name,
  type,
  required,
  min_selections,
  max_selections,
  modifiers
)
SELECT DISTINCT ON ((group_json->>'id')::UUID)
  (group_json->>'id')::UUID AS id,
  COALESCE(NULLIF(group_json->>'name', ''), 'Dodatki') AS name,
  COALESCE(NULLIF(group_json->>'type', ''), 'multiple') AS type,
  COALESCE((group_json->>'required')::BOOLEAN, false) AS required,
  GREATEST(COALESCE((group_json->>'min_selections')::INTEGER, 0), 0) AS min_selections,
  GREATEST(COALESCE((group_json->>'max_selections')::INTEGER, 1), 0) AS max_selections,
  COALESCE(group_json->'modifiers', '[]'::JSONB) AS modifiers
FROM public.menu_products product_row,
     jsonb_array_elements(product_row.modifier_groups) WITH ORDINALITY AS group_entry(group_json, group_position)
WHERE jsonb_typeof(product_row.modifier_groups) = 'array'
  AND jsonb_typeof(group_json) = 'object'
  AND group_json ? 'id'
  AND NULLIF(group_json->>'id', '') IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modifier_group_modifiers (group_id, modifier_id, sort_order)
SELECT
  group_row.id AS group_id,
  (modifier_json->>'id')::UUID AS modifier_id,
  COALESCE((modifier_json->>'sort_order')::INTEGER, modifier_position - 1) AS sort_order
FROM public.menu_modifier_groups group_row,
     jsonb_array_elements(group_row.modifiers) WITH ORDINALITY AS modifier_entry(modifier_json, modifier_position)
WHERE jsonb_typeof(group_row.modifiers) = 'array'
  AND jsonb_typeof(modifier_json) = 'object'
  AND modifier_json ? 'id'
  AND EXISTS (
    SELECT 1
    FROM public.menu_modifiers standalone_modifier
    WHERE standalone_modifier.id = (modifier_json->>'id')::UUID
  )
ON CONFLICT (group_id, modifier_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order;

INSERT INTO public.product_modifier_groups (product_id, group_id, sort_order)
SELECT
  product_row.id AS product_id,
  (group_json->>'id')::UUID AS group_id,
  group_position - 1 AS sort_order
FROM public.menu_products product_row,
     jsonb_array_elements(product_row.modifier_groups) WITH ORDINALITY AS group_entry(group_json, group_position)
WHERE jsonb_typeof(product_row.modifier_groups) = 'array'
  AND jsonb_typeof(group_json) = 'object'
  AND group_json ? 'id'
  AND EXISTS (
    SELECT 1
    FROM public.menu_modifier_groups existing_group
    WHERE existing_group.id = (group_json->>'id')::UUID
  )
ON CONFLICT (product_id, group_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 3. FALLBACK FOR PRODUCTS THAT ONLY HAVE product_modifiers LINKS
-- ============================================================================
WITH missing_product_modifier_links AS (
  SELECT
    product_modifier.product_id,
    product_modifier.modifier_id,
    product_modifier.sort_order
  FROM public.product_modifiers product_modifier
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.product_modifier_groups product_group
    JOIN public.modifier_group_modifiers group_modifier
      ON group_modifier.group_id = product_group.group_id
    WHERE product_group.product_id = product_modifier.product_id
      AND group_modifier.modifier_id = product_modifier.modifier_id
  )
),
fallback_groups AS (
  SELECT
    missing_link.product_id,
    gen_random_uuid() AS group_id,
    COUNT(*) AS modifier_count
  FROM missing_product_modifier_links missing_link
  GROUP BY missing_link.product_id
),
inserted_fallback_groups AS (
  INSERT INTO public.menu_modifier_groups (
    id,
    name,
    type,
    required,
    min_selections,
    max_selections,
    modifiers
  )
  SELECT
    fallback_group.group_id,
    'Dodatki',
    'multiple',
    false,
    0,
    GREATEST(fallback_group.modifier_count, 1),
    '[]'::JSONB
  FROM fallback_groups fallback_group
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
INSERT INTO public.product_modifier_groups (product_id, group_id, sort_order)
SELECT
  fallback_group.product_id,
  fallback_group.group_id,
  COALESCE((
    SELECT MAX(existing_group.sort_order) + 1
    FROM public.product_modifier_groups existing_group
    WHERE existing_group.product_id = fallback_group.product_id
  ), 0) AS sort_order
FROM fallback_groups fallback_group
ON CONFLICT (product_id, group_id) DO NOTHING;

WITH missing_product_modifier_links AS (
  SELECT
    product_modifier.product_id,
    product_modifier.modifier_id,
    product_modifier.sort_order
  FROM public.product_modifiers product_modifier
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.product_modifier_groups product_group
    JOIN public.modifier_group_modifiers group_modifier
      ON group_modifier.group_id = product_group.group_id
    WHERE product_group.product_id = product_modifier.product_id
      AND group_modifier.modifier_id = product_modifier.modifier_id
  )
),
fallback_groups AS (
  SELECT
    product_group.product_id,
    product_group.group_id
  FROM public.product_modifier_groups product_group
  JOIN public.menu_modifier_groups modifier_group
    ON modifier_group.id = product_group.group_id
  WHERE modifier_group.name = 'Dodatki'
),
resolved_fallback_groups AS (
  SELECT DISTINCT ON (missing_link.product_id)
    missing_link.product_id,
    fallback_group.group_id
  FROM missing_product_modifier_links missing_link
  JOIN fallback_groups fallback_group
    ON fallback_group.product_id = missing_link.product_id
  ORDER BY missing_link.product_id, fallback_group.group_id DESC
)
INSERT INTO public.modifier_group_modifiers (group_id, modifier_id, sort_order)
SELECT
  fallback_group.group_id,
  missing_link.modifier_id,
  missing_link.sort_order
FROM missing_product_modifier_links missing_link
JOIN resolved_fallback_groups fallback_group
  ON fallback_group.product_id = missing_link.product_id
ON CONFLICT (group_id, modifier_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 4. SHARED READ MODEL
-- ============================================================================
CREATE OR REPLACE VIEW public.menu_products_catalog_v
WITH (security_invoker = true) AS
SELECT
  product_row.id,
  product_row.name,
  product_row.name_jp,
  product_row.slug,
  product_row.description,
  product_row.story,
  product_row.category_id,
  product_row.type,
  product_row.price,
  product_row.original_price,
  product_row.promo_label,
  product_row.promo_starts_at,
  product_row.promo_ends_at,
  product_row.image_url,
  product_row.images,
  product_row.calories,
  product_row.is_available,
  product_row.is_featured,
  product_row.is_vegetarian,
  product_row.is_vegan,
  product_row.is_gluten_free,
  product_row.is_signature,
  product_row.is_bestseller,
  product_row.is_new,
  product_row.has_variants,
  (COALESCE(jsonb_array_length(group_payloads.modifier_groups), 0) > 0) AS has_addons,
  product_row.allergens,
  product_row.nutritional_info,
  product_row.tags,
  product_row.variants,
  COALESCE(group_payloads.modifier_groups, '[]'::JSONB) AS modifier_groups,
  product_row.ingredients,
  product_row.recipe_id,
  product_row.prep_time_min,
  product_row.prep_time_max,
  product_row.preparation_time_minutes,
  product_row.sort_order,
  product_row.color,
  product_row.sku,
  product_row.tax_rate,
  product_row.is_active,
  product_row.point_ids,
  product_row.pricing,
  product_row.active_promotions,
  product_row.food_cost_percentage,
  product_row.created_at,
  product_row.updated_at
FROM public.menu_products product_row
LEFT JOIN LATERAL (
  SELECT jsonb_agg(group_json.group_payload ORDER BY group_json.group_sort_order) AS modifier_groups
  FROM (
    SELECT
      product_group.sort_order AS group_sort_order,
      jsonb_build_object(
        'id', modifier_group.id,
        'name', modifier_group.name,
        'type', modifier_group.type,
        'required', modifier_group.required,
        'min_selections', modifier_group.min_selections,
        'max_selections', modifier_group.max_selections,
        'created_at', modifier_group.created_at,
        'updated_at', modifier_group.updated_at,
        'modifiers', modifier_payloads.modifiers
      ) AS group_payload
    FROM public.product_modifier_groups product_group
    JOIN public.menu_modifier_groups modifier_group
      ON modifier_group.id = product_group.group_id
    JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', standalone_modifier.id,
          'name', standalone_modifier.name,
          'price', standalone_modifier.price,
          'is_available', standalone_modifier.is_available,
          'sort_order', group_modifier.sort_order,
          'modifier_action', standalone_modifier.modifier_action,
          'created_at', standalone_modifier.created_at,
          'updated_at', standalone_modifier.updated_at
        )
        ORDER BY group_modifier.sort_order, standalone_modifier.sort_order, standalone_modifier.name
      ) AS modifiers
      FROM public.modifier_group_modifiers group_modifier
      JOIN public.menu_modifiers standalone_modifier
        ON standalone_modifier.id = group_modifier.modifier_id
      WHERE group_modifier.group_id = modifier_group.id
        AND standalone_modifier.is_available = true
    ) AS modifier_payloads ON true
    WHERE product_group.product_id = product_row.id
      AND modifier_payloads.modifiers IS NOT NULL
      AND jsonb_array_length(modifier_payloads.modifiers) > 0
  ) AS group_json
) AS group_payloads ON true;

GRANT SELECT ON public.menu_products_catalog_v TO anon, authenticated, service_role;
