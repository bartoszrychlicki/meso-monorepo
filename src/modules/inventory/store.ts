'use client';

import { create } from 'zustand';
import { StockItem } from '@/types/inventory';
import { inventoryRepository } from './repository';

interface InventoryStore {
  stockItems: StockItem[];
  isLoading: boolean;
  loadStockItems: () => Promise<void>;
  createStockItem: (data: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => Promise<StockItem>;
  updateStockItem: (id: string, data: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  adjustStock: (stockItemId: string, quantity: number, reason: string) => Promise<void>;
  getLowStockItems: () => StockItem[];
  getStockValue: () => number;
}

export const useInventoryStore = create<InventoryStore>()((set, get) => ({
  stockItems: [],
  isLoading: false,

  loadStockItems: async () => {
    set({ isLoading: true });
    try {
      const stockItems = await inventoryRepository.getAllStockItems();
      set({ stockItems });
    } finally {
      set({ isLoading: false });
    }
  },

  createStockItem: async (data) => {
    const newItem = await inventoryRepository.stockItems.create(data);
    set({ stockItems: [...get().stockItems, newItem] });
    return newItem;
  },

  updateStockItem: async (id, data) => {
    await inventoryRepository.stockItems.update(id, data);
    set({
      stockItems: get().stockItems.map((item) =>
        item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
      ),
    });
  },

  deleteStockItem: async (id) => {
    await inventoryRepository.stockItems.delete(id);
    set({ stockItems: get().stockItems.filter((item) => item.id !== id) });
  },

  adjustStock: async (stockItemId: string, quantity: number, reason: string) => {
    await inventoryRepository.adjustStock(stockItemId, quantity, reason);
    set({
      stockItems: get().stockItems.map((item) =>
        item.id === stockItemId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ),
    });
  },

  getLowStockItems: () => {
    return get().stockItems.filter(
      (item) => item.is_active && item.quantity < item.min_quantity
    );
  },

  getStockValue: () => {
    return get().stockItems.reduce(
      (total, item) => total + item.quantity * item.cost_per_unit,
      0
    );
  },
}));
