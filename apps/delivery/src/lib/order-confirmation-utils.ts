/**
 * Pure utility functions for order confirmation logic.
 * Extracted for testability.
 */
import { isPaymentPending as isPendingPayment, normalizeOrderStatus } from './order-status'

export const PAYMENT_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

export const ACTIVE_STATUSES = new Set([
  'pending',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
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
  const normalized = normalizeOrderStatus(orderStatus)
  if (normalized === 'unknown') return 0
  if (normalized === 'ready' || normalized === 'out_for_delivery' || normalized === 'delivered') return 3
  if (normalized === 'preparing') return 2
  if (!isPendingPayment(paymentStatus) && (
    normalized === 'pending' ||
    normalized === 'confirmed' ||
    normalized === 'accepted'
  )) return 1
  return 0
}

/**
 * Determines if a payment is still pending (not yet resolved).
 */
export function isPaymentPending(paymentStatus: string): boolean {
  return isPendingPayment(paymentStatus)
}

/**
 * Determines if an order is "active" (not yet delivered/cancelled).
 */
export function isOrderActive(orderStatus: string): boolean {
  const normalized = normalizeOrderStatus(orderStatus)
  if (normalized === 'unknown') return false
  return ACTIVE_STATUSES.has(normalized)
}
