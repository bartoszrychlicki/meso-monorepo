import type { P24RefundRecord } from '@meso/core';
import type { Order } from '@/types/order';

export interface OrderCancellationResult {
  order: Order;
  refund: {
    status: 'not_requested' | 'requested' | 'manual_action_required';
    message?: string;
    refund?: P24RefundRecord;
  };
}
