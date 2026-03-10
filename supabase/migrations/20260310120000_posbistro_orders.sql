-- ============================================================================
-- Migration: POSBistro outbound order integration state
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integrations_posbistro_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'submitted', 'accepted', 'rejected', 'failed')),
  callback_token TEXT NOT NULL UNIQUE,
  posbistro_order_id TEXT,
  request_payload JSONB,
  response_payload JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrations_posbistro_orders_status_retry
  ON public.integrations_posbistro_orders(status, next_retry_at);

ALTER TABLE public.integrations_posbistro_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_posbistro_orders" ON public.integrations_posbistro_orders;
CREATE POLICY "staff_all_posbistro_orders" ON public.integrations_posbistro_orders
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "service_role_posbistro_orders" ON public.integrations_posbistro_orders;
CREATE POLICY "service_role_posbistro_orders" ON public.integrations_posbistro_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_integrations_posbistro_orders_updated_at
  ON public.integrations_posbistro_orders;
CREATE TRIGGER update_integrations_posbistro_orders_updated_at
  BEFORE UPDATE ON public.integrations_posbistro_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
