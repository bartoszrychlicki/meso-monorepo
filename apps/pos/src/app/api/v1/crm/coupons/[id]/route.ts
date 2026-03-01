import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { apiSuccess, apiNotFound, apiError } from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/crm/coupons/:id
 * Update coupon status (e.g., mark as used after delivery order).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'crm:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const { status, order_id } = body as { status?: string; order_id?: string };

  if (!status) {
    return apiError('VALIDATION_ERROR', 'Pole "status" jest wymagane', 400);
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('crm_customer_coupons')
    .update({
      status,
      used_at: status === 'used' ? new Date().toISOString() : undefined,
      order_id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return apiNotFound('Kupon');
  return apiSuccess(data);
}
