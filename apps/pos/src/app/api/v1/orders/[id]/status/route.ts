import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { createServiceClient } from '@/lib/supabase/server';
import { awardOrderLoyaltyPoints } from '@/modules/orders/server-loyalty';
import { UpdateOrderStatusSchema } from '@/schemas/order';
import { OrderChannel, OrderStatus } from '@/types/enums';
import type { Order } from '@/types/order';
import { dispatchWebhook } from '@/lib/webhooks/dispatcher';
import { OrderStatusChangedData } from '@/lib/webhooks/types';

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
  const serverOrdersRepo = createServerRepository<Order>('orders');
  const order = await serverOrdersRepo.findById(id);
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

  const { status: newStatus, note, payment_status } = validation.data;

  // Idempotent no-op: repeating the same status should not fail.
  if (newStatus === order.status) {
    if (!payment_status || payment_status === order.payment_status) {
      return apiSuccess(order);
    }

    const paymentUpdate: Record<string, unknown> = {
      payment_status,
    };
    if (payment_status === 'paid') {
      paymentUpdate.paid_at = new Date().toISOString();
    }
    const updated = await serverOrdersRepo.update(id, paymentUpdate as Partial<Order>);
    return apiSuccess(updated);
  }

  // Validate status transition
  const allowedTransitions = VALID_TRANSITIONS[order.status];
  if (!allowedTransitions.includes(newStatus)) {
    return apiError(
      'INVALID_STATUS_TRANSITION',
      `Nie można zmienić statusu z "${order.status}" na "${newStatus}". Dozwolone przejścia: ${allowedTransitions.join(', ') || 'brak'}`,
      422
    );
  }

  const statusEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    note,
  };

  const updated = await serverOrdersRepo.update(id, {
    status: newStatus,
    status_history: [...order.status_history, statusEntry],
  } as Partial<Order>);

  // Update payment status if provided (e.g., P24 payment confirmed)
  if (payment_status) {
    const paymentUpdate: Record<string, unknown> = {
      payment_status,
    };
    if (payment_status === 'paid') {
      paymentUpdate.paid_at = new Date().toISOString();
    }
    await serverOrdersRepo.update(id, paymentUpdate as Partial<Order>);
    Object.assign(updated, paymentUpdate);
  }

  // CRM integration: loyalty points & SMS (best-effort, uses module repo)
  if (newStatus === OrderStatus.DELIVERED && (updated.customer_id || updated.customer_phone)) {
    try {
      await awardOrderLoyaltyPoints(createServiceClient(), updated);
    } catch {
      // Don't fail status update if CRM fails
    }
  }

  // Dispatch webhook for delivery app orders
  if (updated.channel === OrderChannel.DELIVERY_APP) {
    const webhookData: OrderStatusChangedData = {
      pos_order_id: updated.id,
      external_order_id: updated.external_order_id,
      status: newStatus,
      previous_status: order.status,
      note,
      estimated_ready_at: updated.estimated_ready_at,
    };

    const event =
      newStatus === OrderStatus.CANCELLED
        ? 'order.cancelled' as const
        : 'order.status_changed' as const;

    // Fire and forget - don't block status update response
    dispatchWebhook(event, webhookData as unknown as Record<string, unknown>).catch(
      (err) => console.error('Webhook dispatch failed:', err)
    );
  }

  return apiSuccess(updated);
}
