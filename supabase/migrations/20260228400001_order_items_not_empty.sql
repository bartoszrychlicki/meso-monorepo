-- Ensure orders always have at least one item.
-- This closes the only validation gap: the database layer.
-- All other layers (UI, Zustand store, POST API, PUT API) already enforce this.

-- Clean up any existing rows with empty items (test/seed data)
DELETE FROM public.orders_orders
  WHERE items IS NULL OR jsonb_array_length(items) = 0;

ALTER TABLE public.orders_orders
  ADD CONSTRAINT orders_items_not_empty
  CHECK (jsonb_array_length(items) > 0);

ALTER TABLE public.orders_orders
  ALTER COLUMN items DROP DEFAULT;
