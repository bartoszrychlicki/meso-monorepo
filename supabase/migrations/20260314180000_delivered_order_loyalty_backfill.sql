-- ============================================================================
-- Delivered order loyalty awarding hardening
-- - makes delivered-order loyalty awarding a DB responsibility
-- - backfills historical delivered orders missing loyalty transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_delivered_order_loyalty_points(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders_orders%ROWTYPE;
    v_customer public.crm_customers%ROWTYPE;
    v_order_history JSONB;
    v_points INTEGER;
    v_reason TEXT;
    v_delivered_at TIMESTAMPTZ;
    v_existing_first_order_date TIMESTAMPTZ;
    v_existing_last_order_date TIMESTAMPTZ;
    v_first_order_date TIMESTAMPTZ;
    v_last_order_date TIMESTAMPTZ;
    v_total_orders INTEGER;
    v_total_spent NUMERIC(12,2);
    v_average_order_value NUMERIC(12,2);
    v_next_loyalty_points INTEGER;
    v_next_lifetime_points INTEGER;
    v_next_tier TEXT;
BEGIN
    SELECT *
    INTO v_order
    FROM public.orders_orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_order.status <> 'delivered'
        OR v_order.customer_id IS NULL
        OR COALESCE(v_order.loyalty_points_earned, 0) <= 0 THEN
        RETURN FALSE;
    END IF;

    SELECT *
    INTO v_customer
    FROM public.crm_customers
    WHERE id = v_order.customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.crm_loyalty_transactions
        WHERE related_order_id = v_order.id
          AND reason IN ('purchase', 'first_order')
    ) THEN
        RETURN FALSE;
    END IF;

    v_points := COALESCE(v_order.loyalty_points_earned, 0);
    v_reason := CASE
        WHEN v_points > FLOOR(COALESCE(v_order.total, 0)) THEN 'first_order'
        ELSE 'purchase'
    END;

    v_order_history := COALESCE(v_customer.order_history, '{}'::JSONB);
    v_delivered_at := COALESCE(v_order.delivered_at, v_order.updated_at, NOW());
    v_existing_first_order_date := NULLIF(v_order_history ->> 'first_order_date', '')::TIMESTAMPTZ;
    v_existing_last_order_date := NULLIF(v_order_history ->> 'last_order_date', '')::TIMESTAMPTZ;
    v_first_order_date := COALESCE(
        LEAST(v_existing_first_order_date, COALESCE(v_order.created_at, v_delivered_at)),
        v_existing_first_order_date,
        v_order.created_at,
        v_delivered_at
    );
    v_last_order_date := COALESCE(
        GREATEST(v_existing_last_order_date, v_delivered_at),
        v_existing_last_order_date,
        v_delivered_at
    );
    v_total_orders := COALESCE(NULLIF(v_order_history ->> 'total_orders', '')::INTEGER, 0) + 1;
    v_total_spent := COALESCE(NULLIF(v_order_history ->> 'total_spent', '')::NUMERIC, 0) + COALESCE(v_order.total, 0);
    v_average_order_value := CASE
        WHEN v_total_orders > 0 THEN ROUND(v_total_spent / v_total_orders::NUMERIC, 2)
        ELSE 0
    END;

    v_next_loyalty_points := COALESCE(v_customer.loyalty_points, 0) + v_points;
    v_next_lifetime_points := COALESCE(v_customer.lifetime_points, 0) + v_points;
    v_next_tier := CASE
        WHEN v_next_lifetime_points >= 1500 THEN 'gold'
        WHEN v_next_lifetime_points >= 500 THEN 'silver'
        ELSE 'bronze'
    END;

    UPDATE public.crm_customers
    SET
        loyalty_points = v_next_loyalty_points,
        lifetime_points = v_next_lifetime_points,
        loyalty_tier = v_next_tier,
        order_history = v_order_history || jsonb_build_object(
            'total_orders', v_total_orders,
            'total_spent', v_total_spent,
            'average_order_value', v_average_order_value,
            'last_order_date', v_last_order_date,
            'first_order_date', v_first_order_date
        ),
        updated_at = NOW()
    WHERE id = v_customer.id;

    INSERT INTO public.crm_loyalty_transactions (
        customer_id,
        amount,
        reason,
        description,
        related_order_id,
        multiplier,
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        v_customer.id,
        v_points,
        v_reason,
        CASE
            WHEN v_reason = 'first_order'
                THEN format('Pierwsze zamówienie + %s pkt za zakup (Zamówienie #%s)', FLOOR(COALESCE(v_order.total, 0)), v_order.order_number)
            ELSE format('Zakup na kwotę %s PLN (Zamówienie #%s)', TO_CHAR(COALESCE(v_order.total, 0), 'FM999999990.00'), v_order.order_number)
        END,
        v_order.id,
        1,
        NULL,
        v_delivered_at,
        v_delivered_at
    );

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_loyalty_points_for_delivered_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'delivered'
        AND OLD.status IS DISTINCT FROM 'delivered'
        AND NEW.customer_id IS NOT NULL
        AND COALESCE(NEW.loyalty_points_earned, 0) > 0 THEN
        PERFORM public.sync_delivered_order_loyalty_points(NEW.id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_delivered_award_loyalty_points ON public.orders_orders;

CREATE TRIGGER on_order_delivered_award_loyalty_points
AFTER UPDATE OF status ON public.orders_orders
FOR EACH ROW
EXECUTE FUNCTION public.award_loyalty_points_for_delivered_order();

CREATE OR REPLACE FUNCTION public.backfill_delivered_order_loyalty_points()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_processed INTEGER := 0;
BEGIN
    FOR v_order_id IN
        SELECT o.id
        FROM public.orders_orders o
        WHERE o.status = 'delivered'
          AND o.customer_id IS NOT NULL
          AND COALESCE(o.loyalty_points_earned, 0) > 0
          AND NOT EXISTS (
              SELECT 1
              FROM public.crm_loyalty_transactions t
              WHERE t.related_order_id = o.id
                AND t.reason IN ('purchase', 'first_order')
          )
        ORDER BY COALESCE(o.delivered_at, o.updated_at, o.created_at), o.created_at, o.id
    LOOP
        IF public.sync_delivered_order_loyalty_points(v_order_id) THEN
            v_processed := v_processed + 1;
        END IF;
    END LOOP;

    RETURN v_processed;
END;
$$;

DO $$
BEGIN
    PERFORM public.backfill_delivered_order_loyalty_points();
END;
$$;
