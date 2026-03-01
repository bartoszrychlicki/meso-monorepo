import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client before importing the repository
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock the repository factory so modifiersRepository doesn't interfere
vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: vi.fn(() => ({
    findAll: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  })),
}));

import {
  getProductModifierIds,
  setProductModifiers,
  getProductModifiers,
  countProductsUsingModifier,
} from '../repository';

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);

  return chain;
}

describe('getProductModifierIds', () => {
  let chain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createMockChain();
    mockFrom.mockReturnValue(chain);
  });

  it('returns array of modifier IDs', async () => {
    chain.order.mockResolvedValueOnce({
      data: [
        { modifier_id: 'mod-1' },
        { modifier_id: 'mod-2' },
        { modifier_id: 'mod-3' },
      ],
      error: null,
    });

    const result = await getProductModifierIds('product-1');
    expect(result).toEqual(['mod-1', 'mod-2', 'mod-3']);
    expect(mockFrom).toHaveBeenCalledWith('product_modifiers');
    expect(chain.select).toHaveBeenCalledWith('modifier_id');
    expect(chain.eq).toHaveBeenCalledWith('product_id', 'product-1');
    expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true });
  });

  it('returns empty array when no modifiers', async () => {
    chain.order.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const result = await getProductModifierIds('product-no-mods');
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    chain.order.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await getProductModifierIds('product-null');
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    chain.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection refused' },
    });

    await expect(getProductModifierIds('product-1')).rejects.toThrow(
      'getProductModifierIds failed: connection refused'
    );
  });
});

describe('setProductModifiers', () => {
  let chain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createMockChain();
    mockFrom.mockReturnValue(chain);
  });

  it('deletes existing and inserts new modifiers', async () => {
    // First call: delete existing
    chain.eq.mockResolvedValueOnce({ error: null });
    // Second call: insert new
    chain.insert.mockResolvedValueOnce({ error: null });

    await setProductModifiers('product-1', ['mod-a', 'mod-b']);

    // Should have called from('product_modifiers') twice
    expect(mockFrom).toHaveBeenCalledWith('product_modifiers');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.insert).toHaveBeenCalledWith([
      { product_id: 'product-1', modifier_id: 'mod-a', sort_order: 0 },
      { product_id: 'product-1', modifier_id: 'mod-b', sort_order: 1 },
    ]);
  });

  it('handles empty array (delete only, no insert)', async () => {
    // Delete succeeds
    chain.eq.mockResolvedValueOnce({ error: null });

    await setProductModifiers('product-1', []);

    expect(chain.delete).toHaveBeenCalled();
    // insert should NOT be called when modifierIds is empty
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it('throws on delete error', async () => {
    chain.eq.mockResolvedValueOnce({
      error: { message: 'FK constraint' },
    });

    await expect(setProductModifiers('product-1', ['mod-a'])).rejects.toThrow(
      'setProductModifiers delete failed: FK constraint'
    );
  });

  it('throws on insert error', async () => {
    // Delete succeeds
    chain.eq.mockResolvedValueOnce({ error: null });
    // Insert fails
    chain.insert.mockResolvedValueOnce({
      error: { message: 'duplicate key' },
    });

    await expect(setProductModifiers('product-1', ['mod-a'])).rejects.toThrow(
      'setProductModifiers insert failed: duplicate key'
    );
  });
});

describe('getProductModifiers', () => {
  let chain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createMockChain();
    mockFrom.mockReturnValue(chain);
  });

  it('returns full modifier objects ordered by junction sort_order', async () => {
    const modifiers = [
      {
        id: 'mod-2',
        name: 'No Onion',
        price: 0,
        modifier_action: 'remove',
        recipe_id: null,
        is_available: true,
        sort_order: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'mod-1',
        name: 'Extra Cheese',
        price: 3.5,
        modifier_action: 'add',
        recipe_id: null,
        is_available: true,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    // First call: get modifier IDs from junction table (ordered by sort_order)
    chain.order.mockResolvedValueOnce({
      data: [{ modifier_id: 'mod-1' }, { modifier_id: 'mod-2' }],
      error: null,
    });
    // Second call: get full modifier objects (unordered from menu_modifiers)
    chain.in.mockResolvedValueOnce({
      data: modifiers,
      error: null,
    });

    const result = await getProductModifiers('product-1');
    expect(result).toHaveLength(2);
    // Should be re-sorted by junction sort_order, not menu_modifiers order
    expect(result[0].name).toBe('Extra Cheese');
    expect(result[1].name).toBe('No Onion');
    expect(mockFrom).toHaveBeenCalledWith('product_modifiers');
    expect(mockFrom).toHaveBeenCalledWith('menu_modifiers');
  });

  it('returns empty array when no links exist', async () => {
    chain.order.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const result = await getProductModifiers('product-no-mods');
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    chain.order.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await getProductModifiers('product-null');
    expect(result).toEqual([]);
  });

  it('throws on junction table error', async () => {
    chain.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'table not found' },
    });

    await expect(getProductModifiers('product-1')).rejects.toThrow(
      'getProductModifiers failed: table not found'
    );
  });

  it('throws on modifiers fetch error', async () => {
    chain.order.mockResolvedValueOnce({
      data: [{ modifier_id: 'mod-1' }],
      error: null,
    });
    chain.in.mockResolvedValueOnce({
      data: null,
      error: { message: 'query timeout' },
    });

    await expect(getProductModifiers('product-1')).rejects.toThrow(
      'getProductModifiers fetch failed: query timeout'
    );
  });
});

describe('countProductsUsingModifier', () => {
  let chain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createMockChain();
    mockFrom.mockReturnValue(chain);
  });

  it('returns count of products using a modifier', async () => {
    chain.eq.mockResolvedValue({
      count: 5,
      error: null,
    });

    const result = await countProductsUsingModifier('mod-1');
    expect(result).toBe(5);
    expect(mockFrom).toHaveBeenCalledWith('product_modifiers');
    expect(chain.select).toHaveBeenCalledWith('product_id', {
      count: 'exact',
      head: true,
    });
    expect(chain.eq).toHaveBeenCalledWith('modifier_id', 'mod-1');
  });

  it('returns 0 when no products use the modifier', async () => {
    chain.eq.mockResolvedValue({
      count: 0,
      error: null,
    });

    const result = await countProductsUsingModifier('mod-unused');
    expect(result).toBe(0);
  });

  it('returns 0 when count is null', async () => {
    chain.eq.mockResolvedValue({
      count: null,
      error: null,
    });

    const result = await countProductsUsingModifier('mod-null');
    expect(result).toBe(0);
  });

  it('throws on error', async () => {
    chain.eq.mockResolvedValue({
      count: null,
      error: { message: 'permission denied' },
    });

    await expect(countProductsUsingModifier('mod-1')).rejects.toThrow(
      'countProductsUsingModifier failed: permission denied'
    );
  });
});
