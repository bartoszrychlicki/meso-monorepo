-- Repair fallback-group backfill so products never reuse another product's
-- shared "Dodatki" group when rebuilding relational links from product_modifiers.

WITH legacy_snapshot_group_ids AS (
  SELECT DISTINCT (group_json->>'id')::UUID AS group_id
  FROM public.menu_products product_row,
       jsonb_array_elements(product_row.modifier_groups) AS group_entry(group_json)
  WHERE jsonb_typeof(product_row.modifier_groups) = 'array'
    AND jsonb_typeof(group_json) = 'object'
    AND group_json ? 'id'
    AND NULLIF(group_json->>'id', '') IS NOT NULL
),
legacy_group_modifiers AS (
  SELECT
    snapshot_group.group_id,
    (modifier_json->>'id')::UUID AS modifier_id,
    COALESCE((modifier_json->>'sort_order')::INTEGER, modifier_position - 1) AS sort_order
  FROM legacy_snapshot_group_ids snapshot_group
  JOIN public.menu_modifier_groups modifier_group
    ON modifier_group.id = snapshot_group.group_id,
       jsonb_array_elements(modifier_group.modifiers) WITH ORDINALITY
         AS modifier_entry(modifier_json, modifier_position)
  WHERE jsonb_typeof(modifier_group.modifiers) = 'array'
    AND jsonb_typeof(modifier_json) = 'object'
    AND modifier_json ? 'id'
    AND EXISTS (
      SELECT 1
      FROM public.menu_modifiers standalone_modifier
      WHERE standalone_modifier.id = (modifier_json->>'id')::UUID
    )
)
INSERT INTO public.modifier_group_modifiers (group_id, modifier_id, sort_order)
SELECT
  legacy_group_modifier.group_id,
  legacy_group_modifier.modifier_id,
  legacy_group_modifier.sort_order
FROM legacy_group_modifiers legacy_group_modifier
ON CONFLICT (group_id, modifier_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order;

WITH legacy_snapshot_group_ids AS (
  SELECT DISTINCT (group_json->>'id')::UUID AS group_id
  FROM public.menu_products product_row,
       jsonb_array_elements(product_row.modifier_groups) AS group_entry(group_json)
  WHERE jsonb_typeof(product_row.modifier_groups) = 'array'
    AND jsonb_typeof(group_json) = 'object'
    AND group_json ? 'id'
    AND NULLIF(group_json->>'id', '') IS NOT NULL
)
DELETE FROM public.modifier_group_modifiers group_modifier
USING legacy_snapshot_group_ids snapshot_group
WHERE group_modifier.group_id = snapshot_group.group_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.menu_modifier_groups modifier_group,
         jsonb_array_elements(modifier_group.modifiers) AS modifier_entry(modifier_json)
    WHERE modifier_group.id = group_modifier.group_id
      AND jsonb_typeof(modifier_group.modifiers) = 'array'
      AND jsonb_typeof(modifier_json) = 'object'
      AND modifier_json ? 'id'
      AND (modifier_json->>'id')::UUID = group_modifier.modifier_id
  );

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
),
linked_fallback_groups AS (
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
  ON CONFLICT (product_id, group_id) DO NOTHING
  RETURNING product_id, group_id
)
INSERT INTO public.modifier_group_modifiers (group_id, modifier_id, sort_order)
SELECT
  fallback_group.group_id,
  missing_link.modifier_id,
  missing_link.sort_order
FROM missing_product_modifier_links missing_link
JOIN fallback_groups fallback_group
  ON fallback_group.product_id = missing_link.product_id
ON CONFLICT (group_id, modifier_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order;
