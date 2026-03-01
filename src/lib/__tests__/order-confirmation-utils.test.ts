import { describe, it, expect } from 'vitest'
import {
  getPickupStepIndex,
  isPaymentPending,
  isOrderActive,
  PAYMENT_TIMEOUT_MS,
} from '../order-confirmation-utils'

describe('getPickupStepIndex', () => {
  // Step 0: order placed, payment not confirmed
  it('returns 0 for pending_payment + pending', () => {
    expect(getPickupStepIndex('pending_payment', 'pending')).toBe(0)
  })

  it('returns 0 for confirmed + pending (edge case)', () => {
    expect(getPickupStepIndex('confirmed', 'pending')).toBe(0)
  })

  // Step 1: payment confirmed
  it('returns 1 for confirmed + paid', () => {
    expect(getPickupStepIndex('confirmed', 'paid')).toBe(1)
  })

  it('returns 1 for pending_payment + paid (status not yet updated)', () => {
    expect(getPickupStepIndex('pending_payment', 'paid')).toBe(1)
  })

  // Step 2: preparing
  it('returns 2 for preparing + paid', () => {
    expect(getPickupStepIndex('preparing', 'paid')).toBe(2)
  })

  it('returns 2 for preparing + pending (edge case)', () => {
    expect(getPickupStepIndex('preparing', 'pending')).toBe(2)
  })

  // Step 3: ready / delivered
  it('returns 3 for ready + paid', () => {
    expect(getPickupStepIndex('ready', 'paid')).toBe(3)
  })

  it('returns 3 for delivered + paid', () => {
    expect(getPickupStepIndex('delivered', 'paid')).toBe(3)
  })

  // Edge cases
  it('returns 0 for cancelled + pending', () => {
    expect(getPickupStepIndex('cancelled', 'pending')).toBe(0)
  })

  it('returns 0 for unknown status', () => {
    expect(getPickupStepIndex('unknown', 'unknown')).toBe(0)
  })
})

describe('isPaymentPending', () => {
  it('returns true for "pending"', () => {
    expect(isPaymentPending('pending')).toBe(true)
  })

  it('returns true for "processing"', () => {
    expect(isPaymentPending('processing')).toBe(true)
  })

  it('returns false for "paid"', () => {
    expect(isPaymentPending('paid')).toBe(false)
  })

  it('returns false for "failed"', () => {
    expect(isPaymentPending('failed')).toBe(false)
  })

  it('returns false for "cancelled"', () => {
    expect(isPaymentPending('cancelled')).toBe(false)
  })
})

describe('isOrderActive', () => {
  const activeStatuses = [
    'pending_payment',
    'confirmed',
    'preparing',
    'ready',
    'awaiting_courier',
    'in_delivery',
  ]

  const inactiveStatuses = [
    'delivered',
    'cancelled',
  ]

  activeStatuses.forEach((status) => {
    it(`returns true for "${status}"`, () => {
      expect(isOrderActive(status)).toBe(true)
    })
  })

  inactiveStatuses.forEach((status) => {
    it(`returns false for "${status}"`, () => {
      expect(isOrderActive(status)).toBe(false)
    })
  })

  it('returns false for unknown status', () => {
    expect(isOrderActive('unknown')).toBe(false)
  })
})

describe('PAYMENT_TIMEOUT_MS', () => {
  it('is 3 minutes in milliseconds', () => {
    expect(PAYMENT_TIMEOUT_MS).toBe(180_000)
  })
})
