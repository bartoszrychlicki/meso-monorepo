import { Batch } from '@/types/inventory';
import { BatchStatus } from '@/types/enums';

/**
 * FEFO - First Expired First Out (Spec 5.4)
 *
 * Algorithm for issuing stock from batches with earliest expiry date first.
 * Critical for food safety and HACCP compliance.
 */

/**
 * Get batches for issuing stock using FEFO algorithm
 *
 * @param batches - All available batches for the stock item
 * @param quantityNeeded - Quantity to issue
 * @returns Array of batches to issue from (sorted by expiry date)
 */
export function getBatchesForIssue(
  batches: Batch[],
  quantityNeeded: number
): BatchIssue[] {
  // Filter only valid batches (not expired, not depleted)
  const validBatches = batches.filter(
    (batch) =>
      batch.status !== BatchStatus.EXPIRED &&
      batch.status !== BatchStatus.DEPLETED &&
      batch.quantity_current > 0
  );

  // Sort by expiry date (earliest first) - FEFO logic
  const sortedBatches = validBatches.sort((a, b) => {
    // Batches without expiry date go last
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;

    const dateA = new Date(a.expiry_date).getTime();
    const dateB = new Date(b.expiry_date).getTime();

    return dateA - dateB;
  });

  // Issue from batches according to FEFO
  const issuedBatches: BatchIssue[] = [];
  let remainingQty = quantityNeeded;

  for (const batch of sortedBatches) {
    if (remainingQty <= 0) break;

    const qtyToTake = Math.min(batch.quantity_current, remainingQty);

    issuedBatches.push({
      batch_id: batch.id,
      batch_number: batch.batch_number,
      quantity: qtyToTake,
      expiry_date: batch.expiry_date,
      status: batch.status,
    });

    remainingQty -= qtyToTake;
  }

  return issuedBatches;
}

/**
 * Check if there's enough stock across all valid batches
 */
export function hasEnoughStock(batches: Batch[], quantityNeeded: number): boolean {
  const validBatches = batches.filter(
    (batch) =>
      batch.status !== BatchStatus.EXPIRED &&
      batch.status !== BatchStatus.DEPLETED &&
      batch.quantity_current > 0
  );

  const totalAvailable = validBatches.reduce(
    (sum, batch) => sum + batch.quantity_current,
    0
  );

  return totalAvailable >= quantityNeeded;
}

/**
 * Get batches expiring within X days (for alerts)
 */
export function getExpiringBatches(batches: Batch[], daysAhead: number): Batch[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  return batches.filter((batch) => {
    if (!batch.expiry_date) return false;
    if (batch.status === BatchStatus.DEPLETED) return false;

    const expiryDate = new Date(batch.expiry_date);
    return expiryDate <= cutoffDate && expiryDate > new Date();
  });
}

/**
 * Get batches that should be prioritized for usage (WARNING or CRITICAL)
 */
export function getPriorityBatches(batches: Batch[]): Batch[] {
  return batches
    .filter(
      (batch) =>
        (batch.status === BatchStatus.WARNING ||
          batch.status === BatchStatus.CRITICAL) &&
        batch.quantity_current > 0
    )
    .sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
}

/**
 * Calculate waste if batches expire before usage
 */
export function calculatePotentialWaste(
  batches: Batch[],
  dailyUsageRate: number
): WasteProjection[] {
  const projections: WasteProjection[] = [];
  const today = new Date();

  for (const batch of batches) {
    if (!batch.expiry_date || batch.status === BatchStatus.DEPLETED) continue;

    const expiryDate = new Date(batch.expiry_date);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 0) continue; // Already expired

    // Estimate quantity that will be used before expiry
    const estimatedUsage = dailyUsageRate * daysUntilExpiry;
    const potentialWaste = Math.max(0, batch.quantity_current - estimatedUsage);

    if (potentialWaste > 0) {
      projections.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        days_until_expiry: daysUntilExpiry,
        current_quantity: batch.quantity_current,
        estimated_usage: estimatedUsage,
        potential_waste: potentialWaste,
        waste_value: potentialWaste * batch.cost_per_unit,
      });
    }
  }

  return projections.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
}

/**
 * Get oldest batch (by production date)
 */
export function getOldestBatch(batches: Batch[]): Batch | null {
  const validBatches = batches.filter(
    (batch) =>
      batch.status !== BatchStatus.EXPIRED &&
      batch.status !== BatchStatus.DEPLETED &&
      batch.quantity_current > 0
  );

  if (validBatches.length === 0) return null;

  return validBatches.reduce((oldest, batch) =>
    new Date(batch.production_date) < new Date(oldest.production_date)
      ? batch
      : oldest
  );
}

/**
 * Get newest batch (by production date)
 */
export function getNewestBatch(batches: Batch[]): Batch | null {
  const validBatches = batches.filter(
    (batch) =>
      batch.status !== BatchStatus.EXPIRED &&
      batch.status !== BatchStatus.DEPLETED &&
      batch.quantity_current > 0
  );

  if (validBatches.length === 0) return null;

  return validBatches.reduce((newest, batch) =>
    new Date(batch.production_date) > new Date(newest.production_date)
      ? batch
      : newest
  );
}

// ==================== TYPE DEFINITIONS ====================

export interface BatchIssue {
  batch_id: string;
  batch_number: string;
  quantity: number;
  expiry_date?: string;
  status: BatchStatus;
}

export interface WasteProjection {
  batch_id: string;
  batch_number: string;
  days_until_expiry: number;
  current_quantity: number;
  estimated_usage: number;
  potential_waste: number;
  waste_value: number;
}
