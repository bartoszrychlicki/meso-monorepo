import { describe, expect, it } from 'vitest'
import { LoyaltyTier } from '@/types/enums'
import { BONUS_POINTS, calculatePointsFromOrder, getTierMultiplier } from '../loyalty-calculator'

describe('loyalty-calculator', () => {
  it('awards 1 point per 1 PLN regardless of tier', () => {
    expect(calculatePointsFromOrder(99.99, LoyaltyTier.BRONZE)).toBe(99)
    expect(calculatePointsFromOrder(99.99, LoyaltyTier.SILVER)).toBe(99)
    expect(calculatePointsFromOrder(99.99, LoyaltyTier.GOLD)).toBe(99)
  })

  it('keeps tier multiplier at 1 for all tiers for compatibility', () => {
    expect(getTierMultiplier(LoyaltyTier.BRONZE)).toBe(1)
    expect(getTierMultiplier(LoyaltyTier.SILVER)).toBe(1)
    expect(getTierMultiplier(LoyaltyTier.GOLD)).toBe(1)
  })

  it('keeps business bonuses unchanged', () => {
    expect(BONUS_POINTS.FIRST_ORDER).toBe(50)
    expect(BONUS_POINTS.REFERRAL).toBe(100)
  })
})
