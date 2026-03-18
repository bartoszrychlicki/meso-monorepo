import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InventoryCount,
  InventoryCountLine,
  StockItem,
  Warehouse,
  WarehouseStockItem,
  StockItemComponentWithDetails,
} from '@/types/inventory';
import { ProductCategory, VatRate, ConsumptionType } from '@/types/enums';

// Mock inventory repository
const mockGetAllStockItems = vi.fn();
const mockGetAllInventoryCategories = vi.fn();
const mockGetAllWarehouses = vi.fn();
const mockGetAllWarehouseStockItems = vi.fn();
const mockGetInventoryCounts = vi.fn();
const mockStockItemsCreate = vi.fn();
const mockStockItemsUpdate = vi.fn();
const mockDeleteStockItem = vi.fn();
const mockAdjustStock = vi.fn();
const mockTransferStock = vi.fn();
const mockAssignToWarehouse = vi.fn();
const mockCreateWarehouse = vi.fn();
const mockUpdateWarehouse = vi.fn();
const mockDeleteWarehouse = vi.fn();
const mockSetDefaultWarehouse = vi.fn();
const mockCreateInventoryCategory = vi.fn();
const mockUpdateInventoryCategory = vi.fn();
const mockDeleteInventoryCategory = vi.fn();
const mockGetStockItemById = vi.fn();
const mockGetWarehouseAssignmentsForStockItem = vi.fn();
const mockGetComponentsForItem = vi.fn();
const mockGetStockItemUsage = vi.fn();
const mockAddComponent = vi.fn();
const mockUpdateComponent = vi.fn();
const mockRemoveComponent = vi.fn();
const mockCreateInventoryCount = vi.fn();
const mockGetInventoryCountById = vi.fn();
const mockUpdateInventoryCount = vi.fn();
const mockUpdateInventoryCountLine = vi.fn();
const mockAddStockItemToInventoryCount = vi.fn();
const mockApproveInventoryCount = vi.fn();
const mockCancelInventoryCount = vi.fn();

vi.mock('../repository', () => ({
  inventoryRepository: {
    getAllStockItems: (...args: unknown[]) => mockGetAllStockItems(...args),
    getAllInventoryCategories: (...args: unknown[]) => mockGetAllInventoryCategories(...args),
    getAllWarehouses: (...args: unknown[]) => mockGetAllWarehouses(...args),
    getAllWarehouseStockItems: (...args: unknown[]) => mockGetAllWarehouseStockItems(...args),
    getInventoryCounts: (...args: unknown[]) => mockGetInventoryCounts(...args),
    deleteStockItem: (...args: unknown[]) => mockDeleteStockItem(...args),
    adjustStock: (...args: unknown[]) => mockAdjustStock(...args),
    transferStock: (...args: unknown[]) => mockTransferStock(...args),
    assignToWarehouse: (...args: unknown[]) => mockAssignToWarehouse(...args),
    createWarehouse: (...args: unknown[]) => mockCreateWarehouse(...args),
    updateWarehouse: (...args: unknown[]) => mockUpdateWarehouse(...args),
    deleteWarehouse: (...args: unknown[]) => mockDeleteWarehouse(...args),
    setDefaultWarehouse: (...args: unknown[]) => mockSetDefaultWarehouse(...args),
    createInventoryCategory: (...args: unknown[]) => mockCreateInventoryCategory(...args),
    updateInventoryCategory: (...args: unknown[]) => mockUpdateInventoryCategory(...args),
    deleteInventoryCategory: (...args: unknown[]) => mockDeleteInventoryCategory(...args),
    createInventoryCount: (...args: unknown[]) => mockCreateInventoryCount(...args),
    getInventoryCountById: (...args: unknown[]) => mockGetInventoryCountById(...args),
    updateInventoryCount: (...args: unknown[]) => mockUpdateInventoryCount(...args),
    updateInventoryCountLine: (...args: unknown[]) => mockUpdateInventoryCountLine(...args),
    addStockItemToInventoryCount: (...args: unknown[]) => mockAddStockItemToInventoryCount(...args),
    approveInventoryCount: (...args: unknown[]) => mockApproveInventoryCount(...args),
    cancelInventoryCount: (...args: unknown[]) => mockCancelInventoryCount(...args),
    getStockItemById: (...args: unknown[]) => mockGetStockItemById(...args),
    getWarehouseAssignmentsForStockItem: (...args: unknown[]) =>
      mockGetWarehouseAssignmentsForStockItem(...args),
    getComponentsForItem: (...args: unknown[]) => mockGetComponentsForItem(...args),
    getStockItemUsage: (...args: unknown[]) => mockGetStockItemUsage(...args),
    addComponent: (...args: unknown[]) => mockAddComponent(...args),
    updateComponent: (...args: unknown[]) => mockUpdateComponent(...args),
    removeComponent: (...args: unknown[]) => mockRemoveComponent(...args),
    stockItems: {
      create: (...args: unknown[]) => mockStockItemsCreate(...args),
      update: (...args: unknown[]) => mockStockItemsUpdate(...args),
    },
  },
}));

