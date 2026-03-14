ALTER TABLE orders_delivery_config
ADD COLUMN IF NOT EXISTS ordering_paused_until_date DATE;

COMMENT ON COLUMN orders_delivery_config.ordering_paused_until_date IS
'Optional reopen date for online ordering. Until opening_time on that date, only future scheduled orders are allowed.';
