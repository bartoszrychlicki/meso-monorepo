-- ============================================================================
-- Migration: Orders reliability hardening
-- - Enforce idempotency for external integrations
-- - Generate order numbers atomically
-- - Keep orders_orders and orders_order_items writes transactional
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Strong idempotency key for external integrations
-- --------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_orders_external_order_id_unique
    ON public.orders_orders(external_order_id)
    WHERE external_order_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 2. Atomic order number generator (race-safe)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders_order_number_counters (
    counter_date DATE NOT NULL,
    prefix TEXT NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (counter_date, prefix)
);

CREATE OR REPLACE FUNCTION public.next_order_number(p_channel TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_today DATE := CURRENT_DATE;
    v_next INTEGER;
BEGIN
    v_prefix := CASE
        WHEN p_channel = 'delivery_app' THEN 'WEB'
        ELSE 'ZAM'
    END;

    INSERT INTO public.orders_order_number_counters (counter_date, prefix, last_number, updated_at)
    VALUES (v_today, v_prefix, 1, now())
    ON CONFLICT (counter_date, prefix)
    DO UPDATE SET
        last_number = public.orders_order_number_counters.last_number + 1,
        updated_at = now()
    RETURNING last_number INTO v_next;

    RETURN format('%s-%s-%s', v_prefix, to_char(v_today, 'YYYYMMDD'), lpad(v_next::TEXT, 3, '0'));
END;
$$;

-- --------------------------------------------------------------------------
-- 3. Transactional create: order + relational items (+ optional kitchen ticket)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_items(
    p_order JSONB,
    p_order_items JSONB,
    p_kitchen_ticket JSONB DEFAULT NULL
)
RETURNS public.orders_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders_orders%ROWTYPE;
    v_item JSONB;
BEGIN
    INSERT INTO public.orders_orders (
        order_number,
        status,
        channel,
        source,
        location_id,
        customer_id,
        customer_name,
        customer_phone,
        delivery_address,
        items,
        subtotal,
        tax,
        discount,
        delivery_fee,
        tip,
        total,
        payment_method,
        payment_status,
        notes,
        status_history,
        external_order_id,
        external_channel,
        metadata,
        promo_code,
        delivery_type,
        scheduled_time,
        confirmed_at,
        paid_at
    )
    VALUES (
        p_order ->> 'order_number',
        COALESCE(NULLIF(p_order ->> 'status', ''), 'pending'),
        COALESCE(NULLIF(p_order ->> 'channel', ''), 'pos'),
        COALESCE(NULLIF(p_order ->> 'source', ''), 'takeaway'),
        NULLIF(p_order ->> 'location_id', '')::UUID,
        NULLIF(p_order ->> 'customer_id', '')::UUID,
        NULLIF(p_order ->> 'customer_name', ''),
        NULLIF(p_order ->> 'customer_phone', ''),
        p_order -> 'delivery_address',
        COALESCE(p_order -> 'items', '[]'::JSONB),
        COALESCE(NULLIF(p_order ->> 'subtotal', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_order ->> 'tax', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_order ->> 'discount', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_order ->> 'delivery_fee', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_order ->> 'tip', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_order ->> 'total', '')::NUMERIC, 0),
        NULLIF(p_order ->> 'payment_method', ''),
        COALESCE(NULLIF(p_order ->> 'payment_status', ''), 'pending'),
        NULLIF(p_order ->> 'notes', ''),
        COALESCE(p_order -> 'status_history', '[]'::JSONB),
        NULLIF(p_order ->> 'external_order_id', ''),
        NULLIF(p_order ->> 'external_channel', ''),
        p_order -> 'metadata',
        NULLIF(p_order ->> 'promo_code', ''),
        NULLIF(p_order ->> 'delivery_type', ''),
        NULLIF(p_order ->> 'scheduled_time', '')::TIMESTAMPTZ,
        NULLIF(p_order ->> 'confirmed_at', '')::TIMESTAMPTZ,
        NULLIF(p_order ->> 'paid_at', '')::TIMESTAMPTZ
    )
    RETURNING * INTO v_order;

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
            v_order.id,
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

    IF p_kitchen_ticket IS NOT NULL THEN
        INSERT INTO public.orders_kitchen_tickets (
            order_id,
            order_number,
            location_id,
            status,
            items,
            priority,
            estimated_minutes,
            notes
        )
        VALUES (
            v_order.id,
            COALESCE(NULLIF(p_kitchen_ticket ->> 'order_number', ''), v_order.order_number),
            COALESCE(NULLIF(p_kitchen_ticket ->> 'location_id', '')::UUID, v_order.location_id),
            COALESCE(NULLIF(p_kitchen_ticket ->> 'status', ''), 'pending'),
            COALESCE(p_kitchen_ticket -> 'items', '[]'::JSONB),
            COALESCE(NULLIF(p_kitchen_ticket ->> 'priority', '')::INTEGER, 0),
            COALESCE(NULLIF(p_kitchen_ticket ->> 'estimated_minutes', '')::INTEGER, 15),
            NULLIF(p_kitchen_ticket ->> 'notes', '')
        );
    END IF;

    RETURN v_order;
END;
$$;

-- --------------------------------------------------------------------------
-- 4. Transactional replace for items + totals sync
-- --------------------------------------------------------------------------
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
    v_tax := round(v_subtotal * 0.08, 2);
    v_discount := COALESCE(p_discount, v_order.discount, 0);
    v_delivery_fee := COALESCE(p_delivery_fee, v_order.delivery_fee, 0);
    v_tip := COALESCE(p_tip, v_order.tip, 0);
    v_total := round(v_subtotal + v_tax - v_discount + v_delivery_fee + v_tip, 2);

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
