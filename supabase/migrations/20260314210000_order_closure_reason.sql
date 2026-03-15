ALTER TABLE public.orders_orders
  ADD COLUMN IF NOT EXISTS closure_reason_code TEXT
    CHECK (
      closure_reason_code IS NULL OR closure_reason_code IN (
        'missing_ingredients',
        'missing_packaging',
        'delivery_unavailable',
        'high_load',
        'location_closed',
        'custom'
      )
    ),
  ADD COLUMN IF NOT EXISTS closure_reason TEXT;
