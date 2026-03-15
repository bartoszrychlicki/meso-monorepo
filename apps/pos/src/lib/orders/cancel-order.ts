import {
  getLatestP24Refund,
  upsertP24Refund,
  type P24RefundRecord,
} from '@meso/core';
import { OrderNotFoundError, transitionOrderStatus } from '@/lib/orders/status-transition';
import { requestDeliveryRefund } from '@/lib/delivery-api';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { getAutomaticRefundEligibility } from '@/lib/orders/p24-refund';
import type { Order } from '@/types/order';
import { OrderStatus, type OrderClosureReasonCode } from '@/types/enums';

export interface CancelOrderWithRefundInput {
  orderId: string;
  closure_reason_code?: OrderClosureReasonCode | null;
  closure_reason?: string;
  request_refund?: boolean;
  requested_from?: 'pos' | 'kds';
  changed_by?: string;
  requestOrigin?: string;
}

export interface CancelOrderResult {
  order: Order;
  refund: {
    status: 'not_requested' | 'requested' | 'manual_action_required';
    message?: string;
    refund?: P24RefundRecord;
  };
}

function buildManualRefundRecord(
  order: Order,
  input: CancelOrderWithRefundInput,
  message: string
): P24RefundRecord | null {
  const eligibility = getAutomaticRefundEligibility(order);
  const verifiedSession = eligibility.verifiedSession;
  if (!verifiedSession?.p24OrderId) {
    return null;
  }

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    requestId: `manual-${stamp}`,
    refundsUuid: `manual-${stamp}`.slice(0, 35),
    sessionId: verifiedSession.sessionId,
    p24OrderId: verifiedSession.p24OrderId,
    amount: eligibility.amount,
    description: `Zwrot ${order.order_number}`.slice(0, 35),
    status: 'manual_action_required',
    requestedAt: new Date().toISOString(),
    requestedBy: input.changed_by,
    requestedFrom: input.requested_from || 'system',
    rejectedAt: new Date().toISOString(),
    errorMessage: message,
  };
}

export async function cancelOrderWithOptionalRefund(
  input: CancelOrderWithRefundInput
): Promise<CancelOrderResult> {
  const orderRepo = createServerRepository<Order>('orders');
  const existingOrder = await orderRepo.findById(input.orderId);
  if (!existingOrder) {
    throw new OrderNotFoundError(input.orderId);
  }

  const updatedOrder = await transitionOrderStatus({
    orderId: input.orderId,
    status: OrderStatus.CANCELLED,
    closure_reason_code: input.closure_reason_code,
    closure_reason: input.closure_reason,
    note: input.closure_reason,
    changed_by: input.changed_by,
    requestOrigin: input.requestOrigin,
  });

  if (!input.request_refund) {
    return {
      order: updatedOrder,
      refund: { status: 'not_requested' },
    };
  }

  const eligibility = getAutomaticRefundEligibility(existingOrder);
  if (!eligibility.eligible) {
    return {
      order: updatedOrder,
      refund: {
        status: 'manual_action_required',
        message:
          eligibility.latestRefund
            ? 'Zwrot jest juz zapisany przy tym zamowieniu.'
            : 'Brakuje kompletnych danych transakcji P24 do automatycznego zwrotu.',
        refund: eligibility.latestRefund ?? undefined,
      },
    };
  }

  try {
    const refundResponse = await requestDeliveryRefund({
      orderId: input.orderId,
      requestedBy: input.changed_by,
      requestedFrom: input.requested_from || 'system',
    });
    const refreshedOrder = await orderRepo.findById(input.orderId);

    return {
      order: refreshedOrder ?? updatedOrder,
      refund: {
        status: 'requested',
        refund: refundResponse.refund,
      },
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Nie udalo sie zlecic zwrotu do P24.'
    const refreshedOrder = await orderRepo.findById(input.orderId)
    const trackedRefund = refreshedOrder
      ? getLatestP24Refund(refreshedOrder.metadata)
      : null

    if (trackedRefund) {
      return {
        order: refreshedOrder ?? updatedOrder,
        refund: {
          status: trackedRefund.status === 'requested' ? 'requested' : 'manual_action_required',
          message,
          refund: trackedRefund,
        },
      }
    }

    const manualRefund = buildManualRefundRecord(existingOrder, input, message);

    if (!manualRefund) {
      return {
        order: updatedOrder,
        refund: {
          status: 'manual_action_required',
          message,
        },
      };
    }

    const orderWithManualRefund = await orderRepo.update(input.orderId, {
      metadata: upsertP24Refund(updatedOrder.metadata, manualRefund),
    } as Partial<Order>);

    return {
      order: orderWithManualRefund,
      refund: {
        status: 'manual_action_required',
        message,
        refund: manualRefund,
      },
    };
  }
}
