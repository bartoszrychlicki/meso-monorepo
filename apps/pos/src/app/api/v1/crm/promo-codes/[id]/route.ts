import { NextRequest } from 'next/server';
import {
  apiError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';
import {
  CreatePromotionalCodeSchema,
  UpdatePromotionalCodeSchema,
} from '@/schemas/crm';
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

function formatValidationError(
  issues: Array<{ path: PropertyKey[]; message: string }>
) {
  return apiValidationError(
    issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
  );
}

function buildFullPromotionalCodePayload(
  existing: Awaited<ReturnType<typeof getPromotionalCodeById>>,
  patch: Record<string, unknown>
) {
  if (!existing) return null;

  return {
    code: typeof patch.code === 'string' ? patch.code : existing.code ?? '',
    name: typeof patch.name === 'string' ? patch.name : existing.name,
    description: patch.description !== undefined ? patch.description : existing.description,
    discount_type:
      patch.discount_type !== undefined ? patch.discount_type : existing.discount_type,
    discount_value:
      patch.discount_value !== undefined ? patch.discount_value : existing.discount_value,
    free_item_id:
      patch.free_item_id !== undefined ? patch.free_item_id : existing.free_item_id,
    min_order_amount:
      patch.min_order_amount !== undefined ? patch.min_order_amount : existing.min_order_amount,
    first_order_only:
      patch.first_order_only !== undefined ? patch.first_order_only : existing.first_order_only,
    required_loyalty_tier:
      patch.required_loyalty_tier !== undefined
        ? patch.required_loyalty_tier
        : existing.required_loyalty_tier,
    max_uses: patch.max_uses !== undefined ? patch.max_uses : existing.max_uses,
    max_uses_per_customer:
      patch.max_uses_per_customer !== undefined
        ? patch.max_uses_per_customer
        : existing.max_uses_per_customer,
    valid_from: typeof patch.valid_from === 'string' ? patch.valid_from : existing.valid_from,
    valid_until:
      patch.valid_until !== undefined ? patch.valid_until : existing.valid_until,
    is_active: patch.is_active !== undefined ? patch.is_active : existing.is_active,
    channels: Array.isArray(patch.channels) ? patch.channels : existing.channels,
  };
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

  const client = createServiceClient();

  const validation = UpdatePromotionalCodeSchema.safeParse(body);
  if (!validation.success) {
    return formatValidationError(validation.error.issues);
  }

  try {
    const existing = await getPromotionalCodeById(client, id);
    if (!existing) return apiNotFound('Kod promocyjny');

    const fullPayload = buildFullPromotionalCodePayload(existing, validation.data);
    const fullValidation = CreatePromotionalCodeSchema.safeParse(fullPayload);
    if (!fullValidation.success) {
      return formatValidationError(fullValidation.error.issues);
    }

    if (fullValidation.data.discount_type === 'free_item') {
      return unsupportedDiscountTypeResponse();
    }

    if (validation.data.code) {
      const existingByCode = await getPromotionalCodeByCode(client, validation.data.code);
      if (existingByCode && existingByCode.id !== id) {
        return apiError('DUPLICATE_CODE', `Kod promocyjny ${validation.data.code} już istnieje`, 409);
      }
    }

    const promotionalCode = await updatePromotionalCode(client, id, validation.data);
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
