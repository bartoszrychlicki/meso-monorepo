import { NextRequest } from 'next/server';
import {
  apiError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';
import { UpdateRewardSchema } from '@/schemas/crm';
import {
  deleteReward,
  getRewardById,
  updateReward,
} from '@/modules/crm/server/catalog';
import { authorizeSessionOrApiKey } from '@/modules/crm/server/route-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const access = await authorizeSessionOrApiKey(request, 'crm:read');
  if (access instanceof Response) return access;

  const { id } = await params;

  try {
    const reward = await getRewardById(createServiceClient(), id);
    if (!reward) return apiNotFound('Nagroda');
    return apiSuccess(reward);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się pobrać nagrody';
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

  const validation = UpdateRewardSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  try {
    const reward = await updateReward(createServiceClient(), id, validation.data);
    if (!reward) return apiNotFound('Nagroda');
    return apiSuccess(reward);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zaktualizować nagrody';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const access = await authorizeSessionOrApiKey(request, 'crm:write');
  if (access instanceof Response) return access;

  const { id } = await params;

  try {
    const existing = await getRewardById(createServiceClient(), id);
    if (!existing) return apiNotFound('Nagroda');

    await deleteReward(createServiceClient(), id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się usunąć nagrody';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}
