import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSupplierRepo, mockDeliveryRepo, mockDeliveryItemRepo, counter } = vi.hoisted(() => {
  return {
    mockSupplierRepo: {
      findMany: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
    },
    mockDeliveryRepo: {
      findMany: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
    },
    mockDeliveryItemRepo: {
      findMany: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
    },
    counter: { value: 0 },
  };
});

vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: () => {
    counter.value++;
    if (counter.value === 1) return mockSupplierRepo;
    if (counter.value === 2) return mockDeliveryRepo;
    return mockDeliveryItemRepo;
  },
}));

vi.mock('@/modules/inventory/repository', () => ({
  inventoryRepository: {
    getAllWarehouses: vi.fn().mockResolvedValue([
      { id: 'wh-1', name: 'Main stock', is_active: true },
    ]),
    getAllStockItems: vi.fn().mockResolvedValue([
      { id: 'si-1', name: 'Wolowina', sku: 'WOL-001', unit: 'kg' },
    ]),
    adjustStock: vi.fn().mockResolvedValue(undefined),
  },
}));

import { deliveryRepository } from '../repository';
import { inventoryRepository } from '@/modules/inventory/repository';

describe('deliveryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSuppliers', () => {
    it('returns active suppliers sorted by name', async () => {
      mockSupplierRepo.findMany.mockResolvedValue([
        { id: 's-2', name: 'Zeelandia', is_active: true },
        { id: 's-1', name: 'Ardo', is_active: true },
      ]);

      const result = await deliveryRepository.getAllSuppliers();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ardo');
      expect(result[1].name).toBe('Zeelandia');
    });
  });

  describe('generateDeliveryNumber', () => {
    it('generates PZ number with year', async () => {
      mockDeliveryRepo.findMany.mockResolvedValue([]);
      const num = await deliveryRepository.generateDeliveryNumber();
      const year = new Date().getFullYear();
      expect(num).toBe(`PZ 1/${year}`);
    });

    it('increments based on existing deliveries', async () => {
      const year = new Date().getFullYear();
      mockDeliveryRepo.findMany.mockResolvedValue([
        { delivery_number: `PZ 1/${year}` },
        { delivery_number: `PZ 2/${year}` },
      ]);
      const num = await deliveryRepository.generateDeliveryNumber();
      expect(num).toBe(`PZ 3/${year}`);
    });
  });

  describe('createDelivery', () => {
    it('creates delivery with items', async () => {
      mockDeliveryRepo.findMany.mockResolvedValue([]);
      mockDeliveryRepo.create.mockResolvedValue({
        id: 'del-1',
        delivery_number: 'PZ 1/2026',
        status: 'draft',
      });
      mockDeliveryItemRepo.create.mockResolvedValue({ id: 'di-1' });

      const result = await deliveryRepository.createDelivery(
        { warehouse_id: 'wh-1', source: 'manual' as never },
        [{ stock_item_id: 'si-1', quantity_received: 10 }]
      );

      expect(result.id).toBe('del-1');
      expect(mockDeliveryItemRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeDelivery', () => {
    it('increases stock and sets status to completed', async () => {
      mockDeliveryRepo.findById.mockResolvedValue({
        id: 'del-1',
        warehouse_id: 'wh-1',
        delivery_number: 'PZ 1/2026',
        status: 'draft',
      });
      mockDeliveryItemRepo.findMany.mockResolvedValue([
        { delivery_id: 'del-1', stock_item_id: 'si-1', quantity_received: 10 },
      ]);
      mockDeliveryRepo.update.mockResolvedValue({});

      await deliveryRepository.completeDelivery('del-1');

      expect(inventoryRepository.adjustStock).toHaveBeenCalledWith(
        'wh-1', 'si-1', 10, 'Dostawa PZ 1/2026'
      );
      expect(mockDeliveryRepo.update).toHaveBeenCalledWith(
        'del-1',
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('throws if delivery already completed', async () => {
      mockDeliveryRepo.findById.mockResolvedValue({
        id: 'del-1',
        status: 'completed',
      });

      await expect(deliveryRepository.completeDelivery('del-1'))
        .rejects.toThrow('Delivery already completed');
    });
  });

  describe('getAllDeliveries', () => {
    it('returns deliveries with enriched details', async () => {
      mockDeliveryRepo.findMany.mockResolvedValue([{
        id: 'del-1',
        delivery_number: 'PZ 1/2026',
        warehouse_id: 'wh-1',
        supplier_id: 's-1',
        created_at: '2026-02-26T10:00:00Z',
      }]);
      mockSupplierRepo.findMany.mockResolvedValue([
        { id: 's-1', name: 'Ardo' },
      ]);
      mockDeliveryItemRepo.findMany.mockResolvedValue([
        { delivery_id: 'del-1', stock_item_id: 'si-1', quantity_received: 10, unit_price_net: 32.50 },
      ]);

      const result = await deliveryRepository.getAllDeliveries();
      expect(result).toHaveLength(1);
      expect(result[0].supplier_name).toBe('Ardo');
      expect(result[0].warehouse_name).toBe('Main stock');
      expect(result[0].item_count).toBe(1);
      expect(result[0].total_net).toBe(325);
    });
  });
});
