import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import {
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
  transitionOrderStatus,
} from '@/lib/orders/status-transition';
import { UpdateOrderStatusSchema } from '@/schemas/order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/orders/:id/status
 * Update the status of an order with validation of allowed transitions.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'orders:status');
  if (!isApiKey(auth)) return auth;

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
      changed_by: validation.data.changed_by,
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

    return apiError(
      'ORDER_STATUS_UPDATE_FAILED',
      'Nie udało się zaktualizować statusu zamówienia',
      500,
      [error]
    );
  }
}
