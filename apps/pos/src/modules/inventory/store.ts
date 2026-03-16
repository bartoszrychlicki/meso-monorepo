'use client';

import { create } from 'zustand';
import {
  InventoryCategory,
  InventoryCount,
  InventoryCountLine,
  InventoryCountScope,
  StockItem,
  StockItemComponentWithDetails,
  StockItemUsage,
  StockItemWarehouseAssignment,
  Warehouse,
  WarehouseStockItem,
} from '@/types/inventory';
import { inventoryRepository } from './repository';

interface InventoryStore {
  stockItems: StockItem[];
  inventoryCategories: InventoryCategory[];
  warehouses: Warehouse[];
  warehouseStockItems: WarehouseStockItem[];
  inventoryCounts: InventoryCount[];
  selectedWarehouseId: string | null;
  isLoading: boolean;
  loadError: string | null;

  currentStockItem: StockItem | null;
  currentWarehouseAssignments: StockItemWarehouseAssignment[];
  currentComponents: StockItemComponentWithDetails[];
  currentUsage: StockItemUsage | null;
  isDetailLoading: boolean;
  detailLoadError: string | null;

  currentInventoryCount: InventoryCount | null;
  currentInventoryCountLines: InventoryCountLine[];
  isInventoryCountLoading: boolean;
  inventoryCountLoadError: string | null;

  loadAll: () => Promise<void>;
  loadStockItems: () => Promise<void>;
  loadInventoryCategories: () => Promise<void>;
  loadInventoryCounts: () => Promise<void>;
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

  createInventoryCount: (scope: InventoryCountScope, warehouseId?: string) => Promise<InventoryCount>;
  loadInventoryCountDetail: (id: string) => Promise<void>;
  updateInventoryCountComment: (id: string, comment: string | null) => Promise<void>;
  updateInventoryCountLine: (lineId: string, patch: Partial<InventoryCountLine>) => Promise<void>;
  addStockItemToInventoryCount: (countId: string, warehouseId: string, stockItemId: string) => Promise<void>;
  approveInventoryCount: (id: string) => Promise<void>;
  cancelInventoryCount: (id: string) => Promise<void>;

  getItemsForWarehouse: (warehouseId: string | null) => WarehouseStockItem[];
  getLowStockItems: () => WarehouseStockItem[];
  getStockValue: () => number;

  loadStockItemDetail: (id: string) => Promise<void>;
  loadWarehouseAssignments: (stockItemId: string) => Promise<void>;
  loadComponents: (id: string) => Promise<void>;
  loadUsage: (id: string) => Promise<void>;
  addComponent: (parentId: string, componentId: string, quantity: number) => Promise<void>;
  updateComponent: (componentId: string, quantity: number) => Promise<void>;
  removeComponent: (componentId: string, parentId: string) => Promise<void>;
}

async function refreshInventoryCountDetail(
  countId: string,
  set: (partial: Partial<InventoryStore>) => void
): Promise<void> {
  const detail = await inventoryRepository.getInventoryCountById(countId);
  if (!detail) {
    throw new Error('Nie znaleziono inwentaryzacji');
  }

  set({
    currentInventoryCount: detail.count,
    currentInventoryCountLines: detail.lines,
    inventoryCountLoadError: null,
  });
}

