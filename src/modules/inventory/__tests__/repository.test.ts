import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockItem } from '@/types/inventory';
import { ProductCategory, Allergen } from '@/types/enums';

// Use vi.hoisted to define mocks before vi.mock hoisting
const { mockFindMany, mockFindById, mockUpdate, mockCreate, mockDelete } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockDelete: vi.fn(),
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
  quantity: 42000,
  min_quantity: 20000,
  cost_per_unit: 0.032,
  allergens: [],
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('inventoryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('getLowStockItems', () => {
    it('returns active items below min_quantity', async () => {
      const items = [
        makeStockItem({ id: '1', quantity: 5000, min_quantity: 20000, is_active: true }),
        makeStockItem({ id: '2', quantity: 50000, min_quantity: 20000, is_active: true }),
        makeStockItem({ id: '3', quantity: 100, min_quantity: 500, is_active: false }),
      ];

      mockFindMany.mockImplementation((filter: (item: StockItem) => boolean) => {
        return Promise.resolve(items.filter(filter));
      });

      const result = await inventoryRepository.getLowStockItems();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('returns empty when all items are above threshold', async () => {
      const items = [
        makeStockItem({ id: '1', quantity: 50000, min_quantity: 20000, is_active: true }),
      ];

      mockFindMany.mockImplementation((filter: (item: StockItem) => boolean) => {
        return Promise.resolve(items.filter(filter));
      });

      const result = await inventoryRepository.getLowStockItems();
      expect(result).toHaveLength(0);
    });
  });

  describe('adjustStock', () => {
    it('adds positive quantity', async () => {
      const item = makeStockItem({ id: 'si-001', quantity: 1000 });
      mockFindById.mockResolvedValue(item);
      mockUpdate.mockResolvedValue({ ...item, quantity: 1500 });

      const result = await inventoryRepository.adjustStock('si-001', 500, 'Delivery received');
      expect(mockUpdate).toHaveBeenCalledWith('si-001', { quantity: 1500 });
      expect(result.quantity).toBe(1500);
    });

    it('subtracts negative quantity', async () => {
      const item = makeStockItem({ id: 'si-001', quantity: 1000 });
      mockFindById.mockResolvedValue(item);
      mockUpdate.mockResolvedValue({ ...item, quantity: 700 });

      const result = await inventoryRepository.adjustStock('si-001', -300, 'Production use');
      expect(mockUpdate).toHaveBeenCalledWith('si-001', { quantity: 700 });
      expect(result.quantity).toBe(700);
    });

    it('throws when stock item not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        inventoryRepository.adjustStock('nonexistent', 100, 'Test')
      ).rejects.toThrow('Stock item not found');
    });
  });
});
