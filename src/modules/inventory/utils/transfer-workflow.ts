/**
 * Stock Transfer Workflow Logic
 *
 * Lifecycle: PENDING → IN_TRANSIT → RECEIVED (or CANCELLED)
 *
 * - PENDING: Transfer created, awaiting approval
 * - IN_TRANSIT: Approved, goods in transit, quantity_in_transit updated
 * - RECEIVED: Goods received at destination, quantities finalized
 * - CANCELLED: Transfer cancelled before completion
 */

import { StockTransfer, StockItem } from '@/types/inventory';
import { TransferStatus } from '@/types/enums';

export interface TransferQuantityUpdate {
  source_item_id: string;
  destination_item_id: string;
  quantity: number;
  source_updates: Partial<StockItem>;
  destination_updates: Partial<StockItem>;
}

/**
 * Calculate quantity updates when starting transfer (PENDING → IN_TRANSIT)
 */
export function calculateTransitQuantities(
  sourceItem: StockItem,
  destinationItem: StockItem,
  quantity: number
): TransferQuantityUpdate {
  return {
    source_item_id: sourceItem.id,
    destination_item_id: destinationItem.id,
    quantity,
    source_updates: {
      // Reduce available at source
      quantity_available: sourceItem.quantity_available - quantity,
      // Don't touch physical yet (still in source warehouse)
      quantity_in_transit: sourceItem.quantity_in_transit + quantity,
    },
    destination_updates: {
      // Destination gets in_transit quantity
      quantity_in_transit: destinationItem.quantity_in_transit + quantity,
    },
  };
}

/**
 * Calculate quantity updates when receiving transfer (IN_TRANSIT → RECEIVED)
 */
export function calculateReceivedQuantities(
  sourceItem: StockItem,
  destinationItem: StockItem,
  quantity: number,
  actualReceivedQty?: number // May differ due to damage in transit
): TransferQuantityUpdate {
  const receivedQty = actualReceivedQty ?? quantity;

  return {
    source_item_id: sourceItem.id,
    destination_item_id: destinationItem.id,
    quantity: receivedQty,
    source_updates: {
      // Remove from physical at source
      quantity_physical: sourceItem.quantity_physical - quantity,
      // Remove from in_transit
      quantity_in_transit: sourceItem.quantity_in_transit - quantity,
    },
    destination_updates: {
      // Add to physical at destination
      quantity_physical: destinationItem.quantity_physical + receivedQty,
      // Add to available
      quantity_available: destinationItem.quantity_available + receivedQty,
      // Remove from in_transit
      quantity_in_transit: destinationItem.quantity_in_transit - quantity,
    },
  };
}

/**
 * Calculate quantity updates when cancelling transfer
 */
export function calculateCancelledQuantities(
  sourceItem: StockItem,
  destinationItem: StockItem,
  quantity: number,
  currentStatus: TransferStatus
): TransferQuantityUpdate | null {
  // Can only cancel PENDING or IN_TRANSIT transfers
  if (currentStatus === TransferStatus.COMPLETED || currentStatus === TransferStatus.CANCELLED) {
    return null;
  }

  if (currentStatus === TransferStatus.PENDING) {
    // No quantity updates needed for PENDING cancellation
    return {
      source_item_id: sourceItem.id,
      destination_item_id: destinationItem.id,
      quantity,
      source_updates: {},
      destination_updates: {},
    };
  }

  // IN_TRANSIT cancellation - restore quantities
  return {
    source_item_id: sourceItem.id,
    destination_item_id: destinationItem.id,
    quantity,
    source_updates: {
      // Restore available
      quantity_available: sourceItem.quantity_available + quantity,
      // Remove from in_transit
      quantity_in_transit: sourceItem.quantity_in_transit - quantity,
    },
    destination_updates: {
      // Remove from in_transit
      quantity_in_transit: destinationItem.quantity_in_transit - quantity,
    },
  };
}

/**
 * Validate if transfer can proceed to next status
 */
export function canTransitionToStatus(
  transfer: StockTransfer,
  newStatus: TransferStatus
): { valid: boolean; error?: string } {
  const validTransitions: Record<TransferStatus, TransferStatus[]> = {
    [TransferStatus.DRAFT]: [TransferStatus.PENDING, TransferStatus.CANCELLED],
    [TransferStatus.PENDING]: [TransferStatus.IN_TRANSIT, TransferStatus.CANCELLED],
    [TransferStatus.IN_TRANSIT]: [TransferStatus.COMPLETED, TransferStatus.CANCELLED],
    [TransferStatus.COMPLETED]: [],
    [TransferStatus.CANCELLED]: [],
  };

  const allowedStatuses = validTransitions[transfer.status];

  if (!allowedStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${transfer.status} to ${newStatus}`,
    };
  }

  return { valid: true };
}

/**
 * Check if source has enough available quantity
 */
export function validateSourceQuantity(
  sourceItem: StockItem,
  quantity: number
): { valid: boolean; error?: string } {
  if (quantity <= 0) {
    return { valid: false, error: 'Quantity must be positive' };
  }

  if (quantity > sourceItem.quantity_available) {
    return {
      valid: false,
      error: `Insufficient available quantity. Available: ${sourceItem.quantity_available}, Requested: ${quantity}`,
    };
  }

  return { valid: true };
}

/**
 * Get transfer status label for UI
 */
export function getTransferStatusLabel(status: TransferStatus): string {
  const labels: Record<TransferStatus, string> = {
    [TransferStatus.DRAFT]: 'Szkic',
    [TransferStatus.PENDING]: 'Oczekuje',
    [TransferStatus.IN_TRANSIT]: 'W transporcie',
    [TransferStatus.COMPLETED]: 'Otrzymano',
    [TransferStatus.CANCELLED]: 'Anulowano',
  };
  return labels[status];
}

/**
 * Get transfer status color for UI
 */
export function getTransferStatusColor(status: TransferStatus): string {
  const colors: Record<TransferStatus, string> = {
    [TransferStatus.DRAFT]: 'text-gray-400 bg-gray-50 border-gray-200',
    [TransferStatus.PENDING]: 'text-blue-600 bg-blue-50 border-blue-200',
    [TransferStatus.IN_TRANSIT]: 'text-purple-600 bg-purple-50 border-purple-200',
    [TransferStatus.COMPLETED]: 'text-green-600 bg-green-50 border-green-200',
    [TransferStatus.CANCELLED]: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status];
}

/**
 * Get transfer status icon for UI
 */
export function getTransferStatusIcon(status: TransferStatus): string {
  const icons: Record<TransferStatus, string> = {
    [TransferStatus.DRAFT]: '📝',
    [TransferStatus.PENDING]: '⏳',
    [TransferStatus.IN_TRANSIT]: '🚚',
    [TransferStatus.COMPLETED]: '✅',
    [TransferStatus.CANCELLED]: '❌',
  };
  return icons[status];
}
