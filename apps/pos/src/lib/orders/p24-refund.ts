import {
  getLatestP24Refund,
  getLatestVerifiedP24Session,
  type P24RefundRecord,
  type P24SessionRecord,
} from '@meso/core';
import { PaymentMethod, PaymentStatus } from '@/types/enums';

type RefundableOrder = {
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  total: number;
  metadata?: Record<string, unknown>;
};

export interface AutomaticRefundEligibility {
  eligible: boolean;
  amount: number;
  verifiedSession: P24SessionRecord | null;
  latestRefund: P24RefundRecord | null;
  reason?:
    | 'not_online_payment'
    | 'payment_not_paid'
    | 'already_refunded'
    | 'refund_already_tracked'
    | 'missing_verified_transaction';
}

export function getAutomaticRefundEligibility(
  order: RefundableOrder
): AutomaticRefundEligibility {
  const amount = Math.round(order.total * 100);
  const latestRefund = getLatestP24Refund(order.metadata);

  if (order.payment_method !== PaymentMethod.ONLINE) {
    return {
      eligible: false,
      amount,
      verifiedSession: null,
      latestRefund,
      reason: 'not_online_payment',
    };
  }

  if (order.payment_status === PaymentStatus.REFUNDED) {
    return {
      eligible: false,
      amount,
      verifiedSession: null,
      latestRefund,
      reason: 'already_refunded',
    };
  }

  if (order.payment_status !== PaymentStatus.PAID) {
    return {
      eligible: false,
      amount,
      verifiedSession: null,
      latestRefund,
      reason: 'payment_not_paid',
    };
  }

  if (latestRefund) {
    return {
      eligible: false,
      amount,
      verifiedSession: null,
      latestRefund,
      reason: 'refund_already_tracked',
    };
  }

  const verifiedSession = getLatestVerifiedP24Session(order.metadata);
  if (!verifiedSession?.p24OrderId) {
    return {
      eligible: false,
      amount,
      verifiedSession: null,
      latestRefund,
      reason: 'missing_verified_transaction',
    };
  }

  return {
    eligible: true,
    amount,
    verifiedSession,
    latestRefund,
  };
}