export const useInventoryStore = create<InventoryStore>()((set, get) => ({
  stockItems: [],
  inventoryCategories: [],
  warehouses: [],
  warehouseStockItems: [],
  inventoryCounts: [],
  selectedWarehouseId: null,
  isLoading: false,
  loadError: null,

  currentStockItem: null,
  currentWarehouseAssignments: [],
  currentComponents: [],
  currentUsage: null,
  isDetailLoading: false,
  detailLoadError: null,

  currentInventoryCount: null,
  currentInventoryCountLines: [],
  isInventoryCountLoading: false,
  inventoryCountLoadError: null,

  loadAll: async () => {
    set({ isLoading: true, loadError: null });

    try {
      const [
        stockItemsResult,
        inventoryCategoriesResult,
        warehousesResult,
        warehouseStockItemsResult,
        inventoryCountsResult,
      ] = await Promise.allSettled([
        inventoryRepository.getAllStockItems(),
        inventoryRepository.getAllInventoryCategories(),
        inventoryRepository.getAllWarehouses(),
        inventoryRepository.getAllWarehouseStockItems(),
        inventoryRepository.getInventoryCounts(),
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

      if (inventoryCountsResult.status === 'fulfilled') {
        nextState.inventoryCounts = inventoryCountsResult.value;
      } else {
        failedSections.push('inwentaryzacji');
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
      const message = 'Nie udalo sie zaladowac kategorii magazynowych. Sprobuj ponownie.';
      set({
        loadError: message,
        detailLoadError: message,
        inventoryCountLoadError: message,
      });
    }
  },

  loadInventoryCounts: async () => {
    try {
      const inventoryCounts = await inventoryRepository.getInventoryCounts();
      set({ inventoryCounts });
    } catch {
      set({
        loadError: 'Nie udalo sie zaladowac listy inwentaryzacji. Sprobuj ponownie.',
      });
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
    const updatedItem = await inventoryRepository.stockItems.update(id, data);
    set({
      stockItems: get().stockItems.map((item) => (item.id === id ? updatedItem : item)),
      warehouseStockItems: get().warehouseStockItems.map((item) =>
        item.id === id ? { ...item, ...updatedItem } : item
      ),
      currentStockItem: get().currentStockItem?.id === id ? updatedItem : get().currentStockItem,
    });
  },

  deleteStockItem: async (id) => {
    await inventoryRepository.deleteStockItem(id);
    const wasCurrentItemDeleted = get().currentStockItem?.id === id;

    set({
      stockItems: get().stockItems.filter((item) => item.id !== id),
      warehouseStockItems: get().warehouseStockItems.filter((item) => item.id !== id),
      currentStockItem: wasCurrentItemDeleted ? null : get().currentStockItem,
      currentWarehouseAssignments: wasCurrentItemDeleted ? [] : get().currentWarehouseAssignments,
      currentComponents: get().currentComponents.filter(
        (component) => component.parent_stock_item_id !== id && component.component_stock_item_id !== id
      ),
      currentUsage: wasCurrentItemDeleted ? null : get().currentUsage,
    });
  },

  adjustStock: async (warehouseId, stockItemId, quantity, reason) => {
    await inventoryRepository.adjustStock(warehouseId, stockItemId, quantity, reason);
    const warehouseStockItems = await inventoryRepository.getAllWarehouseStockItems();
    set({ warehouseStockItems });
  },

  transferStock: async (sourceId, targetId, itemId, quantity) => {
    await inventoryRepository.transferStock(sourceId, targetId, itemId, quantity);
    const warehouseStockItems = await inventoryRepository.getAllWarehouseStockItems();
    set({ warehouseStockItems });
  },

  assignToWarehouse: async (warehouseId, itemId, quantity, minQuantity) => {
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

  createInventoryCount: async (scope, warehouseId) => {
    const detail = await inventoryRepository.createInventoryCount(scope, warehouseId);
    set({
      inventoryCounts: [detail.count, ...get().inventoryCounts],
      currentInventoryCount: detail.count,
      currentInventoryCountLines: detail.lines,
      inventoryCountLoadError: null,
    });
    return detail.count;
  },

  loadInventoryCountDetail: async (id) => {
    set({
      isInventoryCountLoading: true,
      currentInventoryCount: null,
      currentInventoryCountLines: [],
      inventoryCountLoadError: null,
    });

    try {
      const detail = await inventoryRepository.getInventoryCountById(id);

      if (!detail) {
        set({
          inventoryCountLoadError: 'Nie znaleziono inwentaryzacji lub nie udalo sie jej zaladowac.',
        });
        return;
      }

      set({
        currentInventoryCount: detail.count,
        currentInventoryCountLines: detail.lines,
      });
    } catch {
      set({
        inventoryCountLoadError: 'Nie udalo sie zaladowac inwentaryzacji. Sprobuj ponownie.',
      });
    } finally {
      set({ isInventoryCountLoading: false });
    }
  },

  updateInventoryCountComment: async (id, comment) => {
    await inventoryRepository.updateInventoryCount(id, {
      comment: comment?.trim() || null,
    });
    await refreshInventoryCountDetail(id, set);
  },

  updateInventoryCountLine: async (lineId, patch) => {
    await inventoryRepository.updateInventoryCountLine(lineId, patch);
    const currentCount = get().currentInventoryCount;
    if (currentCount) {
      await refreshInventoryCountDetail(currentCount.id, set);
    }
  },

  addStockItemToInventoryCount: async (countId, warehouseId, stockItemId) => {
    await inventoryRepository.addStockItemToInventoryCount(countId, warehouseId, stockItemId);
    await refreshInventoryCountDetail(countId, set);
  },

  approveInventoryCount: async (id) => {
    await inventoryRepository.approveInventoryCount(id);
    const [warehouseStockItems, inventoryCounts] = await Promise.all([
      inventoryRepository.getAllWarehouseStockItems(),
      inventoryRepository.getInventoryCounts(),
    ]);
    set({ warehouseStockItems, inventoryCounts });
    await refreshInventoryCountDetail(id, set);
  },

  cancelInventoryCount: async (id) => {
    await inventoryRepository.cancelInventoryCount(id);
    const inventoryCounts = await inventoryRepository.getInventoryCounts();
    set({ inventoryCounts });
    await refreshInventoryCountDetail(id, set);
  },

  getItemsForWarehouse: (warehouseId) => {
    const items = get().warehouseStockItems;
    if (!warehouseId) {
      return items;
    }
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

  loadStockItemDetail: async (id) => {
    set({
      isDetailLoading: true,
      currentStockItem: null,
      currentWarehouseAssignments: [],
      currentComponents: [],
      currentUsage: null,
      detailLoadError: null,
    });

    try {
      const item = await inventoryRepository.getStockItemById(id);
      if (!item) {
        set({
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

  loadWarehouseAssignments: async (stockItemId) => {
    try {
      const assignments = await inventoryRepository.getWarehouseAssignmentsForStockItem(stockItemId);
      set({ currentWarehouseAssignments: assignments });
    } catch {
      set({
        currentWarehouseAssignments: [],
        detailLoadError: 'Nie udalo sie zaladowac stanow pozycji w magazynach. Sprobuj ponownie.',
      });
    }
  },

  loadComponents: async (id) => {
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

  loadUsage: async (id) => {
    try {
      const usage = await inventoryRepository.getStockItemUsage(id);
      set({ currentUsage: usage });
    } catch {
      set({
        currentUsage: { in_components: [], in_recipes: [] },
        detailLoadError: 'Nie udalo sie zaladowac uzycia pozycji magazynowej. Sprobuj ponownie.',
      });
    }
  },

  addComponent: async (parentId, componentId, quantity) => {
    await inventoryRepository.addComponent(parentId, componentId, quantity);
    const components = await inventoryRepository.getComponentsForItem(parentId);
    set({ currentComponents: components });
  },

  updateComponent: async (componentId, quantity) => {
    await inventoryRepository.updateComponent(componentId, quantity);
    const currentItem = get().currentStockItem;
    if (currentItem) {
      const components = await inventoryRepository.getComponentsForItem(currentItem.id);
      set({ currentComponents: components });
    }
  },

  removeComponent: async (componentId, parentId) => {
    await inventoryRepository.removeComponent(componentId);
    const components = await inventoryRepository.getComponentsForItem(parentId);
    set({ currentComponents: components });
  },
}));
