-- Rollback: 20260228000010_delivery_seed_promos.sql

DELETE FROM crm_loyalty_rewards WHERE icon IN ('🚚', '🥟', '💰', '🍜');
DELETE FROM crm_promotions WHERE code IN ('PIERWSZYRAMEN', 'MESOCLUB', 'DOSTAWAZERO', 'LATO2024', 'GYOZAFREE');
