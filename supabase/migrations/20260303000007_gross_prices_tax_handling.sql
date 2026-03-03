-- ============================================================================
-- Migration: Gross prices tax handling for order item replacement
-- - Menu prices are treated as gross prices
-- - VAT is informational (included in subtotal), not added on top to total
-- ============================================================================

CREATE OR REPLACE FUNCTION public.replace_order_items(
    p_order_id UUID,
    p_items JSONB,
    p_order_items JSONB,
    p_discount NUMERIC DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT NULL,
    p_tip NUMERIC DEFAULT NULL
)
RETURNS public.orders_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders_orders%ROWTYPE;
    v_item JSONB;
    v_subtotal NUMERIC := 0;
    v_tax NUMERIC := 0;
    v_discount NUMERIC := 0;
    v_delivery_fee NUMERIC := 0;
    v_tip NUMERIC := 0;
    v_total NUMERIC := 0;
BEGIN
    SELECT * INTO v_order
    FROM public.orders_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.orders_order_items
    WHERE order_id = p_order_id;

    FOR v_item IN
        SELECT value FROM jsonb_array_elements(COALESCE(p_order_items, '[]'::JSONB))
    LOOP
        INSERT INTO public.orders_order_items (
            id,
            order_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            spice_level,
            variant_name,
            addons,
            notes
        )
        VALUES (
            COALESCE(NULLIF(v_item ->> 'id', '')::UUID, gen_random_uuid()),
            p_order_id,
            NULLIF(v_item ->> 'product_id', '')::UUID,
            COALESCE(NULLIF(v_item ->> 'quantity', '')::INTEGER, 1),
            COALESCE(NULLIF(v_item ->> 'unit_price', '')::NUMERIC, 0),
            COALESCE(NULLIF(v_item ->> 'total_price', '')::NUMERIC, 0),
            NULLIF(v_item ->> 'spice_level', '')::INTEGER,
            NULLIF(v_item ->> 'variant_name', ''),
            COALESCE(v_item -> 'addons', '[]'::JSONB),
            NULLIF(v_item ->> 'notes', '')
        );
    END LOOP;

    SELECT COALESCE(SUM(COALESCE(NULLIF(value ->> 'subtotal', '')::NUMERIC, 0)), 0)
      INTO v_subtotal
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB));

    v_subtotal := round(v_subtotal, 2);
    -- Gross prices: VAT is included in subtotal and should not be added to total.
    v_tax := round(v_subtotal - (v_subtotal / 1.08), 2);
    v_discount := COALESCE(p_discount, v_order.discount, 0);
    v_delivery_fee := COALESCE(p_delivery_fee, v_order.delivery_fee, 0);
    v_tip := COALESCE(p_tip, v_order.tip, 0);
    v_total := round(v_subtotal - v_discount + v_delivery_fee + v_tip, 2);

    UPDATE public.orders_orders
    SET
        items = COALESCE(p_items, '[]'::JSONB),
        subtotal = v_subtotal,
        tax = v_tax,
        discount = v_discount,
        delivery_fee = v_delivery_fee,
        tip = v_tip,
        total = v_total,
        updated_at = now()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    RETURN v_order;
END;
$$;
