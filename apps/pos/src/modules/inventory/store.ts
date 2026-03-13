'use client';

import { create } from 'zustand';
import {
  StockItem,
  Warehouse,
  WarehouseStockItem,
  StockItemComponentWithDetails,
  StockItemUsage,
  InventoryCategory,
} from '@/types/inventory';
import { inventoryRepository } from './repository';

interface InventoryStore {
  stockItems: StockItem[];
  inventoryCategories: InventoryCategory[];
  warehouses: Warehouse[];
  warehouseStockItems: WarehouseStockItem[];
  selectedWarehouseId: string | null;
  isLoading: boolean;
  loadError: string | null;

  // Detail view state
  currentStockItem: StockItem | null;
  currentComponents: StockItemComponentWithDetails[];
  currentUsage: StockItemUsage | null;
  isDetailLoading: boolean;
  detailLoadError: string | null;

  loadAll: () => Promise<void>;
  loadStockItems: () => Promise<void>;
  loadInventoryCategories: () => Promise<void>;
  setSelectedWarehouse: (id: string | null) => void;

  createStockItem: (data: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => Promise<StockItem>;
  updateStockItem: (id: string, data: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;

  adjustStock: (warehouseId: string, stockItemId: string, quantity: number, reason: string) => Promise<void>;
  transferStock: (sourceId: string, targetId: string, itemId: string, quantity: number) => Promise<void>;
  assignToWarehouse: (warehouseId: string, itemId: string, quantity: number, minQuantity: number) => Promise<void>;

  createWarehouse: (data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateWarehouse: (id: string, data: Partial<Warehouse>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  setDefaultWarehouse: (id: string) => Promise<void>;

  createInventoryCategory: (data: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateInventoryCategory: (id: string, data: Partial<InventoryCategory>) => Promise<void>;
  deleteInventoryCategory: (id: string) => Promise<void>;

  getItemsForWarehouse: (warehouseId: string | null) => WarehouseStockItem[];
  getLowStockItems: () => WarehouseStockItem[];
  getStockValue: () => number;

  // Detail view actions
  loadStockItemDetail: (id: string) => Promise<void>;
  loadComponents: (id: string) => Promise<void>;
  loadUsage: (id: string) => Promise<void>;
  addComponent: (parentId: string, componentId: string, quantity: number) => Promise<void>;
  updateComponent: (componentId: string, quantity: number) => Promise<void>;
  removeComponent: (componentId: string, parentId: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>()((set, get) => ({
  stockItems: [],
  inventoryCategories: [],
  warehouses: [],
  warehouseStockItems: [],
  selectedWarehouseId: null,
  isLoading: false,
  loadError: null,

  // Detail view state
  currentStockItem: null,
  currentComponents: [],
  currentUsage: null,
  isDetailLoading: false,
  detailLoadError: null,

  loadAll: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const [stockItemsResult, inventoryCategoriesResult, warehousesResult, warehouseStockItemsResult] =
        await Promise.allSettled([
          inventoryRepository.getAllStockItems(),
          inventoryRepository.getAllInventoryCategories(),
          inventoryRepository.getAllWarehouses(),
          inventoryRepository.getAllWarehouseStockItems(),
        ]);

      const nextState: Partial<InventoryStore> = {};
      const failedSections: string[] = [];

      if (stockItemsResult.status === 'fulfilled') {
        nextState.stockItems = stockItemsResult.value;
      } else {
        failedSections.push('pozycji magazynowych');
      }

      if (inventoryCategoriesResult.status === 'fulfilled') {
        nextState.inventoryCategories = inventoryCategoriesResult.value;
      } else {
        failedSections.push('kategorii');
      }

      if (warehousesResult.status === 'fulfilled') {
        nextState.warehouses = warehousesResult.value;
      } else {
        failedSections.push('magazynow');
      }

      if (warehouseStockItemsResult.status === 'fulfilled') {
        nextState.warehouseStockItems = warehouseStockItemsResult.value;
      } else {
        failedSections.push('stanow magazynowych');
      }

      nextState.loadError = failedSections.length > 0
        ? `Nie udalo sie zaladowac wszystkich danych (${failedSections.join(', ')}). Sprobuj ponownie.`
        : null;

      set(nextState);
    } finally {
      set({ isLoading: false });
    }
  },

  loadStockItems: async () => {
    set({ isLoading: true });
    try {
      const stockItems = await inventoryRepository.getAllStockItems();
      set({ stockItems });
    } finally {
      set({ isLoading: false });
    }
  },

  loadInventoryCategories: async () => {
    try {
      const inventoryCategories = await inventoryRepository.getAllInventoryCategories();
      set({ inventoryCategories });
    } catch {
      set({ loadError: 'Nie udalo sie zaladowac kategorii magazynowych. Sprobuj ponownie.' });
    }
  },

  setSelectedWarehouse: (id) => {
    set({ selectedWarehouseId: id });
  },

  createStockItem: async (data) => {
    const newItem = await inventoryRepository.stockItems.create(data);
    set({ stockItems: [...get().stockItems, newItem] });
    return newItem;
  },

  updateStockItem: async (id, data) => {
    await inventoryRepository.stockItems.update(id, data);
    const updated = { ...get().currentStockItem, ...data, updated_at: new Date().toISOString() };
    set({
      stockItems: get().stockItems.map((item) =>
        item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
      ),
      currentStockItem: get().currentStockItem?.id === id ? updated as StockItem : get().currentStockItem,
    });
  },

  deleteStockItem: async (id) => {
    await inventoryRepository.deleteStockItem(id);
    const wasCurrentItemDeleted = get().currentStockItem?.id === id;

    set({
      stockItems: get().stockItems.filter((item) => item.id !== id),
      warehouseStockItems: get().warehouseStockItems.filter((item) => item.id !== id),
      currentStockItem: wasCurrentItemDeleted ? null : get().currentStockItem,
      currentComponents: get().currentComponents.filter(
        (component) => component.parent_stock_item_id !== id && component.component_stock_item_id !== id
      ),
      currentUsage: wasCurrentItemDeleted ? null : get().currentUsage,
    });
  },

  adjustStock: async (warehouseId: string, stockItemId: string, quantity: number, reason: string) => {
    await inventoryRepository.adjustStock(warehouseId, stockItemId, quantity, reason);
    set({
      warehouseStockItems: get().warehouseStockItems.map((item) =>
        item.warehouse_id === warehouseId && item.id === stockItemId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ),
    });
  },

  transferStock: async (sourceId: string, targetId: string, itemId: string, quantity: number) => {
    await inventoryRepository.transferStock(sourceId, targetId, itemId, quantity);
    // Reload all warehouse stock items to get accurate state
    const warehouseStockItems = await inventoryRepository.getAllWarehouseStockItems();
    set({ warehouseStockItems });
  },

  assignToWarehouse: async (warehouseId: string, itemId: string, quantity: number, minQuantity: number) => {
    await inventoryRepository.assignToWarehouse(warehouseId, itemId, quantity, minQuantity);
    const warehouseStockItems = await inventoryRepository.getAllWarehouseStockItems();
    set({ warehouseStockItems });
  },

  createWarehouse: async (data) => {
    await inventoryRepository.createWarehouse(data);
    const warehouses = await inventoryRepository.getAllWarehouses();
    set({ warehouses });
  },

  updateWarehouse: async (id, data) => {
    await inventoryRepository.updateWarehouse(id, data);
    const warehouses = await inventoryRepository.getAllWarehouses();
    set({ warehouses });
  },

  deleteWarehouse: async (id) => {
    await inventoryRepository.deleteWarehouse(id);
    const warehouses = await inventoryRepository.getAllWarehouses();
    set({ warehouses });
  },

  setDefaultWarehouse: async (id) => {
    await inventoryRepository.setDefaultWarehouse(id);
    const warehouses = await inventoryRepository.getAllWarehouses();
    set({ warehouses });
  },

  createInventoryCategory: async (data) => {
    await inventoryRepository.createInventoryCategory(data);
    const inventoryCategories = await inventoryRepository.getAllInventoryCategories();
    set({ inventoryCategories });
  },

  updateInventoryCategory: async (id, data) => {
    await inventoryRepository.updateInventoryCategory(id, data);
    const inventoryCategories = await inventoryRepository.getAllInventoryCategories();
    set({ inventoryCategories });
  },

  deleteInventoryCategory: async (id) => {
    await inventoryRepository.deleteInventoryCategory(id);
    const inventoryCategories = await inventoryRepository.getAllInventoryCategories();
    set({ inventoryCategories });
  },

  getItemsForWarehouse: (warehouseId) => {
    const items = get().warehouseStockItems;
    if (!warehouseId) return items;
    return items.filter((item) => item.warehouse_id === warehouseId);
  },

  getLowStockItems: () => {
    return get().warehouseStockItems.filter(
      (item) => item.is_active && item.quantity < item.min_quantity
    );
  },

  getStockValue: () => {
    return get().warehouseStockItems.reduce(
      (total, item) => total + item.quantity * item.cost_per_unit,
      0
    );
  },

  // Detail view actions
  loadStockItemDetail: async (id: string) => {
    set({
      isDetailLoading: true,
      currentStockItem: null,
      currentComponents: [],
      currentUsage: null,
      detailLoadError: null,
    });
    try {
      const item = await inventoryRepository.getStockItemById(id);
      if (!item) {
        set({
          currentStockItem: null,
          detailLoadError: 'Nie znaleziono pozycji magazynowej lub nie udalo sie jej zaladowac.',
        });
        return;
      }
      set({ currentStockItem: item });
    } catch {
      set({
        detailLoadError: 'Nie udalo sie zaladowac szczegolow pozycji magazynowej. Sprobuj ponownie.',
      });
    } finally {
      set({ isDetailLoading: false });
    }
  },

  loadComponents: async (id: string) => {
    try {
      const components = await inventoryRepository.getComponentsForItem(id);
      set({ currentComponents: components });
    } catch {
      set({
        currentComponents: [],
        detailLoadError: 'Nie udalo sie zaladowac skladowych pozycji magazynowej. Sprobuj ponownie.',
      });
    }
  },

  loadUsage: async (id: string) => {
    try {
      const usage = await inventoryRepository.getStockItemUsage(id);
      set({ currentUsage: usage });
    } catch {
      set({
        currentUsage: { in_components: [] },
        detailLoadError: 'Nie udalo sie zaladowac uzycia pozycji magazynowej. Sprobuj ponownie.',
      });
    }
  },

  addComponent: async (parentId: string, componentId: string, quantity: number) => {
    await inventoryRepository.addComponent(parentId, componentId, quantity);
    const components = await inventoryRepository.getComponentsForItem(parentId);
    set({ currentComponents: components });
  },

  updateComponent: async (componentId: string, quantity: number) => {
    await inventoryRepository.updateComponent(componentId, quantity);
    // Refresh components for current item
    const currentItem = get().currentStockItem;
    if (currentItem) {
      const components = await inventoryRepository.getComponentsForItem(currentItem.id);
      set({ currentComponents: components });
    }
  },

  removeComponent: async (componentId: string, parentId: string) => {
    await inventoryRepository.removeComponent(componentId);
    const components = await inventoryRepository.getComponentsForItem(parentId);
    set({ currentComponents: components });
  },
}));
