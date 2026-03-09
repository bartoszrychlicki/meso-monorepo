/**
 * Loyalty Points Calculator
 *
 * Business logic for calculating loyalty points, tier thresholds, and upgrades.
 */

import { LoyaltyTier } from '@/types/enums';

/**
 * Tier configuration with point thresholds.
 */
const TIER_THRESHOLDS = {
  [LoyaltyTier.BRONZE]: { min: 0, max: 499, multiplier: 1.0 },
  [LoyaltyTier.SILVER]: { min: 500, max: 1499, multiplier: 1.0 },
  [LoyaltyTier.GOLD]: { min: 1500, max: Infinity, multiplier: 1.0 },
} as const;

/**
 * Bonus points for special events
 */
export const BONUS_POINTS = {
  FIRST_ORDER: 50,
  BIRTHDAY: 100,
  REFERRAL: 100,
} as const;

/**
 * Calculate loyalty tier from total points
 *
 * @param points - Total loyalty points
 * @returns The appropriate loyalty tier
 *
 * @example
 * calculateTierFromPoints(350)  // LoyaltyTier.BRONZE
 * calculateTierFromPoints(750)  // LoyaltyTier.SILVER
 * calculateTierFromPoints(1600) // LoyaltyTier.GOLD
 */
export function calculateTierFromPoints(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS[LoyaltyTier.GOLD].min) {
    return LoyaltyTier.GOLD;
  }
  if (points >= TIER_THRESHOLDS[LoyaltyTier.SILVER].min) {
    return LoyaltyTier.SILVER;
  }
  return LoyaltyTier.BRONZE;
}

/**
 * Get points multiplier for a tier
 *
 * @param tier - The loyalty tier
 * @returns Multiplier for the tier (1.0, 1.25, or 1.5)
 */
export function getTierMultiplier(tier: LoyaltyTier): number {
  return TIER_THRESHOLDS[tier].multiplier;
}

/**
 * Calculate points earned from an order
 *
 * Formula: Points = OrderAmount (rounded down)
 *
 * @param orderAmount - Order total in PLN
 * @param tier - Kept for backwards compatibility; tiers no longer multiply points
 * @returns Calculated points (integer)
 *
 * @example
 * calculatePointsFromOrder(100, LoyaltyTier.BRONZE)  // 100 points
 * calculatePointsFromOrder(100, LoyaltyTier.SILVER)  // 100 points
 * calculatePointsFromOrder(100, LoyaltyTier.GOLD)    // 100 points
 */
export function calculatePointsFromOrder(
  orderAmount: number,
  _tier?: LoyaltyTier
): number {
  return Math.floor(orderAmount);
}

/**
 * Tier upgrade information
 */
export interface TierUpgradeInfo {
  upgraded: boolean;
  oldTier: LoyaltyTier;
  newTier: LoyaltyTier;
}

/**
 * Check if tier upgrade occurred
 *
 * @param oldPoints - Points before transaction
 * @param newPoints - Points after transaction
 * @returns Upgrade information or null if no upgrade
 *
 * @example
 * checkTierUpgrade(450, 550)
 * // { upgraded: true, oldTier: 'bronze', newTier: 'silver' }
 *
 * checkTierUpgrade(300, 400)
 * // null (no tier change)
 */
export function checkTierUpgrade(
  oldPoints: number,
  newPoints: number
): TierUpgradeInfo | null {
  const oldTier = calculateTierFromPoints(oldPoints);
  const newTier = calculateTierFromPoints(newPoints);

  if (oldTier !== newTier) {
    return { upgraded: true, oldTier, newTier };
  }

  return null;
}

/**
 * Calculate points needed to reach next tier
 *
 * @param currentPoints - Customer's current points
 * @returns Points needed for next tier, or null if already at max tier
 *
 * @example
 * getPointsToNextTier(350)   // 150 (to reach Silver)
 * getPointsToNextTier(750)   // 750 (to reach Gold)
 * getPointsToNextTier(1600)  // null (already Gold)
 */
export function getPointsToNextTier(currentPoints: number): number | null {
  const currentTier = calculateTierFromPoints(currentPoints);

  if (currentTier === LoyaltyTier.GOLD) {
    return null; // Already at max tier
  }

  if (currentTier === LoyaltyTier.SILVER) {
    return TIER_THRESHOLDS[LoyaltyTier.GOLD].min - currentPoints;
  }

  // Bronze tier
  return TIER_THRESHOLDS[LoyaltyTier.SILVER].min - currentPoints;
}

/**
 * Get tier information
 *
 * @param tier - The loyalty tier
 * @returns Tier configuration
 */
export function getTierInfo(tier: LoyaltyTier) {
  return TIER_THRESHOLDS[tier];
}

/**
 * Get tier progress percentage
 *
 * @param currentPoints - Customer's current points
 * @returns Progress percentage to next tier (0-100)
 *
 * @example
 * getTierProgress(250)  // 50 (halfway through Bronze)
 * getTierProgress(1000) // 50 (halfway through Silver)
 */
export function getTierProgress(currentPoints: number): number {
  const currentTier = calculateTierFromPoints(currentPoints);
  const tierInfo = TIER_THRESHOLDS[currentTier];

  if (currentTier === LoyaltyTier.GOLD) {
    return 100; // Already at max tier
  }

  const tierRange = tierInfo.max - tierInfo.min + 1;
  const pointsInTier = currentPoints - tierInfo.min;
  const progress = (pointsInTier / tierRange) * 100;

  return Math.min(100, Math.max(0, progress));
}

/**
 * Format points for display
 *
 * @param points - Points to format
 * @returns Formatted string (e.g., "1,234 pkt")
 */
export function formatPoints(points: number): string {
  return `${points.toLocaleString('pl-PL')} pkt`;
}

/**
 * Get tier display name (localized)
 *
 * @param tier - The loyalty tier
 * @returns Localized tier name
 */
export function getTierDisplayName(tier: LoyaltyTier): string {
  const names: Record<LoyaltyTier, string> = {
    [LoyaltyTier.BRONZE]: 'Brązowy',
    [LoyaltyTier.SILVER]: 'Srebrny',
    [LoyaltyTier.GOLD]: 'Złoty',
  };
  return names[tier];
}

/**
 * Get tier color class for UI
 *
 * @param tier - The loyalty tier
 * @returns Tailwind CSS color class
 */
export function getTierColorClass(tier: LoyaltyTier): string {
  const colors: Record<LoyaltyTier, string> = {
    [LoyaltyTier.BRONZE]: 'bg-amber-100 text-amber-700',
    [LoyaltyTier.SILVER]: 'bg-gray-100 text-gray-700',
    [LoyaltyTier.GOLD]: 'bg-yellow-100 text-yellow-700',
  };
  return colors[tier];
}
