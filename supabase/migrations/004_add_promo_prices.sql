-- Add promotional pricing to some products
UPDATE products SET original_price = 42.90 WHERE slug = 'spicy-miso';
UPDATE products SET original_price = 39.90 WHERE slug = 'shoyu-chicken';
