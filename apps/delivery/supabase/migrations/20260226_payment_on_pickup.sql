-- Add 'pay_on_pickup' to payment_method constraint
ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('blik', 'card', 'cash', 'apple_pay', 'google_pay', 'pay_on_pickup'));

-- Add 'pay_on_pickup' to payment_status constraint
ALTER TABLE orders DROP CONSTRAINT orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'pay_on_pickup'));

-- Config: fee for paying at pickup (PLN)
INSERT INTO app_config (key, value, description) VALUES
  ('pay_on_pickup_fee', '"2"', 'Opłata za płatność przy odbiorze (PLN)'),
  ('pay_on_pickup_max_order', '"100"', 'Maksymalna wartość zamówienia dla płatności przy odbiorze (PLN)')
ON CONFLICT (key) DO NOTHING;
