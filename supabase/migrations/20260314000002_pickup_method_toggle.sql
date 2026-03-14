ALTER TABLE public.orders_delivery_config
ADD COLUMN IF NOT EXISTS is_pickup_active boolean NOT NULL DEFAULT true;
