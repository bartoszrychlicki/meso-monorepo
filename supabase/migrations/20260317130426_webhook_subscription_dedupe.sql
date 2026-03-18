-- ============================================================================
-- Webhook subscription dedupe
-- - Normalize stored event arrays
-- - Remove duplicate subscriptions for the same target
-- - Prevent identical subscriptions from being created again
-- ============================================================================

UPDATE public.integrations_webhook_subscriptions
SET
  events = ARRAY(
    SELECT DISTINCT event_name
    FROM unnest(COALESCE(events, ARRAY[]::TEXT[])) AS event_name
    ORDER BY event_name
  ),
  updated_at = now();

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY url, secret, events
      ORDER BY is_active DESC, updated_at DESC, created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.integrations_webhook_subscriptions
)
DELETE FROM public.integrations_webhook_subscriptions
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_webhook_subscriptions_unique_target
  ON public.integrations_webhook_subscriptions(url, secret, events);
