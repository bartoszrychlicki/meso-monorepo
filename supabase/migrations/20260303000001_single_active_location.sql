-- ============================================================================
-- Migration: Keep a single active location for Delivery
-- Purpose:
--   - select one "keeper" location
--   - mark all other locations as inactive
--   - ensure delivery config exists for keeper and is active only for keeper
--
-- NOTE: We intentionally do not DELETE locations because many tables reference
-- users_locations without ON DELETE CASCADE.
-- ============================================================================

WITH keeper AS (
  SELECT id
  FROM users_locations
  ORDER BY
    CASE WHEN is_active THEN 0 ELSE 1 END,
    updated_at DESC NULLS LAST,
    created_at DESC NULLS LAST,
    id ASC
  LIMIT 1
)
UPDATE users_locations
SET
  is_active = (id = (SELECT id FROM keeper)),
  updated_at = now();

WITH keeper AS (
  SELECT id
  FROM users_locations
  ORDER BY
    CASE WHEN is_active THEN 0 ELSE 1 END,
    updated_at DESC NULLS LAST,
    created_at DESC NULLS LAST,
    id ASC
  LIMIT 1
)
INSERT INTO orders_delivery_config (location_id)
SELECT id
FROM keeper
ON CONFLICT (location_id) DO NOTHING;

WITH keeper AS (
  SELECT id
  FROM users_locations
  ORDER BY
    CASE WHEN is_active THEN 0 ELSE 1 END,
    updated_at DESC NULLS LAST,
    created_at DESC NULLS LAST,
    id ASC
  LIMIT 1
)
UPDATE orders_delivery_config
SET
  is_delivery_active = (location_id = (SELECT id FROM keeper)),
  updated_at = now();
