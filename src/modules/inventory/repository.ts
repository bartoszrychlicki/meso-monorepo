import { Warehouse, StockItem, Batch } from '@/types/inventory';
import { createRepository } from '@/lib/data/repository-factory';

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
      (item) => item.is_active && item.current_quantity < item.min_quantity
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
      current_quantity: item.current_quantity + quantity,
    });
  },

  async getExpiringBatches(daysAhead: number = 7): Promise<Batch[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return batchRepo.findMany(
      (batch) =>
        batch.status === 'active' &&
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
};
