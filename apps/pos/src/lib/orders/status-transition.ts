import { createServerRepository } from '@/lib/data/server-repository-factory';
import {
  buildPosbistroConfirmBaseUrl,
  ensureCustomerForOrder,
  submitPosbistroOrder,
} from '@/lib/integrations/posbistro/service';
import { createServiceClient } from '@/lib/supabase/server';
import { buildOrderStatusChangedWebhookData } from '@/lib/webhooks/order-payload';
import { scheduleWebhookDispatch } from '@/lib/webhooks/schedule';
import { awardOrderLoyaltyPoints } from '@/modules/orders/server-loyalty';
import {
  OrderClosureReasonCode,
  OrderStatus,
  PaymentStatus,
} from '@/types/enums';
import type { Order } from '@/types/order';
import { normalizeOrderClosureReason } from '@meso/core';

const ACTIVE_KITCHEN_TICKET_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
] as const;
type OrderRepo = Pick<
  ReturnType<typeof createServerRepository<Order>>,
  'findById' | 'update'
>;

function usesSupabaseBackend(): boolean {
  return process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';
}

async function cancelKitchenTicketsForOrder(
  orderId: string,
  nowIso: string
): Promise<void> {
  const { error } = await createServiceClient()
    .from('orders_kitchen_tickets')
    .update({
      status: OrderStatus.CANCELLED,
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('order_id', orderId)
    .in('status', [...ACTIVE_KITCHEN_TICKET_STATUSES]);

  if (error) {
    throw new Error(`Failed to cancel kitchen tickets for order ${orderId}: ${error.message}`);
  }
}
export interface TransitionOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  note?: string;
  closure_reason_code?: OrderClosureReasonCode | null;
  closure_reason?: string | null;
  changed_by?: string;
  payment_status?: PaymentStatus;
  requestOrigin?: string;
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`);
    this.name = 'OrderNotFoundError';
  }
}

export class InvalidOrderStatusTransitionError extends Error {
  readonly allowedTransitions: OrderStatus[];
  readonly currentStatus: OrderStatus;
  readonly requestedStatus: OrderStatus;

  constructor(currentStatus: OrderStatus, requestedStatus: OrderStatus, allowedTransitions: OrderStatus[]) {
    super(`Invalid transition from ${currentStatus} to ${requestedStatus}`);
    this.name = 'InvalidOrderStatusTransitionError';
    this.allowedTransitions = allowedTransitions;
    this.currentStatus = currentStatus;
    this.requestedStatus = requestedStatus;
  }
}

export class InvalidOrderCancellationReasonError extends Error {
  constructor() {
    super('Order cancellation reason is required');
    this.name = 'InvalidOrderCancellationReasonError';
  }
}

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

function buildLifecycleTimestampPatch(order: Order, status: OrderStatus, nowIso: string): Partial<Order> {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return order.confirmed_at ? {} : { confirmed_at: nowIso };
    case OrderStatus.PREPARING:
      return order.preparing_at ? {} : { preparing_at: nowIso };
    case OrderStatus.READY:
      return order.ready_at ? {} : { ready_at: nowIso };
    case OrderStatus.OUT_FOR_DELIVERY:
      return order.picked_up_at ? {} : { picked_up_at: nowIso };
    case OrderStatus.DELIVERED:
      return order.delivered_at ? {} : { delivered_at: nowIso };
    case OrderStatus.CANCELLED:
      return order.cancelled_at ? {} : { cancelled_at: nowIso };
    default:
      return {};
  }
}

function buildPaymentPatch(
  order: Order,
  paymentStatus: PaymentStatus | undefined,
  nowIso: string
): Partial<Order> {
  if (!paymentStatus || paymentStatus === order.payment_status) {
    return {};
  }

  return {
    payment_status: paymentStatus,
    ...(paymentStatus === PaymentStatus.PAID && !order.paid_at
      ? { paid_at: nowIso }
      : {}),
  };
}

export async function transitionOrderStatus(
  input: TransitionOrderStatusInput,
  deps?: {
    orderRepo?: OrderRepo;
    now?: () => Date;
  }
): Promise<Order> {
  const orderRepo = deps?.orderRepo ?? createServerRepository<Order>('orders');
  const order = await orderRepo.findById(input.orderId);
  if (!order) {
    throw new OrderNotFoundError(input.orderId);
  }

  const nowIso = (deps?.now ?? (() => new Date()))().toISOString();

  if (input.status === order.status) {
    const paymentPatch = buildPaymentPatch(order, input.payment_status, nowIso);
    if (Object.keys(paymentPatch).length === 0) {
      return order;
    }

    return orderRepo.update(input.orderId, paymentPatch);
  }

  const allowedTransitions = VALID_TRANSITIONS[order.status];
  if (!allowedTransitions.includes(input.status)) {
    throw new InvalidOrderStatusTransitionError(order.status, input.status, allowedTransitions);
  }

  const normalizedCancellation = input.status === OrderStatus.CANCELLED
    ? normalizeOrderClosureReason({
        closure_reason_code: input.closure_reason_code,
        closure_reason: input.closure_reason,
        note: input.note,
      })
    : null;

  if (
    input.status === OrderStatus.CANCELLED &&
    !normalizedCancellation?.closure_reason &&
    !normalizedCancellation?.note
  ) {
    throw new InvalidOrderCancellationReasonError();
  }

  const statusEntry = {
    status: input.status,
    timestamp: nowIso,
    changed_by: input.changed_by,
    note: normalizedCancellation?.note ?? input.note,
  };

  const updated = await orderRepo.update(input.orderId, {
    status: input.status,
    status_history: [...(Array.isArray(order.status_history) ? order.status_history : []), statusEntry],
    ...(normalizedCancellation
      ? {
          closure_reason_code: normalizedCancellation.closure_reason_code,
          closure_reason: normalizedCancellation.closure_reason,
        }
      : {}),
    ...buildLifecycleTimestampPatch(order, input.status, nowIso),
    ...buildPaymentPatch(order, input.payment_status, nowIso),
  } as Partial<Order>);

  if (input.status === OrderStatus.CANCELLED) {
    try {
      await cancelKitchenTicketsForOrder(input.orderId, nowIso);
    } catch (error) {
      // Keep status updates resilient even if KDS cleanup fails.
      console.error('[KDS] cancel tickets on order cancellation failed:', error);
    }
  }

  if (
    input.status === OrderStatus.DELIVERED &&
    (updated.customer_id || updated.customer_phone) &&
    !usesSupabaseBackend()
  ) {
    try {
      await awardOrderLoyaltyPoints(createServiceClient(), updated);
    } catch (error) {
      console.error(`[orders] loyalty awarding failed for delivered order ${updated.id}:`, error);
    }
  }

  const webhookData = buildOrderStatusChangedWebhookData(updated, {
    status: input.status,
    previousStatus: order.status,
    note: normalizedCancellation?.note ?? input.note,
  });

  await scheduleWebhookDispatch(
    input.status === OrderStatus.CANCELLED ? 'order.cancelled' : 'order.status_changed',
    webhookData as unknown as Record<string, unknown>
  );

  if (input.status === OrderStatus.CONFIRMED) {
    try {
      const orderWithCustomer = await ensureCustomerForOrder(updated);
      await submitPosbistroOrder(orderWithCustomer, {
        confirmBaseUrl: buildPosbistroConfirmBaseUrl(input.requestOrigin),
      });
    } catch (error) {
      console.error('[POSBistro] submit on confirm failed:', error);
    }
  }

  return updated;
}
