-- ============================================================================
-- Migration: Normalize legacy recipe ingredient JSON shape
--
-- Goal:
--   Convert historical ingredients stored as:
--     - stock_item_id
--     - recipe_id / semi_finished_id
--   into canonical shape expected by current app code:
--     - type ('stock_item' | 'recipe')
--     - reference_id
--     - reference_name (optional)
--     - quantity
--     - unit
--     - notes (optional)
--
-- Notes:
--   - Keeps array order.
--   - Leaves unknown/unmappable ingredient objects unchanged (no data loss).
-- ============================================================================

WITH normalized AS (
  SELECT
    r.id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN mapped_type IS NULL OR mapped_reference_id IS NULL THEN elem
          ELSE jsonb_strip_nulls(
            jsonb_build_object(
              'type', mapped_type,
              'reference_id', mapped_reference_id,
              'reference_name', mapped_reference_name,
              'quantity', mapped_quantity,
              'unit', mapped_unit,
              'notes', NULLIF(elem->>'notes', '')
            )
          )
        END
        ORDER BY ord
      ),
      '[]'::jsonb
    ) AS ingredients_normalized
  FROM public.recipes_recipes r
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(r.ingredients, '[]'::jsonb)) WITH ORDINALITY AS x(elem, ord)
    ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      CASE
        WHEN COALESCE(x.elem->>'type', '') IN ('stock_item', 'recipe') THEN x.elem->>'type'
        WHEN x.elem ? 'stock_item_id' THEN 'stock_item'
        WHEN x.elem ? 'recipe_id' OR x.elem ? 'semi_finished_id' THEN 'recipe'
        ELSE NULL
      END AS mapped_type,
      NULLIF(
        COALESCE(
          x.elem->>'reference_id',
          x.elem->>'stock_item_id',
          x.elem->>'recipe_id',
          x.elem->>'semi_finished_id'
        ),
        ''
      ) AS mapped_reference_id,
      NULLIF(
        COALESCE(
          x.elem->>'reference_name',
          x.elem->>'stock_item_name',
          x.elem->>'recipe_name',
          x.elem->>'semi_finished_name'
        ),
        ''
      ) AS mapped_reference_name,
      CASE
        WHEN jsonb_typeof(x.elem->'quantity') = 'number' THEN x.elem->'quantity'
        WHEN COALESCE(x.elem->>'quantity', '') ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN to_jsonb((x.elem->>'quantity')::numeric)
        ELSE to_jsonb(1)
      END AS mapped_quantity,
      to_jsonb(COALESCE(NULLIF(x.elem->>'unit', ''), 'szt')) AS mapped_unit
  ) mapped ON TRUE
  GROUP BY r.id
)
UPDATE public.recipes_recipes r
SET ingredients = n.ingredients_normalized
FROM normalized n
WHERE r.id = n.id
  AND r.ingredients IS DISTINCT FROM n.ingredients_normalized;
