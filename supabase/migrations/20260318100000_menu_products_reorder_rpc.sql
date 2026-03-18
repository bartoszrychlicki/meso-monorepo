CREATE OR REPLACE FUNCTION public.reorder_menu_products(
    p_category_id UUID,
    p_product_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_category_count INTEGER;
    v_payload_count INTEGER;
    v_distinct_count INTEGER;
BEGIN
    v_payload_count := COALESCE(array_length(p_product_ids, 1), 0);

    IF p_category_id IS NULL THEN
        RAISE EXCEPTION 'Category id is required' USING ERRCODE = 'P0001';
    END IF;

    IF v_payload_count = 0 THEN
        RAISE EXCEPTION 'Product ids are required' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(DISTINCT product_id)
      INTO v_distinct_count
    FROM unnest(p_product_ids) AS product_id;

    IF v_distinct_count <> v_payload_count THEN
        RAISE EXCEPTION 'Product ids must be unique' USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1
    FROM public.menu_products
    WHERE category_id = p_category_id
    FOR UPDATE;

    SELECT COUNT(*)
      INTO v_category_count
    FROM public.menu_products
    WHERE category_id = p_category_id;

    IF v_category_count <> v_payload_count THEN
        RAISE EXCEPTION 'Product ids must include every product in the category' USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(p_product_ids) AS product_id
        LEFT JOIN public.menu_products mp
          ON mp.id = product_id
        WHERE mp.id IS NULL
           OR mp.category_id <> p_category_id
    ) THEN
        RAISE EXCEPTION 'Every product must belong to the provided category' USING ERRCODE = 'P0001';
    END IF;

    WITH ordered AS (
        SELECT product_id, ordinality - 1 AS next_sort_order
        FROM unnest(p_product_ids) WITH ORDINALITY AS t(product_id, ordinality)
    )
    UPDATE public.menu_products mp
    SET
        sort_order = ordered.next_sort_order,
        updated_at = now()
    FROM ordered
    WHERE mp.id = ordered.product_id;
END;
$$;
