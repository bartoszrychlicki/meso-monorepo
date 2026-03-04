import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockItem } from '@/types/inventory';
import { ProductCategory, VatRate, ConsumptionType } from '@/types/enums';

// Use vi.hoisted to define mocks before vi.mock hoisting
const { mockFindMany, mockFindById, mockUpdate, mockCreate, mockDelete } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockDelete: vi.fn(),
}));

// Mock supabase client for queryWarehouseStockItems
const mockSelect = vi.fn();
const mockEq = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((_table: any) => ({ select: mockSelect }));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(args[0]),
  },
}));

vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: () => ({
    findMany: mockFindMany,
    findById: mockFindById,
    update: mockUpdate,
    create: mockCreate,
    delete: mockDelete,
  }),
}));

import { inventoryRepository } from '../repository';

const makeStockItem = (overrides: Partial<StockItem> = {}): StockItem => ({
  id: 'si-001',
  name: 'Wolowina mielona',
  sku: 'RAW-BEEF-001',
  product_category: ProductCategory.RAW_MATERIAL,
  unit: 'g',
  cost_per_unit: 0.032,
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

describe('inventoryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset supabase chain mocks
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, data: [], error: null });
  });

  describe('getAllStockItems', () => {
    it('returns only active items', async () => {
      const items = [
        makeStockItem({ id: '1', is_active: true }),
        makeStockItem({ id: '2', is_active: false }),
        makeStockItem({ id: '3', is_active: true }),
      ];

      mockFindMany.mockImplementation((filter: (item: StockItem) => boolean) => {
        return Promise.resolve(items.filter(filter));
      });

      const result = await inventoryRepository.getAllStockItems();
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.is_active)).toBe(true);
    });
  });

  describe('getAllWarehouses', () => {
    it('returns only active warehouses', async () => {
      const warehouses = [
        { id: 'wh-1', name: 'WH 1', is_active: true, is_default: false },
        { id: 'wh-2', name: 'WH 2', is_active: false, is_default: false },
      ];

      mockFindMany.mockImplementation((filter: (item: Record<string, unknown>) => boolean) => {
        return Promise.resolve(warehouses.filter(filter));
      });

      const result = await inventoryRepository.getAllWarehouses();
      expect(result).toHaveLength(1);
    });
  });

  describe('getAllInventoryCategories', () => {
    it('returns active categories sorted by sort_order and name', async () => {
      const categories = [
        { id: '2', name: 'Mieso', sort_order: 2, is_active: true },
        { id: '1', name: 'Warzywa', sort_order: 1, is_active: true },
        { id: '3', name: 'Napoje', sort_order: 2, is_active: true },
      ];

      mockFindMany.mockImplementation((filter: (item: Record<string, unknown>) => boolean) => {
        return Promise.resolve(categories.filter(filter));
      });

      const result = await inventoryRepository.getAllInventoryCategories();
      expect(result.map((c) => c.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('adjustStock', () => {
    it('finds junction row and updates quantity', async () => {
      const warehouseStockRow = {
        id: 'ws-001',
        warehouse_id: 'wh-001',
        stock_item_id: 'si-001',
        quantity: 1000,
        min_quantity: 500,
      };

      mockFindMany.mockResolvedValue([warehouseStockRow]);
      mockUpdate.mockResolvedValue({ ...warehouseStockRow, quantity: 1500 });

      const result = await inventoryRepository.adjustStock('wh-001', 'si-001', 500, 'Delivery');
      expect(mockUpdate).toHaveBeenCalledWith('ws-001', { quantity: 1500 });
      expect(result.quantity).toBe(1500);
    });

    it('throws when junction row not found', async () => {
      mockFindMany.mockResolvedValue([]);

      await expect(
        inventoryRepository.adjustStock('wh-001', 'nonexistent', 100, 'Test')
      ).rejects.toThrow('Pozycja nie znaleziona w tym magazynie');
    });
  });

  describe('transferStock', () => {
    it('subtracts from source and adds to existing target', async () => {
      const sourceRow = { id: 'ws-001', warehouse_id: 'wh-1', stock_item_id: 'si-001', quantity: 1000 };
      const targetRow = { id: 'ws-002', warehouse_id: 'wh-2', stock_item_id: 'si-001', quantity: 200 };

      // First call finds source, second finds target
      mockFindMany
        .mockResolvedValueOnce([sourceRow])
        .mockResolvedValueOnce([targetRow]);
      mockUpdate.mockResolvedValue({});

      await inventoryRepository.transferStock('wh-1', 'wh-2', 'si-001', 300);

      expect(mockUpdate).toHaveBeenCalledWith('ws-001', { quantity: 700 });
      expect(mockUpdate).toHaveBeenCalledWith('ws-002', { quantity: 500 });
    });

    it('creates target junction row when not exists', async () => {
      const sourceRow = { id: 'ws-001', warehouse_id: 'wh-1', stock_item_id: 'si-001', quantity: 1000 };

      mockFindMany
        .mockResolvedValueOnce([sourceRow])
        .mockResolvedValueOnce([]);
      mockUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({});

      await inventoryRepository.transferStock('wh-1', 'wh-2', 'si-001', 300);

      expect(mockUpdate).toHaveBeenCalledWith('ws-001', { quantity: 700 });
      expect(mockCreate).toHaveBeenCalledWith({
        warehouse_id: 'wh-2',
        stock_item_id: 'si-001',
        quantity: 300,
        min_quantity: 0,
      });
    });

    it('throws when insufficient quantity', async () => {
      const sourceRow = { id: 'ws-001', warehouse_id: 'wh-1', stock_item_id: 'si-001', quantity: 100 };

      mockFindMany.mockResolvedValueOnce([sourceRow]);

      await expect(
        inventoryRepository.transferStock('wh-1', 'wh-2', 'si-001', 300)
      ).rejects.toThrow('Niewystarczajaca ilosc w magazynie zrodlowym');
    });
  });

  describe('assignToWarehouse', () => {
    it('creates junction row', async () => {
      const newRow = { id: 'ws-new', warehouse_id: 'wh-1', stock_item_id: 'si-001', quantity: 500, min_quantity: 100 };
      mockCreate.mockResolvedValue(newRow);

      const result = await inventoryRepository.assignToWarehouse('wh-1', 'si-001', 500, 100);
      expect(mockCreate).toHaveBeenCalledWith({
        warehouse_id: 'wh-1',
        stock_item_id: 'si-001',
        quantity: 500,
        min_quantity: 100,
      });
      expect(result).toEqual(newRow);
    });
  });

  describe('deleteWarehouse', () => {
    it('soft-deletes when no stock assigned', async () => {
      mockFindMany.mockResolvedValue([
        { id: 'ws-001', quantity: 0 },
      ]);
      mockUpdate.mockResolvedValue({});

      await inventoryRepository.deleteWarehouse('wh-001');

      expect(mockUpdate).toHaveBeenCalledWith('wh-001', { is_active: false });
    });

    it('throws when warehouse has stock', async () => {
      mockFindMany.mockResolvedValue([
        { id: 'ws-001', quantity: 500 },
      ]);

      await expect(
        inventoryRepository.deleteWarehouse('wh-001')
      ).rejects.toThrow('Nie mozna usunac magazynu z przypisanymi pozycjami');
    });
  });

  describe('deleteInventoryCategory', () => {
    it('soft-deletes category when no stock items are assigned', async () => {
      mockFindMany.mockResolvedValue([]);
      mockUpdate.mockResolvedValue({});

      await inventoryRepository.deleteInventoryCategory('cat-001');

      expect(mockUpdate).toHaveBeenCalledWith('cat-001', { is_active: false });
    });

    it('throws when category has assigned stock items', async () => {
      mockFindMany.mockResolvedValue([
        makeStockItem({ id: 'si-1', inventory_category_id: 'cat-001' }),
      ]);

      await expect(
        inventoryRepository.deleteInventoryCategory('cat-001')
      ).rejects.toThrow('Nie mozna usunac kategorii z przypisanymi pozycjami');
    });
  });

  describe('setDefaultWarehouse', () => {
    it('clears is_default on all warehouses then sets target', async () => {
      const warehouses = [
        { id: 'wh-1', name: 'WH 1', is_active: true, is_default: true },
        { id: 'wh-2', name: 'WH 2', is_active: true, is_default: false },
      ];

      mockFindMany.mockImplementation((filter: (item: Record<string, unknown>) => boolean) => {
        return Promise.resolve(warehouses.filter(filter));
      });
      mockUpdate.mockResolvedValue({});

      await inventoryRepository.setDefaultWarehouse('wh-2');

      // Should clear is_default on all active warehouses
      expect(mockUpdate).toHaveBeenCalledWith('wh-1', { is_default: false });
      expect(mockUpdate).toHaveBeenCalledWith('wh-2', { is_default: false });
      // Then set is_default on target
      expect(mockUpdate).toHaveBeenCalledWith('wh-2', { is_default: true });
    });
  });

  describe('deleteStockItem', () => {
    it('blocks deletion when stock item is used in recipes', async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'recipe-1',
          name: 'Burger Classic',
          is_active: true,
          ingredients: [
            { type: 'stock_item', reference_id: 'si-001', quantity: 1, unit: 'szt' },
          ],
        },
      ]);

      await expect(inventoryRepository.deleteStockItem('si-001')).rejects.toThrow(
        'Nie mozna usunac pozycji, bo jest uzywana w recepturach: Burger Classic. Aby usunac pozycje, najpierw zmodyfikuj te receptury.'
      );
    });

    it('removes warehouse state and soft-deletes stock item when not used in recipes', async () => {
      mockFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 'ws-1', stock_item_id: 'si-001' },
          { id: 'ws-2', stock_item_id: 'si-001' },
        ])
        .mockResolvedValueOnce([
          { id: 'comp-1', parent_stock_item_id: 'si-001', component_stock_item_id: 'si-002' },
        ])
        .mockResolvedValueOnce([
          { id: 'comp-2', parent_stock_item_id: 'si-003', component_stock_item_id: 'si-001' },
        ]);
      mockDelete.mockResolvedValue(undefined);
      mockUpdate.mockResolvedValue({});

      await inventoryRepository.deleteStockItem('si-001');

      expect(mockDelete).toHaveBeenCalledWith('ws-1');
      expect(mockDelete).toHaveBeenCalledWith('ws-2');
      expect(mockDelete).toHaveBeenCalledWith('comp-1');
      expect(mockDelete).toHaveBeenCalledWith('comp-2');
      expect(mockUpdate).toHaveBeenCalledWith('si-001', { is_active: false });
    });
  });
});
