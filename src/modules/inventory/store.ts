'use client';

import { create } from 'zustand';
import { Warehouse, StockItem } from '@/types/inventory';
import { inventoryRepository } from './repository';

interface InventoryStore {
  warehouses: Warehouse[];
  stockItems: StockItem[];
  selectedWarehouseId: string | null;
  isLoading: boolean;
  // Actions - Warehouses
  loadWarehouses: () => Promise<void>;
  createWarehouse: (data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) => Promise<Warehouse>;
  updateWarehouse: (id: string, data: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deleteWarehouse: (id: string, transferToWarehouseId?: string) => Promise<void>;
  // Actions - Stock Items
  loadStockItems: (warehouseId?: string) => Promise<void>;
  adjustStock: (stockItemId: string, quantity: number, reason: string) => Promise<void>;
  createStockItem: (data: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => Promise<StockItem>;
  setSelectedWarehouse: (warehouseId: string | null) => void;
  // Computed
  getLowStockItems: () => StockItem[];
  getStockValue: () => number;
  filteredItems: () => StockItem[];
}

export const useInventoryStore = create<InventoryStore>()((set, get) => ({
  warehouses: [],
  stockItems: [],
  selectedWarehouseId: null,
  isLoading: false,

  loadWarehouses: async () => {
    const warehouses = await inventoryRepository.getAllWarehouses();
    set({ warehouses });
  },

  createWarehouse: async (data) => {
    const newWarehouse = await inventoryRepository.warehouses.create(data);
    set({ warehouses: [...get().warehouses, newWarehouse] });
    return newWarehouse;
  },

  updateWarehouse: async (id, data) => {
    await inventoryRepository.warehouses.update(id, data);
    set({
      warehouses: get().warehouses.map((w) =>
        w.id === id ? { ...w, ...data, updated_at: new Date().toISOString() } : w
      ),
    });
  },

  deleteWarehouse: async (id, transferToWarehouseId) => {
    const { stockItems } = get();
    const itemsInWarehouse = stockItems.filter((item) => item.warehouse_id === id);

    if (transferToWarehouseId) {
      // Transfer all stock items to another warehouse
      for (const item of itemsInWarehouse) {
        await inventoryRepository.stockItems.update(item.id, {
          warehouse_id: transferToWarehouseId,
        });
      }
      set({
        stockItems: stockItems.map((item) =>
          item.warehouse_id === id
            ? { ...item, warehouse_id: transferToWarehouseId }
            : item
        ),
      });
    } else {
      // Delete all stock items in this warehouse
      for (const item of itemsInWarehouse) {
        await inventoryRepository.stockItems.delete(item.id);
      }
      set({
        stockItems: stockItems.filter((item) => item.warehouse_id !== id),
      });
    }

    await inventoryRepository.warehouses.delete(id);
    set({ warehouses: get().warehouses.filter((w) => w.id !== id) });

    // Reset selected warehouse if it was deleted
    if (get().selectedWarehouseId === id) {
      set({ selectedWarehouseId: null });
    }
  },

  loadStockItems: async (warehouseId?: string) => {
    set({ isLoading: true });
    try {
      const stockItems = warehouseId
        ? await inventoryRepository.getStockByWarehouse(warehouseId)
        : await inventoryRepository.getAllStockItems();
      set({ stockItems });
    } finally {
      set({ isLoading: false });
    }
  },

  adjustStock: async (stockItemId: string, quantity: number, reason: string) => {
    await inventoryRepository.adjustStock(stockItemId, quantity, reason);
    const { stockItems } = get();
    set({
      stockItems: stockItems.map((item) =>
        item.id === stockItemId
          ? {
              ...item,
              quantity_physical: item.quantity_physical + quantity,
              quantity_available: item.quantity_available + quantity,
            }
          : item
      ),
    });
  },

  createStockItem: async (data) => {
    const newItem = await inventoryRepository.stockItems.create(data);
    set({ stockItems: [...get().stockItems, newItem] });
    return newItem;
  },

  setSelectedWarehouse: (warehouseId: string | null) => {
    set({ selectedWarehouseId: warehouseId });
  },

  getLowStockItems: () => {
    return get().stockItems.filter(
      (item) => item.is_active && item.quantity_available < item.min_quantity
    );
  },

  getStockValue: () => {
    return get().stockItems.reduce(
      (total, item) => total + item.quantity_physical * item.cost_per_unit,
      0
    );
  },

  filteredItems: () => {
    const { stockItems, selectedWarehouseId } = get();
    if (!selectedWarehouseId) return stockItems;
    return stockItems.filter(
      (item) => item.warehouse_id === selectedWarehouseId
    );
  },
}));
