import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import {
  InvalidOrderCancellationReasonError,
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
  transitionOrderStatus,
} from '@/lib/orders/status-transition';
import { authorizeOrderRoute } from '@/modules/orders/server/route-auth';
import { UpdateOrderStatusSchema } from '@/schemas/order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function authorizeOrderStatusMutation(request: NextRequest) {
  const access = await authorizeOrderRoute(request, 'orders:status');
  if ('status' in access) {
    return access;
  }

  return { changedBy: access.actorId, authType: access.kind };
}

/**
 * PATCH /api/v1/orders/:id/status
 * Update the status of an order with validation of allowed transitions.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeOrderStatusMutation(request);
  if ('status' in auth) return auth;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = UpdateOrderStatusSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  try {
    const updated = await transitionOrderStatus({
      orderId: id,
      status: validation.data.status,
      note: validation.data.note,
      closure_reason_code: validation.data.closure_reason_code,
      closure_reason: validation.data.closure_reason,
      changed_by: auth.authType === 'api_key'
        ? (validation.data.changed_by || auth.changedBy)
        : auth.changedBy,
      payment_status: validation.data.payment_status,
      requestOrigin: request.nextUrl.origin,
    });

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return apiNotFound('Zamówienie');
    }

    if (error instanceof InvalidOrderStatusTransitionError) {
      return apiError(
        'INVALID_STATUS_TRANSITION',
        `Nie można zmienić statusu z "${error.currentStatus}" na "${error.requestedStatus}". Dozwolone przejścia: ${error.allowedTransitions.join(', ') || 'brak'}`,
        422
      );
    }

    if (error instanceof InvalidOrderCancellationReasonError) {
      return apiError(
        'INVALID_CANCELLATION_REASON',
        'Powód anulowania jest wymagany',
        422
      );
    }

    return apiError(
      'ORDER_STATUS_UPDATE_FAILED',
      'Nie udało się zaktualizować statusu zamówienia',
      500,
      [error]
    );
  }
}
