-- Rollback: 20260228000009_delivery_seed_menu.sql

-- Remove delivery config entries
DELETE FROM orders_delivery_config WHERE location_id IN (
    SELECT id FROM users_locations WHERE name IN ('Food Truck Mokotów', 'Punkt Centrum')
);

-- Remove delivery products (by UUID prefix d0000002-)
DELETE FROM menu_products WHERE id::text LIKE 'd0000002-%';

-- Remove delivery categories (by UUID prefix d0000001-)
DELETE FROM menu_categories WHERE id::text LIKE 'd0000001-%';
