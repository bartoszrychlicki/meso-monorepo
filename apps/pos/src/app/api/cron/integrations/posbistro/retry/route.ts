import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { retryPendingPosbistroExports } from '@/lib/integrations/posbistro/service';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.POSBISTRO_CRON_SECRET?.trim();
  const authHeader = request.headers.get('Authorization');

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return apiError('UNAUTHORIZED', 'Brak autoryzacji dla retry POSBistro', 401);
  }

  const result = await retryPendingPosbistroExports();
  return apiSuccess(result);
}
