-- Repair stored recipe ingredient units when they no longer match the
-- referenced sub-recipe yield unit.
--
-- Why:
-- Some existing parent recipes reference semi-finished child recipes with an
-- incompatible unit (for example parent ingredient unit = 'szt' while child
-- yield_unit = 'kg'). The UI already renders the child yield unit, so the
-- hidden stale value can block recipe save and closure recalculation.

WITH repaired AS (
  SELECT
    parent.id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN child.id IS NOT NULL
            AND (
              NULLIF(BTRIM(COALESCE(x.elem->>'unit', '')), '') IS NULL
              OR NOT (
                LOWER(x.elem->>'unit') = LOWER(child.yield_unit)
                OR (
                  LOWER(x.elem->>'unit') IN ('kg', 'g', 'dag', 'mg')
                  AND LOWER(child.yield_unit) IN ('kg', 'g', 'dag', 'mg')
                )
                OR (
                  LOWER(x.elem->>'unit') IN ('l', 'dl', 'ml')
                  AND LOWER(child.yield_unit) IN ('l', 'dl', 'ml')
                )
              )
            )
          THEN jsonb_set(x.elem, '{unit}', to_jsonb(child.yield_unit), true)
          ELSE x.elem
        END
        ORDER BY x.ord
      ),
      '[]'::jsonb
    ) AS ingredients_fixed
  FROM public.recipes_recipes parent
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(parent.ingredients, '[]'::jsonb))
    WITH ORDINALITY AS x(elem, ord)
    ON TRUE
  LEFT JOIN public.recipes_recipes child
    ON child.id::text = COALESCE(
      NULLIF(x.elem->>'reference_id', ''),
      NULLIF(x.elem->>'recipe_id', ''),
      NULLIF(x.elem->>'semi_finished_id', '')
    )
    AND COALESCE(x.elem->>'type', 'recipe') = 'recipe'
  GROUP BY parent.id
)
UPDATE public.recipes_recipes parent
SET ingredients = repaired.ingredients_fixed
FROM repaired
WHERE parent.id = repaired.id
  AND parent.ingredients IS DISTINCT FROM repaired.ingredients_fixed;
