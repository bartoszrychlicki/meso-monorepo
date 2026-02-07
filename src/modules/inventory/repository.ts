import { Warehouse, StockItem, Batch } from '@/types/inventory';
import { BatchStatus } from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';
import { calculateBatchStatus } from './utils/batch-status';
import { getBatchesForIssue, getPriorityBatches } from './utils/fefo';

const warehouseRepo = createRepository<Warehouse>('warehouses');
const stockItemRepo = createRepository<StockItem>('stock_items');
const batchRepo = createRepository<Batch>('batches');

export const inventoryRepository = {
  warehouses: warehouseRepo,
  stockItems: stockItemRepo,
  batches: batchRepo,

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
};
