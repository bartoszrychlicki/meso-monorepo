/**
 * Pure utility functions for order confirmation logic.
 * Extracted for testability.
 */

export const PAYMENT_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

export const ACTIVE_STATUSES = new Set([
  'pending_payment',
  'confirmed',
  'preparing',
  'ready',
  'awaiting_courier',
  'in_delivery',
])

/**
 * Maps order + payment status to a step index (0-3) for the progress bar.
 *
 * Step 0: Accepted (order placed, payment not confirmed yet)
 * Step 1: Payment confirmed
 * Step 2: Preparing
 * Step 3: Ready for pickup / delivered
 */
export function getPickupStepIndex(orderStatus: string, paymentStatus: string): number {
  if (orderStatus === 'ready' || orderStatus === 'delivered') return 3
  if (orderStatus === 'preparing') return 2
  if ((paymentStatus === 'paid' || paymentStatus === 'pay_on_pickup') && (orderStatus === 'confirmed' || orderStatus === 'pending_payment')) return 1
  return 0
}

/**
 * Determines if a payment is still pending (not yet resolved).
 */
export function isPaymentPending(paymentStatus: string): boolean {
  return paymentStatus !== 'paid'
    && paymentStatus !== 'pay_on_pickup'
    && paymentStatus !== 'failed'
    && paymentStatus !== 'cancelled'
}

/**
 * Determines if an order is "active" (not yet delivered/cancelled).
 */
export function isOrderActive(orderStatus: string): boolean {
  return ACTIVE_STATUSES.has(orderStatus)
}
