import { NextRequest } from 'next/server';
import {
  apiCreated,
  apiError,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';
import {
  CreatePromotionalCodeSchema,
} from '@/schemas/crm';
import {
  createPromotionalCode,
  getPromotionalCodeByCode,
  listPromotionalCodes,
} from '@/modules/crm/server/catalog';
import { authorizeSessionOrApiKey } from '@/modules/crm/server/route-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const access = await authorizeSessionOrApiKey(request, 'crm:read');
  if (access instanceof Response) return access;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '50', 10), 100);
  const search = searchParams.get('search');
  const isActive = searchParams.get('is_active');

  try {
    const result = await listPromotionalCodes(createServiceClient(), {
      page,
      perPage,
      search,
      isActive: isActive == null ? null : isActive === 'true',
    });

    return apiSuccess(result.data, {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się pobrać kodów promocyjnych';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}

export async function POST(request: NextRequest) {
  const access = await authorizeSessionOrApiKey(request, 'crm:write');
  if (access instanceof Response) return access;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = CreatePromotionalCodeSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  try {
    const existing = await getPromotionalCodeByCode(createServiceClient(), validation.data.code);
    if (existing) {
      return apiError('DUPLICATE_CODE', `Kod promocyjny ${validation.data.code} już istnieje`, 409);
    }

    const promotionalCode = await createPromotionalCode(
      createServiceClient(),
      validation.data,
      access.actorId
    );
    return apiCreated(promotionalCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się utworzyć kodu promocyjnego';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}