import { useInventoryStore } from '../store';

const makeStockItem = (overrides: Partial<StockItem> = {}): StockItem => ({
  id: 'si-001',
  name: 'Test Item',
  sku: 'TEST-001',
  product_category: ProductCategory.RAW_MATERIAL,
  unit: 'g',
  cost_per_unit: 0.05,
  allergens: [],
  is_active: true,
  vat_rate: VatRate.PTU_B,
  consumption_type: ConsumptionType.PRODUCT,
  shelf_life_days: 0,
  default_min_quantity: 0,
  storage_location: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeWarehouse = (overrides: Partial<Warehouse> = {}): Warehouse => ({
  id: 'wh-001',
  name: 'Test Warehouse',
  location_id: null,
  is_active: true,
  is_default: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeWarehouseStockItem = (overrides: Partial<WarehouseStockItem> = {}): WarehouseStockItem => ({
  id: 'si-001',
  name: 'Test Item',
  sku: 'TEST-001',
  product_category: ProductCategory.RAW_MATERIAL,
  unit: 'g',
  cost_per_unit: 0.05,
  allergens: [],
  is_active: true,
  vat_rate: VatRate.PTU_B,
  consumption_type: ConsumptionType.PRODUCT,
  shelf_life_days: 0,
  default_min_quantity: 0,
  storage_location: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  warehouse_id: 'wh-001',
  warehouse_name: 'Test Warehouse',
  quantity: 1000,
  min_quantity: 500,
  warehouse_stock_id: 'ws-001',
  ...overrides,
});

const makeInventoryCount = (overrides: Partial<InventoryCount> = {}): InventoryCount => ({
  id: 'count-001',
  number: 'INW 1/2026',
  scope: 'single',
  warehouse_id: 'wh-001',
  status: 'draft',
  comment: null,
  created_by: null,
  approved_at: null,
  created_at: '2026-03-16T10:00:00Z',
  updated_at: '2026-03-16T10:00:00Z',
  warehouse_name: 'Test Warehouse',
  total_lines: 1,
  counted_lines: 0,
  difference_lines: 0,
  ...overrides,
});

const makeInventoryCountLine = (overrides: Partial<InventoryCountLine> = {}): InventoryCountLine => ({
  id: 'line-001',
  inventory_count_id: 'count-001',
  warehouse_id: 'wh-001',
  stock_item_id: 'si-001',
  stock_item_name: 'Test Item',
  stock_item_sku: 'TEST-001',
  stock_item_unit: 'g',
  expected_quantity: 1000,
  counted_quantity: null,
  note: null,
  edited_inventory_category_id: null,
  edited_storage_location: null,
  sort_order: 0,
  created_at: '2026-03-16T10:00:00Z',
  updated_at: '2026-03-16T10:00:00Z',
  warehouse_name: 'Test Warehouse',
  ...overrides,
});

describe('useInventoryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInventoryStore.setState({
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
    });
  });

  describe('loadAll', () => {
    it('loads stock items, warehouses, and warehouse stock items', async () => {
      const items = [makeStockItem({ id: '1' })];
      const categories = [{ id: 'cat-1', name: 'Warzywa', description: null, sort_order: 1, is_active: true }];
      const warehouses = [makeWarehouse({ id: 'wh-1' })];
      const whItems = [makeWarehouseStockItem({ id: '1', warehouse_id: 'wh-1' })];

      mockGetAllStockItems.mockResolvedValue(items);
      mockGetAllInventoryCategories.mockResolvedValue(categories);
      mockGetAllWarehouses.mockResolvedValue(warehouses);
      mockGetAllWarehouseStockItems.mockResolvedValue(whItems);
      mockGetInventoryCounts.mockResolvedValue([]);

      await useInventoryStore.getState().loadAll();

      expect(useInventoryStore.getState().stockItems).toEqual(items);
      expect(useInventoryStore.getState().inventoryCategories).toEqual(categories);
      expect(useInventoryStore.getState().warehouses).toEqual(warehouses);
      expect(useInventoryStore.getState().warehouseStockItems).toEqual(whItems);
      expect(useInventoryStore.getState().isLoading).toBe(false);
      expect(useInventoryStore.getState().loadError).toBeNull();
    });

    it('sets isLoading during fetch', async () => {
      let resolveItems: (value: StockItem[]) => void;
      mockGetAllStockItems.mockReturnValue(
        new Promise<StockItem[]>((resolve) => { resolveItems = resolve; })
      );
      mockGetAllInventoryCategories.mockResolvedValue([]);
      mockGetAllWarehouses.mockResolvedValue([]);
      mockGetAllWarehouseStockItems.mockResolvedValue([]);
      mockGetInventoryCounts.mockResolvedValue([]);

      const loadPromise = useInventoryStore.getState().loadAll();
      expect(useInventoryStore.getState().isLoading).toBe(true);

      resolveItems!([]);
      await loadPromise;

      expect(useInventoryStore.getState().isLoading).toBe(false);
    });

    it('keeps successful data and exposes loadError when one request fails', async () => {
      const items = [makeStockItem({ id: '1' })];
      const categories = [{ id: 'cat-1', name: 'Warzywa', description: null, sort_order: 1, is_active: true }];
      const warehouses = [makeWarehouse({ id: 'wh-1' })];

      mockGetAllStockItems.mockResolvedValue(items);
      mockGetAllInventoryCategories.mockResolvedValue(categories);
      mockGetAllWarehouses.mockResolvedValue(warehouses);
      mockGetAllWarehouseStockItems.mockRejectedValue(new Error('Network error'));
      mockGetInventoryCounts.mockResolvedValue([]);

      await useInventoryStore.getState().loadAll();

      expect(useInventoryStore.getState().stockItems).toEqual(items);
      expect(useInventoryStore.getState().inventoryCategories).toEqual(categories);
      expect(useInventoryStore.getState().warehouses).toEqual(warehouses);
      expect(useInventoryStore.getState().warehouseStockItems).toEqual([]);
      expect(useInventoryStore.getState().isLoading).toBe(false);
      expect(useInventoryStore.getState().loadError).toContain('stanow magazynowych');
    });

    it('clears previous loadError after a successful retry', async () => {
      useInventoryStore.setState({ loadError: 'old error' });

      mockGetAllStockItems.mockResolvedValue([]);
      mockGetAllInventoryCategories.mockResolvedValue([]);
      mockGetAllWarehouses.mockResolvedValue([]);
      mockGetAllWarehouseStockItems.mockResolvedValue([]);
      mockGetInventoryCounts.mockResolvedValue([]);

      await useInventoryStore.getState().loadAll();

      expect(useInventoryStore.getState().loadError).toBeNull();
    });
  });

  describe('loadStockItems', () => {
    it('loads stock items without mutating shared loadError', async () => {
      const items = [makeStockItem({ id: 'stock-1' })];
      useInventoryStore.setState({ loadError: 'old error' });
      mockGetAllStockItems.mockResolvedValue(items);

      await useInventoryStore.getState().loadStockItems();

      expect(useInventoryStore.getState().stockItems).toEqual(items);
      expect(useInventoryStore.getState().loadError).toBe('old error');
      expect(useInventoryStore.getState().isLoading).toBe(false);
    });

    it('captures network failure without throwing unhandled rejection', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      useInventoryStore.setState({ loadError: 'existing inventory warning' });
      mockGetAllStockItems.mockRejectedValue(new Error('TypeError: Load failed (example.supabase.co)'));

      await expect(useInventoryStore.getState().loadStockItems()).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[InventoryStore] loadStockItems failed:',
        expect.any(Error)
      );
      expect(useInventoryStore.getState().loadError).toBe('existing inventory warning');
      expect(useInventoryStore.getState().isLoading).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('setSelectedWarehouse', () => {
    it('sets selected warehouse ID', () => {
      useInventoryStore.getState().setSelectedWarehouse('wh-001');
      expect(useInventoryStore.getState().selectedWarehouseId).toBe('wh-001');
    });

    it('sets null for all warehouses', () => {
      useInventoryStore.getState().setSelectedWarehouse('wh-001');
      useInventoryStore.getState().setSelectedWarehouse(null);
      expect(useInventoryStore.getState().selectedWarehouseId).toBeNull();
    });
  });

  describe('getItemsForWarehouse', () => {
    it('returns all items when warehouse is null', () => {
      const items = [
        makeWarehouseStockItem({ id: '1', warehouse_id: 'wh-1' }),
        makeWarehouseStockItem({ id: '2', warehouse_id: 'wh-2' }),
      ];
      useInventoryStore.setState({ warehouseStockItems: items });

      const result = useInventoryStore.getState().getItemsForWarehouse(null);
      expect(result).toHaveLength(2);
    });

    it('filters items by warehouse ID', () => {
      const items = [
        makeWarehouseStockItem({ id: '1', warehouse_id: 'wh-1' }),
        makeWarehouseStockItem({ id: '2', warehouse_id: 'wh-2' }),
      ];
      useInventoryStore.setState({ warehouseStockItems: items });

      const result = useInventoryStore.getState().getItemsForWarehouse('wh-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('createStockItem', () => {
    it('adds new item to store', async () => {
      const newItem = makeStockItem({ id: 'new-123' });
      mockStockItemsCreate.mockResolvedValue(newItem);

      const result = await useInventoryStore.getState().createStockItem({
        name: newItem.name,
        sku: newItem.sku,
        product_category: newItem.product_category,
        unit: newItem.unit,
        cost_per_unit: newItem.cost_per_unit,
        allergens: newItem.allergens,
        is_active: newItem.is_active,
        vat_rate: newItem.vat_rate,
        consumption_type: newItem.consumption_type,
        shelf_life_days: newItem.shelf_life_days,
        default_min_quantity: newItem.default_min_quantity,
        storage_location: newItem.storage_location,
      });

      expect(result).toEqual(newItem);
      expect(useInventoryStore.getState().stockItems).toContainEqual(newItem);
    });
  });

  describe('updateStockItem', () => {
    it('updates item in store', async () => {
      const item = makeStockItem({ id: 'si-001', name: 'Old Name' });
      useInventoryStore.setState({ stockItems: [item] });

      mockStockItemsUpdate.mockResolvedValue({ ...item, name: 'New Name' });

      await useInventoryStore.getState().updateStockItem('si-001', { name: 'New Name' });

      const updated = useInventoryStore.getState().stockItems.find((i) => i.id === 'si-001');
      expect(updated?.name).toBe('New Name');
    });
  });

  describe('deleteStockItem', () => {
    it('removes item from store', async () => {
      const items = [makeStockItem({ id: '1' }), makeStockItem({ id: '2' })];
      const whItems = [
        makeWarehouseStockItem({ id: '1', warehouse_stock_id: 'ws-1' }),
        makeWarehouseStockItem({ id: '2', warehouse_stock_id: 'ws-2' }),
      ];
      useInventoryStore.setState({ stockItems: items, warehouseStockItems: whItems });

      mockDeleteStockItem.mockResolvedValue(undefined);

      await useInventoryStore.getState().deleteStockItem('1');

      expect(mockDeleteStockItem).toHaveBeenCalledWith('1');
      expect(useInventoryStore.getState().stockItems).toHaveLength(1);
      expect(useInventoryStore.getState().stockItems[0].id).toBe('2');
      expect(useInventoryStore.getState().warehouseStockItems).toHaveLength(1);
      expect(useInventoryStore.getState().warehouseStockItems[0].id).toBe('2');
    });
  });

  describe('inventory categories CRUD', () => {
    const category = {
      id: 'cat-001',
      name: 'Warzywa',
      description: null,
      sort_order: 1,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('reloads categories after create', async () => {
      mockCreateInventoryCategory.mockResolvedValue(category);
      mockGetAllInventoryCategories.mockResolvedValue([category]);

      await useInventoryStore.getState().createInventoryCategory({
        name: category.name,
        description: category.description,
        sort_order: category.sort_order,
        is_active: category.is_active,
      });

      expect(mockCreateInventoryCategory).toHaveBeenCalled();
      expect(useInventoryStore.getState().inventoryCategories).toEqual([category]);
    });

    it('reloads categories after update', async () => {
      mockUpdateInventoryCategory.mockResolvedValue(category);
      mockGetAllInventoryCategories.mockResolvedValue([category]);

      await useInventoryStore.getState().updateInventoryCategory('cat-001', { name: 'Nowa nazwa' });

      expect(mockUpdateInventoryCategory).toHaveBeenCalledWith('cat-001', { name: 'Nowa nazwa' });
      expect(useInventoryStore.getState().inventoryCategories).toEqual([category]);
    });

    it('reloads categories after delete', async () => {
      mockDeleteInventoryCategory.mockResolvedValue(undefined);
      mockGetAllInventoryCategories.mockResolvedValue([]);

      await useInventoryStore.getState().deleteInventoryCategory('cat-001');

      expect(mockDeleteInventoryCategory).toHaveBeenCalledWith('cat-001');
      expect(useInventoryStore.getState().inventoryCategories).toEqual([]);
    });
  });

  describe('inventory counts', () => {
    it('stores created inventory count detail in state', async () => {
      const count = makeInventoryCount();
      const line = makeInventoryCountLine();

      mockCreateInventoryCount.mockResolvedValue({
        count,
        lines: [line],
      });

      const created = await useInventoryStore.getState().createInventoryCount('single', 'wh-001');

      expect(mockCreateInventoryCount).toHaveBeenCalledWith('single', 'wh-001');
      expect(created).toEqual(count);
      expect(useInventoryStore.getState().inventoryCounts).toEqual([count]);
      expect(useInventoryStore.getState().currentInventoryCount).toEqual(count);
      expect(useInventoryStore.getState().currentInventoryCountLines).toEqual([line]);
    });

    it('approves count and refreshes stock plus summary data', async () => {
      const draftCount = makeInventoryCount();
      const approvedCount = makeInventoryCount({
        status: 'approved',
        counted_lines: 1,
        difference_lines: 1,
      });
      const approvedLine = makeInventoryCountLine({ counted_quantity: 900 });
      const refreshedStock = [
        makeWarehouseStockItem({ id: 'si-001', warehouse_id: 'wh-001', quantity: 900 }),
      ];

      useInventoryStore.setState({
        currentInventoryCount: draftCount,
        currentInventoryCountLines: [makeInventoryCountLine()],
      });

      mockApproveInventoryCount.mockResolvedValue(approvedCount);
      mockGetAllWarehouseStockItems.mockResolvedValue(refreshedStock);
      mockGetInventoryCounts.mockResolvedValue([approvedCount]);
      mockGetInventoryCountById.mockResolvedValue({
        count: approvedCount,
        lines: [approvedLine],
      });

      await useInventoryStore.getState().approveInventoryCount(draftCount.id);

      expect(mockApproveInventoryCount).toHaveBeenCalledWith(draftCount.id);
      expect(useInventoryStore.getState().warehouseStockItems).toEqual(refreshedStock);
      expect(useInventoryStore.getState().inventoryCounts).toEqual([approvedCount]);
      expect(useInventoryStore.getState().currentInventoryCount?.status).toBe('approved');
      expect(useInventoryStore.getState().currentInventoryCountLines).toEqual([approvedLine]);
    });
  });

  describe('loadInventoryCategories', () => {
    it('exposes category load failures for detail views', async () => {
      mockGetAllInventoryCategories.mockRejectedValue(new Error('network error'));

      await useInventoryStore.getState().loadInventoryCategories();

      expect(useInventoryStore.getState().loadError).toBe(
        'Nie udalo sie zaladowac kategorii magazynowych. Sprobuj ponownie.'
      );
      expect(useInventoryStore.getState().detailLoadError).toBe(
        'Nie udalo sie zaladowac kategorii magazynowych. Sprobuj ponownie.'
      );
    });
  });

  describe('adjustStock', () => {
    it('updates quantity in warehouse stock items after adjust', async () => {
      const item = makeWarehouseStockItem({ id: 'si-001', warehouse_id: 'wh-001', quantity: 1000 });
      useInventoryStore.setState({ warehouseStockItems: [item] });

      mockAdjustStock.mockResolvedValue({ quantity: 1500 });
      mockGetAllWarehouseStockItems.mockResolvedValue([
        makeWarehouseStockItem({ id: 'si-001', warehouse_id: 'wh-001', quantity: 1500 }),
      ]);

      await useInventoryStore.getState().adjustStock('wh-001', 'si-001', 500, 'Delivery');

      const updated = useInventoryStore.getState().warehouseStockItems.find(
        (i) => i.id === 'si-001' && i.warehouse_id === 'wh-001'
      );
      expect(updated?.quantity).toBe(1500);
    });
  });

  describe('transferStock', () => {
    it('reloads warehouse stock items after transfer', async () => {
      const updatedItems = [
        makeWarehouseStockItem({ id: '1', warehouse_id: 'wh-1', quantity: 500 }),
        makeWarehouseStockItem({ id: '1', warehouse_id: 'wh-2', quantity: 500, warehouse_stock_id: 'ws-002' }),
      ];

      mockTransferStock.mockResolvedValue(undefined);
      mockGetAllWarehouseStockItems.mockResolvedValue(updatedItems);

      await useInventoryStore.getState().transferStock('wh-1', 'wh-2', '1', 500);

      expect(mockTransferStock).toHaveBeenCalledWith('wh-1', 'wh-2', '1', 500);
      expect(useInventoryStore.getState().warehouseStockItems).toEqual(updatedItems);
    });
  });

  describe('assignToWarehouse', () => {
    it('reloads warehouse stock items after assignment', async () => {
      const updatedItems = [
        makeWarehouseStockItem({ id: '1', warehouse_id: 'wh-1', quantity: 100 }),
      ];

      mockAssignToWarehouse.mockResolvedValue({});
      mockGetAllWarehouseStockItems.mockResolvedValue(updatedItems);

      await useInventoryStore.getState().assignToWarehouse('wh-1', '1', 100, 50);

      expect(mockAssignToWarehouse).toHaveBeenCalledWith('wh-1', '1', 100, 50);
      expect(useInventoryStore.getState().warehouseStockItems).toEqual(updatedItems);
    });
  });

  describe('getLowStockItems', () => {
    it('returns items below min_quantity', () => {
      const items = [
        makeWarehouseStockItem({ id: '1', quantity: 100, min_quantity: 500, is_active: true }),
        makeWarehouseStockItem({ id: '2', quantity: 1000, min_quantity: 500, is_active: true, warehouse_stock_id: 'ws-002' }),
        makeWarehouseStockItem({ id: '3', quantity: 10, min_quantity: 100, is_active: false, warehouse_stock_id: 'ws-003' }),
      ];
      useInventoryStore.setState({ warehouseStockItems: items });

      const lowStock = useInventoryStore.getState().getLowStockItems();
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].id).toBe('1');
    });
  });

  describe('getStockValue', () => {
    it('calculates total stock value', () => {
      const items = [
        makeWarehouseStockItem({ id: '1', quantity: 1000, cost_per_unit: 0.05, warehouse_stock_id: 'ws-001' }),
        makeWarehouseStockItem({ id: '2', quantity: 500, cost_per_unit: 0.10, warehouse_stock_id: 'ws-002' }),
      ];
      useInventoryStore.setState({ warehouseStockItems: items });

      const value = useInventoryStore.getState().getStockValue();
      // 1000 * 0.05 + 500 * 0.10 = 50 + 50 = 100
      expect(value).toBe(100);
    });

    it('returns 0 for empty stock', () => {
      useInventoryStore.setState({ warehouseStockItems: [] });
      expect(useInventoryStore.getState().getStockValue()).toBe(0);
    });
  });

  describe('loadStockItemDetail', () => {
    it('loads a single stock item by ID', async () => {
      const item = makeStockItem({ id: 'si-detail' });
      mockGetStockItemById.mockResolvedValue(item);

      await useInventoryStore.getState().loadStockItemDetail('si-detail');

      expect(mockGetStockItemById).toHaveBeenCalledWith('si-detail');
      expect(useInventoryStore.getState().currentStockItem).toEqual(item);
      expect(useInventoryStore.getState().isDetailLoading).toBe(false);
    });

    it('sets isDetailLoading during fetch', async () => {
      let resolve: (value: StockItem | null) => void;
      mockGetStockItemById.mockReturnValue(
        new Promise<StockItem | null>((r) => { resolve = r; })
      );

      const promise = useInventoryStore.getState().loadStockItemDetail('si-001');
      expect(useInventoryStore.getState().isDetailLoading).toBe(true);

      resolve!(null);
      await promise;

      expect(useInventoryStore.getState().isDetailLoading).toBe(false);
    });
  });

  describe('loadWarehouseAssignments', () => {
    it('loads warehouse assignments for stock item detail', async () => {
      const assignments = [
        {
          id: 'ws-001',
          warehouse_id: 'wh-001',
          warehouse_name: 'Test Warehouse',
          quantity: 1000,
          min_quantity: 500,
          storage_location: 'Regal A',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ];

      mockGetWarehouseAssignmentsForStockItem.mockResolvedValue(assignments);

      await useInventoryStore.getState().loadWarehouseAssignments('si-001');

      expect(mockGetWarehouseAssignmentsForStockItem).toHaveBeenCalledWith('si-001');
      expect(useInventoryStore.getState().currentWarehouseAssignments).toEqual(assignments);
    });
  });

  describe('addComponent', () => {
    it('adds component and reloads components list', async () => {
      const components: StockItemComponentWithDetails[] = [{
        id: 'comp-001',
        parent_stock_item_id: 'si-001',
        component_stock_item_id: 'si-002',
        quantity: 0.5,
        component_name: 'Tomatoes',
        component_sku: 'RAW-VEG-003',
        component_unit: 'kg',
        current_total_stock: 14,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }];

      mockAddComponent.mockResolvedValue({});
      mockGetComponentsForItem.mockResolvedValue(components);

      await useInventoryStore.getState().addComponent('si-001', 'si-002', 0.5);

      expect(mockAddComponent).toHaveBeenCalledWith('si-001', 'si-002', 0.5);
      expect(useInventoryStore.getState().currentComponents).toEqual(components);
    });
  });

  describe('removeComponent', () => {
    it('removes component and reloads components list', async () => {
      mockRemoveComponent.mockResolvedValue(undefined);
      mockGetComponentsForItem.mockResolvedValue([]);

      await useInventoryStore.getState().removeComponent('comp-001', 'si-001');

      expect(mockRemoveComponent).toHaveBeenCalledWith('comp-001');
      expect(useInventoryStore.getState().currentComponents).toEqual([]);
    });
  });

  describe('warehouse CRUD', () => {
    it('creates warehouse and reloads', async () => {
      const newWarehouses = [makeWarehouse({ id: 'wh-new' })];
      mockCreateWarehouse.mockResolvedValue({});
      mockGetAllWarehouses.mockResolvedValue(newWarehouses);

      await useInventoryStore.getState().createWarehouse({
        name: 'New WH',
        location_id: null,
        is_active: true,
        is_default: false,
      });

      expect(useInventoryStore.getState().warehouses).toEqual(newWarehouses);
    });

    it('updates warehouse and reloads', async () => {
      const updatedWarehouses = [makeWarehouse({ id: 'wh-001', name: 'Updated' })];
      mockUpdateWarehouse.mockResolvedValue({});
      mockGetAllWarehouses.mockResolvedValue(updatedWarehouses);

      await useInventoryStore.getState().updateWarehouse('wh-001', { name: 'Updated' });

      expect(useInventoryStore.getState().warehouses).toEqual(updatedWarehouses);
    });

    it('deletes warehouse and reloads', async () => {
      mockDeleteWarehouse.mockResolvedValue(undefined);
      mockGetAllWarehouses.mockResolvedValue([]);

      await useInventoryStore.getState().deleteWarehouse('wh-001');

      expect(useInventoryStore.getState().warehouses).toEqual([]);
    });

    it('sets default warehouse and reloads', async () => {
      const updatedWarehouses = [
        makeWarehouse({ id: 'wh-001', is_default: false }),
        makeWarehouse({ id: 'wh-002', name: 'WH 2', is_default: true }),
      ];
      mockSetDefaultWarehouse.mockResolvedValue(undefined);
      mockGetAllWarehouses.mockResolvedValue(updatedWarehouses);

      await useInventoryStore.getState().setDefaultWarehouse('wh-002');

      expect(mockSetDefaultWarehouse).toHaveBeenCalledWith('wh-002');
      expect(useInventoryStore.getState().warehouses).toEqual(updatedWarehouses);
    });
  });
});
