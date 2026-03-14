-- ============================================================================
-- Delivered order loyalty sync repair follow-up
-- - fixes phone fallback when customer_id is missing
-- - repairs malformed purchase/first_order transactions with NULL customer_id
-- - restores referral bonus awarding in the DB-owned delivered flow
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
    v_referrer public.crm_customers%ROWTYPE;
    v_existing_loyalty_tx public.crm_loyalty_transactions%ROWTYPE;
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
    v_order_phone_digits TEXT;
    v_order_phone_local_digits TEXT;
    v_customer_resolved BOOLEAN := FALSE;
    v_should_apply_customer_award BOOLEAN := FALSE;
    v_did_work BOOLEAN := FALSE;
    v_referred_customer_name TEXT;
BEGIN
    SELECT *
    INTO v_order
    FROM public.orders_orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_order.status <> 'delivered'
        OR COALESCE(v_order.loyalty_points_earned, 0) <= 0 THEN
        RETURN FALSE;
    END IF;

    v_order_phone_digits := regexp_replace(
        COALESCE(v_order.customer_phone, v_order.contact_phone, ''),
        '[^0-9]',
        '',
        'g'
    );
    v_order_phone_local_digits := CASE
        WHEN v_order_phone_digits ~ '^48[0-9]{9}$' THEN RIGHT(v_order_phone_digits, 9)
        WHEN v_order_phone_digits ~ '^[0-9]{9}$' THEN v_order_phone_digits
        ELSE NULL
    END;

    IF v_order.customer_id IS NOT NULL THEN
        SELECT *
        INTO v_customer
        FROM public.crm_customers
        WHERE id = v_order.customer_id
        FOR UPDATE;

        v_customer_resolved := FOUND;
    END IF;

    IF NOT v_customer_resolved AND v_order_phone_digits <> '' THEN
        SELECT c.*
        INTO v_customer
        FROM public.crm_customers c
        WHERE c.is_active = TRUE
          AND (
              regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') = v_order_phone_digits
              OR regexp_replace(COALESCE(c.contact_phone, ''), '[^0-9]', '', 'g') = v_order_phone_digits
              OR (
                  v_order_phone_local_digits IS NOT NULL
                  AND (
                      regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') IN (v_order_phone_local_digits, '48' || v_order_phone_local_digits)
                      OR regexp_replace(COALESCE(c.contact_phone, ''), '[^0-9]', '', 'g') IN (v_order_phone_local_digits, '48' || v_order_phone_local_digits)
                  )
              )
          )
        ORDER BY
            CASE
                WHEN regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') = v_order_phone_digits THEN 0
                WHEN regexp_replace(COALESCE(c.contact_phone, ''), '[^0-9]', '', 'g') = v_order_phone_digits THEN 1
                WHEN v_order_phone_local_digits IS NOT NULL
                     AND regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') = '48' || v_order_phone_local_digits THEN 2
                WHEN v_order_phone_local_digits IS NOT NULL
                     AND regexp_replace(COALESCE(c.contact_phone, ''), '[^0-9]', '', 'g') = '48' || v_order_phone_local_digits THEN 3
                ELSE 4
            END,
            c.created_at
        LIMIT 1
        FOR UPDATE;

        v_customer_resolved := FOUND;
    END IF;

    IF NOT v_customer_resolved THEN
        RETURN FALSE;
    END IF;

    IF v_order.customer_id IS DISTINCT FROM v_customer.id THEN
        UPDATE public.orders_orders
        SET customer_id = v_customer.id,
            updated_at = NOW()
        WHERE id = v_order.id;

        v_did_work := TRUE;
    END IF;

    SELECT *
    INTO v_existing_loyalty_tx
    FROM public.crm_loyalty_transactions
    WHERE related_order_id = v_order.id
      AND reason IN ('purchase', 'first_order')
    ORDER BY
        CASE WHEN reason = 'first_order' THEN 0 ELSE 1 END,
        created_at,
        id
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        v_points := COALESCE(v_existing_loyalty_tx.amount, COALESCE(v_order.loyalty_points_earned, 0));
        v_reason := v_existing_loyalty_tx.reason;

        IF v_existing_loyalty_tx.customer_id IS NULL THEN
            UPDATE public.crm_loyalty_transactions
            SET customer_id = v_customer.id,
                amount = v_points,
                updated_at = NOW()
            WHERE id = v_existing_loyalty_tx.id;

            v_should_apply_customer_award := TRUE;
            v_did_work := TRUE;
        ELSIF v_existing_loyalty_tx.customer_id = v_customer.id THEN
            v_should_apply_customer_award := FALSE;
        ELSE
            RETURN v_did_work;
        END IF;
    ELSE
        v_points := COALESCE(v_order.loyalty_points_earned, 0);
        v_reason := CASE
            WHEN v_points > FLOOR(COALESCE(v_order.total, 0)) THEN 'first_order'
            ELSE 'purchase'
        END;
        v_should_apply_customer_award := TRUE;
    END IF;

    IF v_should_apply_customer_award THEN
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

        IF v_existing_loyalty_tx.id IS NULL THEN
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
        END IF;

        v_did_work := TRUE;
    END IF;

    IF v_reason = 'first_order' AND v_customer.referred_by IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.crm_loyalty_transactions
            WHERE customer_id = v_customer.referred_by
              AND related_order_id = v_order.id
              AND reason = 'referral'
        ) THEN
            SELECT *
            INTO v_referrer
            FROM public.crm_customers
            WHERE id = v_customer.referred_by
            FOR UPDATE;

            IF FOUND THEN
                v_next_loyalty_points := COALESCE(v_referrer.loyalty_points, 0) + 100;
                v_next_lifetime_points := COALESCE(v_referrer.lifetime_points, 0) + 100;
                v_next_tier := CASE
                    WHEN v_next_lifetime_points >= 1500 THEN 'gold'
                    WHEN v_next_lifetime_points >= 500 THEN 'silver'
                    ELSE 'bronze'
                END;

                UPDATE public.crm_customers
                SET loyalty_points = v_next_loyalty_points,
                    lifetime_points = v_next_lifetime_points,
                    loyalty_tier = v_next_tier,
                    updated_at = NOW()
                WHERE id = v_referrer.id;

                v_referred_customer_name := NULLIF(
                    BTRIM(CONCAT_WS(' ', v_customer.first_name, v_customer.last_name)),
                    ''
                );

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
                    v_referrer.id,
                    100,
                    'referral',
                    format(
                        'Polecenie klienta: %s',
                        COALESCE(
                            v_referred_customer_name,
                            NULLIF(v_customer.phone, ''),
                            NULLIF(v_customer.contact_phone, ''),
                            NULLIF(v_order.customer_phone, ''),
                            NULLIF(v_order.contact_phone, ''),
                            'klient'
                        )
                    ),
                    v_order.id,
                    1,
                    NULL,
                    COALESCE(v_order.delivered_at, NOW()),
                    COALESCE(v_order.delivered_at, NOW())
                );

                v_did_work := TRUE;
            END IF;
        END IF;
    END IF;

    RETURN v_did_work;
END;
$$;

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
          AND COALESCE(o.loyalty_points_earned, 0) > 0
          AND (
              o.customer_id IS NOT NULL
              OR COALESCE(o.customer_phone, o.contact_phone) IS NOT NULL
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
