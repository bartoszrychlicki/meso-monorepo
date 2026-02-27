-- Rollback: 20260228000004_delivery_extend_orders.sql

DROP INDEX IF EXISTS idx_orders_orders_paid_at;
DROP INDEX IF EXISTS idx_orders_orders_promo_code;
DROP INDEX IF EXISTS idx_orders_orders_delivery_type;

ALTER TABLE orders_orders
    DROP COLUMN IF EXISTS cancelled_at,
    DROP COLUMN IF EXISTS delivered_at,
    DROP COLUMN IF EXISTS picked_up_at,
    DROP COLUMN IF EXISTS ready_at,
    DROP COLUMN IF EXISTS preparing_at,
    DROP COLUMN IF EXISTS confirmed_at,
    DROP COLUMN IF EXISTS paid_at,
    DROP COLUMN IF EXISTS estimated_delivery_time,
    DROP COLUMN IF EXISTS estimated_prep_time,
    DROP COLUMN IF EXISTS scheduled_time,
    DROP COLUMN IF EXISTS courier_notes,
    DROP COLUMN IF EXISTS courier_phone,
    DROP COLUMN IF EXISTS contact_phone,
    DROP COLUMN IF EXISTS loyalty_points_used,
    DROP COLUMN IF EXISTS loyalty_points_earned,
    DROP COLUMN IF EXISTS tip,
    DROP COLUMN IF EXISTS promo_discount,
    DROP COLUMN IF EXISTS promo_code,
    DROP COLUMN IF EXISTS delivery_type,
    DROP COLUMN IF EXISTS delivery_fee;
