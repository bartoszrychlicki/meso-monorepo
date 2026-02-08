/**
 * Stock Count / Inventory Reconciliation Utilities
 *
 * Handles:
 * - Cycle counts (periodic random sampling)
 * - Full counts (complete warehouse inventory)
 * - Variance analysis
 * - Automatic adjustments
 */

import { StockCount, StockItem } from '@/types/inventory';
import { StockCountType } from '@/types/enums';

export interface CountVariance {
  stock_item_id: string;
  stock_item_name: string;
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  variance_value: number;
  requires_investigation: boolean;
}

/**
 * Calculate variance between system and physical count
 */
export function calculateCountVariance(
  stockItem: StockItem,
  countedQuantity: number,
  thresholdPercentage: number = 5 // 5% threshold for investigation
): CountVariance {
  const systemQuantity = stockItem.quantity_physical;
  const variance = countedQuantity - systemQuantity;
  const variancePercentage =
    systemQuantity > 0 ? Math.abs(variance / systemQuantity) * 100 : 0;
  const varianceValue = Math.abs(variance) * stockItem.cost_per_unit;
  const requiresInvestigation = variancePercentage > thresholdPercentage;

  return {
    stock_item_id: stockItem.id,
    stock_item_name: stockItem.name,
    system_quantity: systemQuantity,
    counted_quantity: countedQuantity,
    variance,
    variance_percentage: variancePercentage,
    variance_value: varianceValue,
    requires_investigation: requiresInvestigation,
  };
}

/**
 * Generate quantity adjustments from count variance
 */
export function generateAdjustmentFromVariance(
  variance: CountVariance
): Partial<StockItem> {
  return {
    quantity_physical: variance.counted_quantity,
    quantity_available: variance.counted_quantity,
    // Note: In real system, would need to handle reserved qty separately
  };
}

/**
 * Validate counted quantity
 */
export function validateCountedQuantity(
  quantity: number
): { valid: boolean; error?: string } {
  if (quantity < 0) {
    return { valid: false, error: 'Ilość nie może być ujemna' };
  }

  return { valid: true };
}

/**
 * Get stock count type label for UI
 */
export function getStockCountTypeLabel(type: StockCountType): string {
  const labels: Record<StockCountType, string> = {
    [StockCountType.DAILY]: 'Dzienna (rotacyjna)',
    [StockCountType.WEEKLY]: 'Tygodniowa',
    [StockCountType.MONTHLY]: 'Miesięczna',
    [StockCountType.AD_HOC]: 'Ad-hoc (na żądanie)',
  };
  return labels[type];
}

/**
 * Get stock count type icon for UI
 */
export function getStockCountTypeIcon(type: StockCountType): string {
  const icons: Record<StockCountType, string> = {
    [StockCountType.DAILY]: '📅',
    [StockCountType.WEEKLY]: '📆',
    [StockCountType.MONTHLY]: '📋',
    [StockCountType.AD_HOC]: '🔍',
  };
  return icons[type];
}

/**
 * Calculate accuracy metrics for a stock count
 */
export interface CountAccuracyMetrics {
  total_items: number;
  items_with_variance: number;
  accuracy_percentage: number;
  total_variance_value: number;
  avg_variance_percentage: number;
}

export function calculateCountAccuracy(
  variances: CountVariance[]
): CountAccuracyMetrics {
  const totalItems = variances.length;
  const itemsWithVariance = variances.filter((v) => v.variance !== 0).length;
  const accurateItems = totalItems - itemsWithVariance;
  const accuracyPercentage = totalItems > 0 ? (accurateItems / totalItems) * 100 : 100;

  const totalVarianceValue = variances.reduce((sum, v) => sum + v.variance_value, 0);
  const avgVariancePercentage =
    totalItems > 0
      ? variances.reduce((sum, v) => sum + v.variance_percentage, 0) / totalItems
      : 0;

  return {
    total_items: totalItems,
    items_with_variance: itemsWithVariance,
    accuracy_percentage: accuracyPercentage,
    total_variance_value: totalVarianceValue,
    avg_variance_percentage: avgVariancePercentage,
  };
}

/**
 * Get variance severity for UI display
 */
export function getVarianceSeverity(
  variancePercentage: number
): 'low' | 'medium' | 'high' {
  if (variancePercentage < 2) return 'low';
  if (variancePercentage < 5) return 'medium';
  return 'high';
}

/**
 * Get variance color based on severity
 */
export function getVarianceColor(variance: number): string {
  if (variance === 0) return 'text-green-600 bg-green-50';
  if (variance > 0) return 'text-blue-600 bg-blue-50'; // Surplus
  return 'text-red-600 bg-red-50'; // Shortage
}

/**
 * Sort items by variance severity for investigation priority
 */
export function sortByInvestigationPriority(
  variances: CountVariance[]
): CountVariance[] {
  return [...variances].sort((a, b) => {
    // First by requires_investigation
    if (a.requires_investigation !== b.requires_investigation) {
      return a.requires_investigation ? -1 : 1;
    }
    // Then by variance value (highest first)
    return b.variance_value - a.variance_value;
  });
}

/**
 * Filter items that require investigation
 */
export function getItemsRequiringInvestigation(
  variances: CountVariance[]
): CountVariance[] {
  return variances.filter((v) => v.requires_investigation);
}

/**
 * Calculate financial impact of variance
 */
export interface VarianceFinancialImpact {
  total_shortage_value: number;
  total_surplus_value: number;
  net_impact: number;
}

export function calculateVarianceFinancialImpact(
  variances: CountVariance[]
): VarianceFinancialImpact {
  const shortages = variances.filter((v) => v.variance < 0);
  const surpluses = variances.filter((v) => v.variance > 0);

  const totalShortageValue = shortages.reduce((sum, v) => sum + v.variance_value, 0);
  const totalSurplusValue = surpluses.reduce((sum, v) => sum + v.variance_value, 0);

  return {
    total_shortage_value: totalShortageValue,
    total_surplus_value: totalSurplusValue,
    net_impact: totalSurplusValue - totalShortageValue,
  };
}
