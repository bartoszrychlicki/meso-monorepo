-- ============================================================================
-- Loyalty coupon lifecycle hardening + persisted order loyalty fields
-- ============================================================================

ALTER TABLE public.crm_customer_coupons
  DROP CONSTRAINT IF EXISTS crm_customer_coupons_status_check;

ALTER TABLE public.crm_customer_coupons
  ADD CONSTRAINT crm_customer_coupons_status_check
  CHECK (status IN ('active', 'used', 'expired', 'cancelled'));

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
        paid_at,
        loyalty_points_earned,
        loyalty_points_used
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
        NULLIF(p_order ->> 'paid_at', '')::TIMESTAMPTZ,
        COALESCE(NULLIF(p_order ->> 'loyalty_points_earned', '')::INTEGER, 0),
        COALESCE(NULLIF(p_order ->> 'loyalty_points_used', '')::INTEGER, 0)
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
