import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockItem } from '@/types/inventory';
import { ProductCategory } from '@/types/enums';

// Mock inventory repository
const mockGetAllStockItems = vi.fn();
const mockStockItemsCreate = vi.fn();
const mockStockItemsUpdate = vi.fn();
const mockStockItemsDelete = vi.fn();
const mockAdjustStock = vi.fn();

vi.mock('../repository', () => ({
  inventoryRepository: {
    getAllStockItems: (...args: unknown[]) => mockGetAllStockItems(...args),
    adjustStock: (...args: unknown[]) => mockAdjustStock(...args),
    stockItems: {
      create: (...args: unknown[]) => mockStockItemsCreate(...args),
      update: (...args: unknown[]) => mockStockItemsUpdate(...args),
      delete: (...args: unknown[]) => mockStockItemsDelete(...args),
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
  quantity: 1000,
  min_quantity: 500,
  cost_per_unit: 0.05,
  allergens: [],
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('useInventoryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useInventoryStore.setState({ stockItems: [], isLoading: false });
  });

  describe('loadStockItems', () => {
    it('loads stock items from repository', async () => {
      const items = [makeStockItem({ id: '1' }), makeStockItem({ id: '2' })];
      mockGetAllStockItems.mockResolvedValue(items);

      await useInventoryStore.getState().loadStockItems();

      expect(useInventoryStore.getState().stockItems).toEqual(items);
      expect(useInventoryStore.getState().isLoading).toBe(false);
    });

    it('sets isLoading during fetch', async () => {
      let resolvePromise: (value: StockItem[]) => void;
      mockGetAllStockItems.mockReturnValue(
        new Promise<StockItem[]>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const loadPromise = useInventoryStore.getState().loadStockItems();

      // isLoading should be true while waiting
      expect(useInventoryStore.getState().isLoading).toBe(true);

      resolvePromise!([]);
      await loadPromise;

      expect(useInventoryStore.getState().isLoading).toBe(false);
    });

    it('resets isLoading on error', async () => {
      mockGetAllStockItems.mockRejectedValue(new Error('Network error'));

      try {
        await useInventoryStore.getState().loadStockItems();
      } catch {
        // expected
      }

      expect(useInventoryStore.getState().isLoading).toBe(false);
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
        quantity: newItem.quantity,
        min_quantity: newItem.min_quantity,
        cost_per_unit: newItem.cost_per_unit,
        allergens: newItem.allergens,
        is_active: newItem.is_active,
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
      useInventoryStore.setState({ stockItems: items });

      mockStockItemsDelete.mockResolvedValue(undefined);

      await useInventoryStore.getState().deleteStockItem('1');

      expect(useInventoryStore.getState().stockItems).toHaveLength(1);
      expect(useInventoryStore.getState().stockItems[0].id).toBe('2');
    });
  });

  describe('adjustStock', () => {
    it('updates quantity in store after adjust', async () => {
      const item = makeStockItem({ id: 'si-001', quantity: 1000 });
      useInventoryStore.setState({ stockItems: [item] });

      mockAdjustStock.mockResolvedValue({ ...item, quantity: 1500 });

      await useInventoryStore.getState().adjustStock('si-001', 500, 'Delivery');

      const updated = useInventoryStore.getState().stockItems.find((i) => i.id === 'si-001');
      expect(updated?.quantity).toBe(1500);
    });
  });

  describe('getLowStockItems', () => {
    it('returns items below min_quantity', () => {
      const items = [
        makeStockItem({ id: '1', quantity: 100, min_quantity: 500, is_active: true }),
        makeStockItem({ id: '2', quantity: 1000, min_quantity: 500, is_active: true }),
        makeStockItem({ id: '3', quantity: 10, min_quantity: 100, is_active: false }),
      ];
      useInventoryStore.setState({ stockItems: items });

      const lowStock = useInventoryStore.getState().getLowStockItems();
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].id).toBe('1');
    });
  });

  describe('getStockValue', () => {
    it('calculates total stock value', () => {
      const items = [
        makeStockItem({ id: '1', quantity: 1000, cost_per_unit: 0.05 }),
        makeStockItem({ id: '2', quantity: 500, cost_per_unit: 0.10 }),
      ];
      useInventoryStore.setState({ stockItems: items });

      const value = useInventoryStore.getState().getStockValue();
      // 1000 * 0.05 + 500 * 0.10 = 50 + 50 = 100
      expect(value).toBe(100);
    });

    it('returns 0 for empty stock', () => {
      useInventoryStore.setState({ stockItems: [] });
      expect(useInventoryStore.getState().getStockValue()).toBe(0);
    });
  });
});
