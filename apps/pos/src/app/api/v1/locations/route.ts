import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/locations
 * List all locations with optional active filter.
 *
 * Query params:
 *   ?active=true  - filter active locations only
 *   ?page=1       - page number
 *   ?per_page=50  - items per page (max 100)
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'settings:read');
  if (!isApiKey(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '50', 10), 100);
  const active = searchParams.get('active');

  const supabase = createServiceClient();

  let query = supabase
    .from('users_locations')
    .select('*', { count: 'exact' });

  if (active === 'true') {
    query = query.eq('is_active', true);
  } else if (active === 'false') {
    query = query.eq('is_active', false);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await query
    .order('name')
    .range(from, to);

  if (error) {
    return apiError('DB_ERROR', 'Błąd pobierania lokalizacji', 500);
  }

  return apiSuccess(data || [], {
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
