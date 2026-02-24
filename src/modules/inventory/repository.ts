import { StockItem } from '@/types/inventory';
import { createRepository } from '@/lib/data/repository-factory';

const stockItemRepo = createRepository<StockItem>('stock_items');

export const inventoryRepository = {
  stockItems: stockItemRepo,

  async getAllStockItems(): Promise<StockItem[]> {
    return stockItemRepo.findMany((item) => item.is_active);
  },

  async getLowStockItems(): Promise<StockItem[]> {
    return stockItemRepo.findMany(
      (item) => item.is_active && item.quantity < item.min_quantity
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
      quantity: item.quantity + quantity,
    });
  },
};
