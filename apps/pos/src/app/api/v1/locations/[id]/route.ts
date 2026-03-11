import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { apiSuccess, apiNotFound, apiError } from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';
import type { LocationWithConfigs } from '@/types/common';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/locations/:id
 * Get a single location with all config objects (delivery, receipt, KDS).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'settings:read');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const supabase = createServiceClient();

  const [locResult, deliveryResult, receiptResult, kdsResult] = await Promise.all([
    supabase.from('users_locations').select('*').eq('id', id).single(),
    supabase.from('orders_delivery_config').select('*').eq('location_id', id).maybeSingle(),
    supabase.from('location_receipt_config').select('*').eq('location_id', id).maybeSingle(),
    supabase.from('location_kds_config').select('*').eq('location_id', id).maybeSingle(),
  ]);

  if (locResult.error || !locResult.data) {
    return apiNotFound('Lokalizacja');
  }

  if (deliveryResult.error || receiptResult.error || kdsResult.error) {
    return apiError('DB_ERROR', 'Błąd pobierania konfiguracji lokalizacji', 500);
  }

  const result: LocationWithConfigs = {
    ...locResult.data,
    delivery_config: deliveryResult.data ?? null,
    receipt_config: receiptResult.data ?? null,
    kds_config: kdsResult.data ?? null,
  };

  return apiSuccess(result);
}
