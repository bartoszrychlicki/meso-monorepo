ALTER TABLE orders_delivery_config
ADD COLUMN IF NOT EXISTS ordering_paused_until_time TIME;

COMMENT ON COLUMN orders_delivery_config.ordering_paused_until_time IS
'Optional reopen time for online ordering. Together with ordering_paused_until_date it defines the exact local reopen moment.';
