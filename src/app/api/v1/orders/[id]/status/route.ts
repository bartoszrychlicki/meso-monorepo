import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { ordersRepository } from '@/modules/orders/repository';
import { UpdateOrderStatusSchema } from '@/schemas/order';
import { OrderStatus } from '@/types/enums';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * PATCH /api/v1/orders/:id/status
 * Update the status of an order with validation of allowed transitions.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'orders:status');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const order = await ordersRepository.findById(id);
  if (!order) return apiNotFound('Zamówienie');

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

  const { status: newStatus, note } = validation.data;

  // Validate status transition
  const allowedTransitions = VALID_TRANSITIONS[order.status];
  if (!allowedTransitions.includes(newStatus)) {
    return apiError(
      'INVALID_STATUS_TRANSITION',
      `Nie można zmienić statusu z "${order.status}" na "${newStatus}". Dozwolone przejścia: ${allowedTransitions.join(', ') || 'brak'}`,
      422
    );
  }

  const updated = await ordersRepository.updateStatus(id, newStatus, note);
  return apiSuccess(updated);
}
