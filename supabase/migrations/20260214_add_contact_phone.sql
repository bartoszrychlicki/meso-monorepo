ALTER TABLE orders ADD COLUMN contact_phone VARCHAR(20);
COMMENT ON COLUMN orders.contact_phone IS 'Phone for SMS order status notifications';
