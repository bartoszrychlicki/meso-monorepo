ALTER TABLE public.menu_products
  ADD COLUMN IF NOT EXISTS is_hidden_in_menu BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_menu_products_is_hidden_in_menu
  ON public.menu_products(is_hidden_in_menu);

DROP VIEW IF EXISTS public.menu_products_catalog_v;

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
  product_row.is_hidden_in_menu,
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
