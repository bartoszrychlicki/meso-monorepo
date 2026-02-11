/**
 * Wastage/Shrinkage Tracking Utilities
 *
 * Tracks inventory losses due to:
 * - Expiry
 * - Damage
 * - Spillage
 * - Theft
 * - Other
 */

import { WastageRecord, StockItem } from '@/types/inventory';
import { WastageCategory } from '@/types/enums';

export interface WastageImpact {
  quantity_lost: number;
  value_lost: number;
  new_physical: number;
  new_available: number;
}

/**
 * Calculate the financial impact of wastage
 */
export function calculateWastageImpact(
  stockItem: StockItem,
  quantity: number
): WastageImpact {
  const valueLost = quantity * stockItem.cost_per_unit;

  return {
    quantity_lost: quantity,
    value_lost: valueLost,
    new_physical: stockItem.quantity_physical - quantity,
    new_available: stockItem.quantity_available - quantity,
  };
}

/**
 * Validate wastage quantity
 */
export function validateWastageQuantity(
  stockItem: StockItem,
  quantity: number
): { valid: boolean; error?: string } {
  if (quantity <= 0) {
    return { valid: false, error: 'Ilość musi być większa niż 0' };
  }

  if (quantity > stockItem.quantity_physical) {
    return {
      valid: false,
      error: `Przekroczona dostępna ilość. Dostępne: ${stockItem.quantity_physical}, Wprowadzone: ${quantity}`,
    };
  }

  return { valid: true };
}

/**
 * Get wastage category label for UI
 */
export function getWastageCategoryLabel(category: WastageCategory): string {
  const labels: Record<WastageCategory, string> = {
    [WastageCategory.EXPIRY]: 'Przeterminowanie',
    [WastageCategory.DAMAGE]: 'Uszkodzenie',
    [WastageCategory.SPOILAGE]: 'Zepsucie',
    [WastageCategory.HUMAN_ERROR]: 'Błąd ludzki',
    [WastageCategory.THEFT]: 'Kradzież',
    [WastageCategory.PRODUCTION]: 'Produkcyjne',
    [WastageCategory.PRODUCTION_ERROR]: 'Błąd produkcji',
    [WastageCategory.OTHER]: 'Inne',
  };
  return labels[category];
}

/**
 * Get wastage category icon for UI
 */
export function getWastageCategoryIcon(category: WastageCategory): string {
  const icons: Record<WastageCategory, string> = {
    [WastageCategory.EXPIRY]: '📅',
    [WastageCategory.DAMAGE]: '💥',
    [WastageCategory.SPOILAGE]: '🦠',
    [WastageCategory.HUMAN_ERROR]: '👤',
    [WastageCategory.THEFT]: '🚨',
    [WastageCategory.PRODUCTION]: '🏭',
    [WastageCategory.PRODUCTION_ERROR]: '⚠️',
    [WastageCategory.OTHER]: '❓',
  };
  return icons[category];
}

/**
 * Get wastage category color for UI
 */
export function getWastageCategoryColor(category: WastageCategory): string {
  const colors: Record<WastageCategory, string> = {
    [WastageCategory.EXPIRY]: 'text-red-600 bg-red-50',
    [WastageCategory.DAMAGE]: 'text-orange-600 bg-orange-50',
    [WastageCategory.SPOILAGE]: 'text-green-600 bg-green-50',
    [WastageCategory.HUMAN_ERROR]: 'text-yellow-600 bg-yellow-50',
    [WastageCategory.THEFT]: 'text-purple-600 bg-purple-50',
    [WastageCategory.PRODUCTION]: 'text-blue-600 bg-blue-50',
    [WastageCategory.PRODUCTION_ERROR]: 'text-red-600 bg-red-50',
    [WastageCategory.OTHER]: 'text-gray-600 bg-gray-50',
  };
  return colors[category];
}

/**
 * Calculate wastage rate (%) for a given period
 */
export function calculateWastageRate(
  totalWastage: number,
  totalPurchased: number
): number {
  if (totalPurchased === 0) return 0;
  return (totalWastage / totalPurchased) * 100;
}

/**
 * Get wastage records for a specific category and time period
 */
export function filterWastageByPeriod(
  records: WastageRecord[],
  category?: WastageCategory,
  startDate?: Date,
  endDate?: Date
): WastageRecord[] {
  return records.filter((record) => {
    const recordDate = new Date(record.created_at);

    const matchesCategory = !category || record.category === category;
    const afterStart = !startDate || recordDate >= startDate;
    const beforeEnd = !endDate || recordDate <= endDate;

    return matchesCategory && afterStart && beforeEnd;
  });
}

/**
 * Calculate total wastage value for records
 */
export function calculateTotalWastageValue(records: WastageRecord[]): number {
  return records.reduce((total, record) => total + record.cost_value, 0);
}

/**
 * Group wastage by category with totals
 */
export interface WastageByCategoryStats {
  category: WastageCategory;
  count: number;
  total_quantity: number;
  total_value: number;
  percentage: number;
}

export function groupWastageByCategory(
  records: WastageRecord[]
): WastageByCategoryStats[] {
  const totalValue = calculateTotalWastageValue(records);

  const grouped = records.reduce(
    (acc, record) => {
      if (!acc[record.category]) {
        acc[record.category] = {
          category: record.category,
          count: 0,
          total_quantity: 0,
          total_value: 0,
          percentage: 0,
        };
      }

      acc[record.category].count += 1;
      acc[record.category].total_quantity += record.quantity;
      acc[record.category].total_value += record.cost_value;

      return acc;
    },
    {} as Record<WastageCategory, WastageByCategoryStats>
  );

  // Calculate percentages
  Object.values(grouped).forEach((stats) => {
    stats.percentage = totalValue > 0 ? (stats.total_value / totalValue) * 100 : 0;
  });

  return Object.values(grouped).sort((a, b) => b.total_value - a.total_value);
}
