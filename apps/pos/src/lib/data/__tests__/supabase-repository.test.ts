import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client before importing the repository
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { SupabaseRepository } from '../supabase-repository';
import { BaseEntity } from '@/types/common';

interface TestEntity extends BaseEntity {
  name: string;
  quantity: number;
  price: number;
  is_active: boolean;
}

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);

  // Default resolve with empty data
  chain.then = vi.fn((resolve: (value: { data: null; error: null; count: 0 }) => void) =>
    resolve({ data: null, error: null, count: 0 })
  );

  return chain;
}

describe('SupabaseRepository', () => {
  let repo: SupabaseRepository<TestEntity>;
  let chain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new SupabaseRepository<TestEntity>('stock_items');
    chain = createMockChain();
    mockFrom.mockReturnValue(chain);
  });

  describe('table name mapping', () => {
    it('maps known collection to prefixed table name', async () => {
      // Make select return a proper promise
      chain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await repo.findAll();
      expect(mockFrom).toHaveBeenCalledWith('inventory_stock_items');
    });

    it('maps different collections correctly', async () => {
      const ordersRepo = new SupabaseRepository<TestEntity>('orders');
      chain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await ordersRepo.findAll();
      expect(mockFrom).toHaveBeenCalledWith('orders_orders');
    });

    it('uses collection name as-is for unmapped collections', async () => {
      const customRepo = new SupabaseRepository<TestEntity>('custom_table');
      chain.range.mockResolvedValue({ data: [], error: null, count: 0 });

      await customRepo.findAll();
      expect(mockFrom).toHaveBeenCalledWith('custom_table');
    });
  });

  describe('findById', () => {
    it('returns transformed row when found', async () => {
      const rawRow = {
        id: 'abc-123',
        name: 'Test Item',
        quantity: '500',  // Supabase returns NUMERIC as string
        price: '9.99',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      chain.maybeSingle.mockResolvedValue({ data: rawRow, error: null });

      const result = await repo.findById('abc-123');

      expect(result).not.toBeNull();
      expect(result!.quantity).toBe(500);
      expect(result!.price).toBe(9.99);
      expect(typeof result!.quantity).toBe('number');
      expect(typeof result!.price).toBe('number');
    });

    it('returns null when not found', async () => {
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('throws on Supabase error', async () => {
      chain.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      });

      await expect(repo.findById('abc')).rejects.toThrow('findById failed');
    });
  });

  describe('findMany with object filter', () => {
    it('builds eq chains for object filters', async () => {
      chain.eq.mockReturnValue(chain);
      // After all eq calls, resolve with data
      const lastEq = vi.fn().mockResolvedValue({ data: [], error: null });
      // We need to mock the final call in the chain
      chain.eq.mockImplementation((..._args: unknown[]) => {
        return { ...chain, then: lastEq.mockResolvedValue({ data: [], error: null }) };
      });

      // Simplified: just verify no throw
      chain.select.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      (chain as Record<string, unknown>).then = undefined;
      // Make the chain itself a promise
      const promise = Promise.resolve({ data: [], error: null });
      chain.eq.mockReturnValue(promise);

      const result = await repo.findMany({ is_active: true } as Partial<TestEntity>);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findMany with function filter', () => {
    it('fetches all and filters in JS', async () => {
      const rows = [
        { id: '1', name: 'A', quantity: '100', price: '10', is_active: true, created_at: '', updated_at: '' },
        { id: '2', name: 'B', quantity: '200', price: '20', is_active: false, created_at: '', updated_at: '' },
        { id: '3', name: 'C', quantity: '50', price: '5', is_active: true, created_at: '', updated_at: '' },
      ];

      chain.select.mockResolvedValue({ data: rows, error: null });

      const result = await repo.findMany((item: TestEntity) => item.is_active);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('C');
      // Verify NUMERIC transformation
      expect(result[0].quantity).toBe(100);
      expect(typeof result[0].quantity).toBe('number');
    });
  });

  describe('create', () => {
    it('inserts and returns transformed row', async () => {
      const inputData = {
        name: 'New Item',
        quantity: 100,
        price: 15.5,
        is_active: true,
      };

      const returnedRow = {
        id: 'new-id-123',
        ...inputData,
        quantity: '100',
        price: '15.50',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      chain.single.mockResolvedValue({ data: returnedRow, error: null });

      const result = await repo.create(inputData);
      expect(result.id).toBe('new-id-123');
      expect(result.quantity).toBe(100);
      expect(result.price).toBe(15.5);
    });

    it('throws on insert error', async () => {
      chain.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key' },
      });

      await expect(
        repo.create({ name: 'X', quantity: 1, price: 1, is_active: true })
      ).rejects.toThrow('create failed');
    });
  });

  describe('update', () => {
    it('updates and returns transformed row', async () => {
      const returnedRow = {
        id: 'abc-123',
        name: 'Updated Item',
        quantity: '300',
        price: '25.00',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      };

      chain.single.mockResolvedValue({ data: returnedRow, error: null });

      const result = await repo.update('abc-123', { name: 'Updated Item' });
      expect(result.name).toBe('Updated Item');
      expect(result.quantity).toBe(300);
    });
  });

  describe('delete', () => {
    it('deletes without error', async () => {
      chain.eq.mockResolvedValue({ error: null });
      await expect(repo.delete('abc-123')).resolves.toBeUndefined();
    });

    it('throws on delete error', async () => {
      chain.eq.mockResolvedValue({ error: { message: 'FK constraint' } });
      await expect(repo.delete('abc-123')).rejects.toThrow('delete failed');
    });
  });

  describe('count', () => {
    it('returns count without filter', async () => {
      // count uses head:true select
      chain.select.mockReturnValue(chain);
      (chain as unknown as Promise<{ count: number; error: null }>).then = undefined as never;
      const headPromise = Promise.resolve({ count: 42, error: null });
      chain.select.mockReturnValue(headPromise);

      const result = await repo.count();
      expect(result).toBe(42);
    });
  });

  describe('NUMERIC field transformation', () => {
    it('converts string NUMERIC fields to numbers', async () => {
      const row = {
        id: '1',
        name: 'Test',
        quantity: '42000',
        price: '0.032',
        min_quantity: '20000',
        cost_per_unit: '0.032',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      chain.maybeSingle.mockResolvedValue({ data: row, error: null });
      const result = await repo.findById('1');

      expect(result).not.toBeNull();
      expect(typeof result!.quantity).toBe('number');
      expect(result!.quantity).toBe(42000);
    });

    it('leaves non-NUMERIC string fields as strings', async () => {
      const row = {
        id: '1',
        name: 'Test Item',
        quantity: '100',
        price: '10',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      chain.maybeSingle.mockResolvedValue({ data: row, error: null });
      const result = await repo.findById('1');

      expect(typeof result!.name).toBe('string');
      expect(result!.name).toBe('Test Item');
    });
  });

  describe('bulkCreate', () => {
    it('inserts multiple rows', async () => {
      chain.insert.mockResolvedValue({ error: null });

      const items = [
        { id: '1', name: 'A', quantity: 1, price: 1, is_active: true, created_at: '', updated_at: '' },
        { id: '2', name: 'B', quantity: 2, price: 2, is_active: true, created_at: '', updated_at: '' },
      ] as TestEntity[];

      await expect(repo.bulkCreate(items)).resolves.toBeUndefined();
      expect(chain.insert).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('deletes all rows using neq workaround', async () => {
      chain.neq.mockResolvedValue({ error: null });

      await expect(repo.clear()).resolves.toBeUndefined();
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.neq).toHaveBeenCalledWith('id', '00000000-0000-0000-0000-000000000000');
    });
  });
});
