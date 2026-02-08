import {
  Warehouse,
  StockItem,
  Batch,
  StockTransfer,
  WastageRecord,
  StockCount,
} from '@/types/inventory';
import {
  BatchStatus,
  TransferStatus,
  WastageCategory,
  StockCountType,
  StockCountStatus,
} from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';
import { calculateBatchStatus } from './utils/batch-status';
import { getBatchesForIssue, getPriorityBatches } from './utils/fefo';
import {
  canTransitionToStatus,
  validateSourceQuantity,
} from './utils/transfer-workflow';
import {
  calculateWastageImpact,
  validateWastageQuantity,
} from './utils/wastage-utils';
import {
  calculateCountVariance,
  generateAdjustmentFromVariance,
  validateCountedQuantity,
} from './utils/stock-count-utils';

const warehouseRepo = createRepository<Warehouse>('warehouses');
const stockItemRepo = createRepository<StockItem>('stock_items');
const batchRepo = createRepository<Batch>('batches');
const transferRepo = createRepository<StockTransfer>('stock_transfers');
const wastageRepo = createRepository<WastageRecord>('wastage_records');
const stockCountRepo = createRepository<StockCount>('stock_counts');

export const inventoryRepository = {
  warehouses: warehouseRepo,
  stockItems: stockItemRepo,
  batches: batchRepo,
  transfers: transferRepo,
  wastage: wastageRepo,
  stockCounts: stockCountRepo,

  async getStockByWarehouse(warehouseId: string): Promise<StockItem[]> {
    return stockItemRepo.findMany(
      (item) => item.warehouse_id === warehouseId && item.is_active
    );
  },

  async getLowStockItems(): Promise<StockItem[]> {
    return stockItemRepo.findMany(
      (item) => item.is_active && item.quantity_available < item.min_quantity
    );
  },

  async adjustStock(
    stockItemId: string,
    quantity: number,
    reason: string
  ): Promise<StockItem> {
    const item = await stockItemRepo.findById(stockItemId);
    if (!item) throw new Error('Stock item not found');

    return stockItemRepo.update(stockItemId, {
      quantity_physical: item.quantity_physical + quantity,
      quantity_available: item.quantity_available + quantity,
    });
  },

  async getExpiringBatches(daysAhead: number = 7): Promise<Batch[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return batchRepo.findMany(
      (batch) =>
        (batch.status === BatchStatus.FRESH ||
          batch.status === BatchStatus.WARNING ||
          batch.status === BatchStatus.CRITICAL) &&
        !!batch.expiry_date &&
        new Date(batch.expiry_date) <= cutoff
    );
  },

  async getAllStockItems(): Promise<StockItem[]> {
    return stockItemRepo.findMany((item) => item.is_active);
  },

  async getAllWarehouses(): Promise<Warehouse[]> {
    return warehouseRepo.findMany((w) => w.is_active);
  },

  // ==================== BATCH MANAGEMENT (Sprint 2) ====================

  async getBatchesByStockItem(stockItemId: string): Promise<Batch[]> {
    return batchRepo.findMany((b) => b.stock_item_id === stockItemId);
  },

  async getBatchesByWarehouse(warehouseId: string): Promise<Batch[]> {
    return batchRepo.findMany((b) => b.warehouse_id === warehouseId);
  },

  async getPriorityBatchesForItem(stockItemId: string): Promise<Batch[]> {
    const batches = await this.getBatchesByStockItem(stockItemId);
    return getPriorityBatches(batches);
  },

  async getCriticalBatches(): Promise<Batch[]> {
    return batchRepo.findMany(
      (b) =>
        b.status === BatchStatus.CRITICAL &&
        b.quantity_current > 0
    );
  },

  async getExpiredBatches(): Promise<Batch[]> {
    return batchRepo.findMany(
      (b) => b.status === BatchStatus.EXPIRED && b.quantity_current > 0
    );
  },

  /**
   * Issue stock using FEFO algorithm
   */
  async issueStock(
    stockItemId: string,
    warehouseId: string,
    quantityNeeded: number
  ): Promise<{ success: boolean; batches: any[] }> {
    const batches = await batchRepo.findMany(
      (b) => b.stock_item_id === stockItemId && b.warehouse_id === warehouseId
    );

    const issuedBatches = getBatchesForIssue(batches, quantityNeeded);

    // Update batch quantities
    for (const issue of issuedBatches) {
      const batch = batches.find((b) => b.id === issue.batch_id);
      if (batch) {
        await batchRepo.update(issue.batch_id, {
          quantity_current: batch.quantity_current - issue.quantity,
        });
      }
    }

    return {
      success: issuedBatches.length > 0,
      batches: issuedBatches,
    };
  },

  /**
   * Update batch status (should be run periodically)
   */
  async updateBatchStatuses(): Promise<number> {
    const allBatches = await batchRepo.findMany(() => true);
    let updatedCount = 0;

    for (const batch of allBatches) {
      const newStatus = calculateBatchStatus(batch);
      if (newStatus !== batch.status) {
        await batchRepo.update(batch.id, { status: newStatus });
        updatedCount++;
      }
    }

    return updatedCount;
  },

  // ==================== STOCK TRANSFERS (Sprint 3) ====================

  /**
   * Create a new stock transfer (status: PENDING)
   */
  async createTransfer(
    fromWarehouseId: string,
    toWarehouseId: string,
    items: { stock_item_id: string; quantity: number }[],
    requestedBy: string,
    notes?: string
  ): Promise<StockTransfer> {
    // Validate all stock items have enough quantity
    for (const item of items) {
      const stockItem = await stockItemRepo.findById(item.stock_item_id);
      if (!stockItem) {
        throw new Error(`Stock item ${item.stock_item_id} not found`);
      }

      const validation = validateSourceQuantity(stockItem, item.quantity);
      if (!validation.valid) {
        throw new Error(`${stockItem.name}: ${validation.error}`);
      }
    }

    // Generate transfer number
    const transferNumber = `TR-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 10000)
    ).padStart(4, '0')}`;

    // Create transfer record
    const transfer = await transferRepo.create({
      transfer_number: transferNumber,
      from_warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId,
      items: items.map((item) => ({
        stock_item_id: item.stock_item_id,
        quantity_requested: item.quantity,
      })),
      status: TransferStatus.PENDING,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      notes,
    });

    return transfer;
  },

  /**
   * Start transfer (PENDING → IN_TRANSIT)
   * Updates quantity_in_transit for all items
   */
  async startTransfer(
    transferId: string,
    shippedBy: string
  ): Promise<StockTransfer> {
    const transfer = await transferRepo.findById(transferId);
    if (!transfer) throw new Error('Transfer not found');

    // Validate status transition
    const canTransition = canTransitionToStatus(transfer, TransferStatus.IN_TRANSIT);
    if (!canTransition.valid) {
      throw new Error(canTransition.error);
    }

    // Update quantities for all items
    for (const item of transfer.items) {
      const stockItem = await stockItemRepo.findById(item.stock_item_id);
      if (!stockItem) continue;

      const quantity = item.quantity_picked ?? item.quantity_requested;

      // Reduce available and increase in_transit at source
      await stockItemRepo.update(stockItem.id, {
        quantity_available: stockItem.quantity_available - quantity,
        quantity_in_transit: stockItem.quantity_in_transit + quantity,
      });
    }

    // Update transfer status
    return transferRepo.update(transferId, {
      status: TransferStatus.IN_TRANSIT,
      shipped_by: shippedBy,
      shipped_at: new Date().toISOString(),
    });
  },

  /**
   * Complete transfer (IN_TRANSIT → RECEIVED)
   * Finalizes quantities at source and destination warehouses
   */
  async receiveTransfer(
    transferId: string,
    receivedBy: string
  ): Promise<StockTransfer> {
    const transfer = await transferRepo.findById(transferId);
    if (!transfer) throw new Error('Transfer not found');

    // Validate status transition
    const canTransition = canTransitionToStatus(transfer, TransferStatus.COMPLETED);
    if (!canTransition.valid) {
      throw new Error(canTransition.error);
    }

    // Process each item
    for (const item of transfer.items) {
      const quantity = item.quantity_received ?? item.quantity_picked ?? item.quantity_requested;

      // Get the base stock item to find its SKU
      const baseItem = await stockItemRepo.findById(item.stock_item_id);
      if (!baseItem) continue;

      // Get all stock items with matching SKU
      const allItems = await stockItemRepo.findMany((si) => si.sku === baseItem.sku);

      // Find source and destination items
      const sourceItem = allItems.find((si) => si.warehouse_id === transfer.from_warehouse_id);
      const destItem = allItems.find((si) => si.warehouse_id === transfer.to_warehouse_id);

      // Update source: reduce physical and in_transit
      if (sourceItem) {
        await stockItemRepo.update(sourceItem.id, {
          quantity_physical: sourceItem.quantity_physical - quantity,
          quantity_in_transit: sourceItem.quantity_in_transit - quantity,
        });
      }

      // Update destination: increase physical, available, and reduce in_transit
      if (destItem) {
        await stockItemRepo.update(destItem.id, {
          quantity_physical: destItem.quantity_physical + quantity,
          quantity_available: destItem.quantity_available + quantity,
          quantity_in_transit: Math.max(0, destItem.quantity_in_transit - quantity),
        });
      }
    }

    // Update transfer status
    return transferRepo.update(transferId, {
      status: TransferStatus.COMPLETED,
      received_by: receivedBy,
      received_at: new Date().toISOString(),
    });
  },

  /**
   * Cancel transfer
   * Restores quantities if transfer was IN_TRANSIT
   */
  async cancelTransfer(transferId: string, reason: string): Promise<StockTransfer> {
    const transfer = await transferRepo.findById(transferId);
    if (!transfer) throw new Error('Transfer not found');

    // Can only cancel PENDING or IN_TRANSIT
    if (transfer.status === TransferStatus.COMPLETED || transfer.status === TransferStatus.CANCELLED) {
      throw new Error('Cannot cancel completed or already cancelled transfer');
    }

    // If IN_TRANSIT, restore quantities
    if (transfer.status === TransferStatus.IN_TRANSIT) {
      for (const item of transfer.items) {
        const stockItem = await stockItemRepo.findById(item.stock_item_id);
        if (!stockItem) continue;

        const quantity = item.quantity_picked ?? item.quantity_requested;

        // Restore available and reduce in_transit
        await stockItemRepo.update(stockItem.id, {
          quantity_available: stockItem.quantity_available + quantity,
          quantity_in_transit: stockItem.quantity_in_transit - quantity,
        });
      }
    }

    // Update transfer status
    return transferRepo.update(transferId, {
      status: TransferStatus.CANCELLED,
      notes: transfer.notes ? `${transfer.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`,
    });
  },

  /**
   * Get transfers by status
   */
  async getTransfersByStatus(status: TransferStatus): Promise<StockTransfer[]> {
    return transferRepo.findMany((t) => t.status === status);
  },

  /**
   * Get transfers for warehouse
   */
  async getTransfersForWarehouse(
    warehouseId: string,
    direction: 'from' | 'to' | 'both' = 'both'
  ): Promise<StockTransfer[]> {
    return transferRepo.findMany((t) => {
      if (direction === 'from') return t.from_warehouse_id === warehouseId;
      if (direction === 'to') return t.to_warehouse_id === warehouseId;
      return (
        t.from_warehouse_id === warehouseId || t.to_warehouse_id === warehouseId
      );
    });
  },

  // ==================== WASTAGE TRACKING (Sprint 3) ====================

  /**
   * Record wastage/shrinkage
   */
  async recordWastage(
    stockItemId: string,
    quantity: number,
    category: WastageCategory,
    reason: string,
    reportedBy: string
  ): Promise<WastageRecord> {
    const stockItem = await stockItemRepo.findById(stockItemId);
    if (!stockItem) throw new Error('Stock item not found');

    // Validate quantity
    const validation = validateWastageQuantity(stockItem, quantity);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calculate impact
    const impact = calculateWastageImpact(stockItem, quantity);

    // Create wastage record
    const wastageRecord = await wastageRepo.create({
      stock_item_id: stockItemId,
      warehouse_id: stockItem.warehouse_id,
      quantity,
      cost_value: impact.value_lost,
      category,
      reason,
      reported_by: reportedBy,
    });

    // Update stock quantities
    await stockItemRepo.update(stockItemId, {
      quantity_physical: impact.new_physical,
      quantity_available: impact.new_available,
    });

    return wastageRecord;
  },

  /**
   * Get wastage records for warehouse
   */
  async getWastageByWarehouse(
    warehouseId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WastageRecord[]> {
    return wastageRepo.findMany((w) => {
      if (w.warehouse_id !== warehouseId) return false;

      if (startDate || endDate) {
        const wastageDate = new Date(w.created_at);
        if (startDate && wastageDate < new Date(startDate)) return false;
        if (endDate && wastageDate > new Date(endDate)) return false;
      }

      return true;
    });
  },

  /**
   * Get wastage records by category
   */
  async getWastageByCategory(category: WastageCategory): Promise<WastageRecord[]> {
    return wastageRepo.findMany((w) => w.category === category);
  },

  // ==================== STOCK COUNT / INVENTORY (Sprint 3) ====================

  /**
   * Create a new stock count
   */
  async createStockCount(
    warehouseId: string,
    type: StockCountType,
    scheduledDate: string,
    countedBy: string[]
  ): Promise<StockCount> {
    // Generate count number
    const countNumber = `INV-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 10000)
    ).padStart(4, '0')}`;

    return stockCountRepo.create({
      count_number: countNumber,
      warehouse_id: warehouseId,
      type,
      status: StockCountStatus.DRAFT,
      scheduled_date: scheduledDate,
      counted_by: countedBy,
      items: [],
    });
  },

  /**
   * Start a stock count
   */
  async startStockCount(countId: string): Promise<StockCount> {
    return stockCountRepo.update(countId, {
      status: StockCountStatus.IN_PROGRESS,
      started_at: new Date().toISOString(),
    });
  },

  /**
   * Add item to stock count and calculate variance
   */
  async addItemToCount(
    countId: string,
    stockItemId: string,
    countedQuantity: number
  ): Promise<StockCount> {
    const count = await stockCountRepo.findById(countId);
    if (!count) throw new Error('Stock count not found');

    const stockItem = await stockItemRepo.findById(stockItemId);
    if (!stockItem) throw new Error('Stock item not found');

    // Validate counted quantity
    const validation = validateCountedQuantity(countedQuantity);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calculate variance
    const variance = calculateCountVariance(stockItem, countedQuantity);

    // Add to items
    const updatedItems = [
      ...count.items,
      {
        stock_item_id: stockItemId,
        quantity_system: variance.system_quantity,
        quantity_counted: countedQuantity,
        variance: variance.variance,
        variance_cost: variance.variance_value,
      },
    ];

    return stockCountRepo.update(countId, {
      items: updatedItems,
    });
  },

  /**
   * Complete stock count
   */
  async completeStockCount(countId: string): Promise<StockCount> {
    return stockCountRepo.update(countId, {
      status: StockCountStatus.COMPLETED,
      completed_at: new Date().toISOString(),
    });
  },

  /**
   * Apply stock count adjustments
   */
  async applyStockCountAdjustments(countId: string): Promise<number> {
    const count = await stockCountRepo.findById(countId);
    if (!count) throw new Error('Stock count not found');

    let adjustedCount = 0;

    for (const item of count.items) {
      if (item.variance && item.variance !== 0 && item.quantity_counted !== undefined) {
        const stockItem = await stockItemRepo.findById(item.stock_item_id);
        if (stockItem) {
          const variance = calculateCountVariance(stockItem, item.quantity_counted);
          const adjustment = generateAdjustmentFromVariance(variance);

          await stockItemRepo.update(item.stock_item_id, adjustment);
          adjustedCount++;
        }
      }
    }

    return adjustedCount;
  },

  /**
   * Get stock counts for warehouse
   */
  async getStockCountsByWarehouse(warehouseId: string): Promise<StockCount[]> {
    return stockCountRepo.findMany((c) => c.warehouse_id === warehouseId);
  },
};
