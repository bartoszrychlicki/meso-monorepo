import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest, isApiKey } from '@/lib/api/auth';
import { hasPermission } from '@/lib/api-keys';
import {
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
} from '@/lib/api/response';
import {
  getOrderStatusRollbackErrorMessage,
  InvalidOrderStatusRollbackError,
  OrderNotFoundError,
  rollbackOrderStatus,
} from '@/lib/orders/status-transition';
import { RollbackOrderStatusSchema } from '@/schemas/order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function authorizeOrderStatusMutation(request: NextRequest) {
  const apiKeyAuth = await authenticateRequest(request);
  if (isApiKey(apiKeyAuth)) {
    if (!hasPermission(apiKeyAuth, 'orders:status')) {
      return apiForbidden('orders:status');
    }

    return { changedBy: apiKeyAuth.id, authType: 'api_key' as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  return { changedBy: user.id, authType: 'session' as const };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeOrderStatusMutation(request);
  if ('status' in auth) return auth;

  const { id } = await params;

  let body: unknown = {};
  try {
    const rawBody = await request.text();
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidlowe dane JSON w tresci zadania', 400);
  }

  const validation = RollbackOrderStatusSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  try {
    const updated = await rollbackOrderStatus({
      orderId: id,
      note: validation.data.note,
      changed_by: auth.authType === 'api_key'
        ? (validation.data.changed_by || auth.changedBy)
        : auth.changedBy,
    });

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return apiNotFound('Zamowienie');
    }

    if (error instanceof InvalidOrderStatusRollbackError) {
      return apiError(
        'INVALID_STATUS_ROLLBACK',
        getOrderStatusRollbackErrorMessage(error),
        422
      );
    }

    return apiError(
      'ORDER_STATUS_ROLLBACK_FAILED',
      'Nie udalo sie cofnac statusu zamowienia',
      500,
      [error]
    );
  }
}
