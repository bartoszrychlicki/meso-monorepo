import { Batch } from '@/types/inventory';
import { BatchStatus } from '@/types/enums';

/**
 * Calculate batch status based on % of shelf life remaining (Spec 5.5)
 *
 * FRESH (🟢)    - > 50% shelf life remaining
 * WARNING (🟡)  - 25-50% shelf life remaining
 * CRITICAL (🔴) - < 25% shelf life remaining
 * EXPIRED (⚫)  - Past expiry date
 * DEPLETED (⚪) - Quantity exhausted
 */
export function calculateBatchStatus(batch: Batch): BatchStatus {
  // Check if depleted first
  if (batch.quantity_current <= 0) {
    return BatchStatus.DEPLETED;
  }

  // If no expiry date, assume FRESH (non-perishable items)
  if (!batch.expiry_date) {
    return BatchStatus.FRESH;
  }

  const now = new Date();
  const expiryDate = new Date(batch.expiry_date);
  const productionDate = new Date(batch.production_date);

  // Check if expired
  if (expiryDate <= now) {
    return BatchStatus.EXPIRED;
  }

  // Calculate shelf life percentages
  const totalShelfLife = expiryDate.getTime() - productionDate.getTime();
  const remainingShelfLife = expiryDate.getTime() - now.getTime();
  const percentRemaining = (remainingShelfLife / totalShelfLife) * 100;

  // Determine status based on percentage
  if (percentRemaining > 50) {
    return BatchStatus.FRESH;
  } else if (percentRemaining > 25) {
    return BatchStatus.WARNING;
  } else {
    return BatchStatus.CRITICAL;
  }
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(batch: Batch): number | null {
  if (!batch.expiry_date) return null;

  const now = new Date();
  const expiryDate = new Date(batch.expiry_date);
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calculate % of shelf life remaining
 */
export function getShelfLifePercentage(batch: Batch): number | null {
  if (!batch.expiry_date) return null;

  const now = new Date();
  const expiryDate = new Date(batch.expiry_date);
  const productionDate = new Date(batch.production_date);

  const totalShelfLife = expiryDate.getTime() - productionDate.getTime();
  const remainingShelfLife = expiryDate.getTime() - now.getTime();

  return (remainingShelfLife / totalShelfLife) * 100;
}

/**
 * Get status color for UI display
 */
export function getBatchStatusColor(status: BatchStatus): string {
  const colors: Record<BatchStatus, string> = {
    [BatchStatus.FRESH]: 'text-green-600 bg-green-50 border-green-200',
    [BatchStatus.WARNING]: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    [BatchStatus.CRITICAL]: 'text-red-600 bg-red-50 border-red-200',
    [BatchStatus.EXPIRED]: 'text-gray-600 bg-gray-50 border-gray-200',
    [BatchStatus.DEPLETED]: 'text-gray-400 bg-gray-50 border-gray-200',
  };
  return colors[status];
}

/**
 * Get status icon for UI display
 */
export function getBatchStatusIcon(status: BatchStatus): string {
  const icons: Record<BatchStatus, string> = {
    [BatchStatus.FRESH]: '🟢',
    [BatchStatus.WARNING]: '🟡',
    [BatchStatus.CRITICAL]: '🔴',
    [BatchStatus.EXPIRED]: '⚫',
    [BatchStatus.DEPLETED]: '⚪',
  };
  return icons[status];
}

/**
 * Get status label for UI display
 */
export function getBatchStatusLabel(status: BatchStatus): string {
  const labels: Record<BatchStatus, string> = {
    [BatchStatus.FRESH]: 'Świeża',
    [BatchStatus.WARNING]: 'Ostrzeżenie',
    [BatchStatus.CRITICAL]: 'Krytyczna',
    [BatchStatus.EXPIRED]: 'Przeterminowana',
    [BatchStatus.DEPLETED]: 'Wyczerpana',
  };
  return labels[status];
}

/**
 * Update batch status (should be called periodically or on-demand)
 */
export function updateBatchWithStatus(batch: Batch): Batch {
  const newStatus = calculateBatchStatus(batch);
  return {
    ...batch,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check if batch should trigger HACCP alert
 * (CRITICAL or EXPIRED batches should be flagged)
 */
export function shouldTriggerHACCPAlert(batch: Batch): boolean {
  return (
    batch.status === BatchStatus.CRITICAL ||
    batch.status === BatchStatus.EXPIRED
  );
}
