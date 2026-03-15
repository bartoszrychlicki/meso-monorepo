import { NextRequest } from 'next/server';
import {
  apiError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';
import { UpdatePromotionalCodeSchema } from '@/schemas/crm';
import {
  deletePromotionalCode,
  getPromotionalCodeByCode,
  getPromotionalCodeById,
  updatePromotionalCode,
} from '@/modules/crm/server/catalog';
import { authorizeSessionOrApiKey } from '@/modules/crm/server/route-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function unsupportedDiscountTypeResponse() {
  return apiValidationError([
    {
      field: 'discount_type',
      message: 'Typ "Darmowy produkt" nie jest jeszcze obsługiwany dla kodów promocyjnych',
    },
  ]);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const access = await authorizeSessionOrApiKey(request, 'crm:read');
  if (access instanceof Response) return access;

  const { id } = await params;

  try {
    const promotionalCode = await getPromotionalCodeById(createServiceClient(), id);
    if (!promotionalCode) return apiNotFound('Kod promocyjny');
    return apiSuccess(promotionalCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się pobrać kodu promocyjnego';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const access = await authorizeSessionOrApiKey(request, 'crm:write');
  if (access instanceof Response) return access;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = UpdatePromotionalCodeSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  if (validation.data.discount_type === 'free_item') {
    return unsupportedDiscountTypeResponse();
  }

  try {
    if (validation.data.code) {
      const existing = await getPromotionalCodeByCode(createServiceClient(), validation.data.code);
      if (existing && existing.id !== id) {
        return apiError('DUPLICATE_CODE', `Kod promocyjny ${validation.data.code} już istnieje`, 409);
      }
    }

    const promotionalCode = await updatePromotionalCode(createServiceClient(), id, validation.data);
    if (!promotionalCode) return apiNotFound('Kod promocyjny');
    return apiSuccess(promotionalCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zaktualizować kodu promocyjnego';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const access = await authorizeSessionOrApiKey(request, 'crm:write');
  if (access instanceof Response) return access;

  const { id } = await params;

  try {
    const existing = await getPromotionalCodeById(createServiceClient(), id);
    if (!existing) return apiNotFound('Kod promocyjny');

    await deletePromotionalCode(createServiceClient(), id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się usunąć kodu promocyjnego';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}
