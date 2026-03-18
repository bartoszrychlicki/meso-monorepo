import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/types/menu';

// Mock the supabase client before importing the repository
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const mockProductsCreate = vi.fn();
const mockProductsUpdate = vi.fn();
const mockProductsFindById = vi.fn();
const mockRecipesFindById = vi.fn();

function createBaseRepositoryMock() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
}

// Mock the repository factory (products/recipes are used by food cost persistence)
vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: vi.fn((collectionName: string) => {
    if (collectionName === 'products') {
      return {
        ...createBaseRepositoryMock(),
        findById: (...args: unknown[]) => mockProductsFindById(...args),
        create: (...args: unknown[]) => mockProductsCreate(...args),
        update: (...args: unknown[]) => mockProductsUpdate(...args),
      };
    }

    if (collectionName === 'recipes') {
      return {
        ...createBaseRepositoryMock(),
        findById: (...args: unknown[]) => mockRecipesFindById(...args),
      };
    }

    return createBaseRepositoryMock();
  }),
}));

import {
  createProductWithFoodCost,
  updateProductWithFoodCost,
  getProductModifierIds,
  setProductModifiers,
  getProductModifiers,
  countProductsUsingModifier,
  reorderProductsInCategory,
} from '../repository';

type ProductInput = Omit<Product, 'created_at' | 'updated_at'>;

function makeProductData(
  overrides: Partial<ProductInput> = {}
): ProductInput {
  return {
    id: 'product-1',
    name: 'Burger Klasyczny',
    slug: 'burger-klasyczny',
    description: 'Testowy produkt',
    category_id: 'cat-1',
    type: 'single' as Product['type'],
    price: 20,
    original_price: null,
    images: [],
    is_available: true,
    is_featured: false,
    allergens: [],
    variants: [],
    modifier_groups: [],
    ingredients: [],
    preparation_time_minutes: 10,
    sort_order: 1,
    sku: 'BUR-001',
    tax_rate: 8,
    is_active: true,
    point_ids: [],
    pricing: [],
    ...overrides,
  };
}

function makePersistedProduct(
  overrides: Partial<Product> = {}
): Product {
  return {
    ...makeProductData(overrides),
    created_at: '2026-03-03T00:00:00.000Z',
    updated_at: '2026-03-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('food cost persistence in menu products', () => {
  let chain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createMockChain();
  });

  it('calculates and persists food cost on product create', async () => {
    mockCategorySortOrder(chain, 4);
    mockRecipesFindById.mockResolvedValueOnce({ cost_per_unit: 8 });
    mockProductsCreate.mockResolvedValueOnce({
      ...makePersistedProduct({ recipe_id: 'recipe-1', food_cost_percentage: 40 }),
    });

    await createProductWithFoodCost(
      makeProductData({ recipe_id: 'recipe-1', price: 20 })
    );

    expect(mockRecipesFindById).toHaveBeenCalledWith('recipe-1');
    expect(mockProductsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe_id: 'recipe-1',
        price: 20,
        sort_order: 5,
        food_cost_percentage: 40,
      })
    );
  });

  it('recalculates food cost on price update', async () => {
    mockProductsFindById.mockResolvedValueOnce(
      makePersistedProduct({ id: 'product-1', recipe_id: 'recipe-1', price: 20, food_cost_percentage: 40 })
    );
    mockCategorySortOrder(chain, 4);
    mockRecipesFindById.mockResolvedValueOnce({ cost_per_unit: 8 });
    mockProductsUpdate.mockResolvedValueOnce(
      makePersistedProduct({ id: 'product-1', recipe_id: 'recipe-1', price: 40, food_cost_percentage: 20 })
    );

    await updateProductWithFoodCost('product-1', { price: 40 });

    expect(mockProductsFindById).toHaveBeenCalledWith('product-1');
    expect(mockRecipesFindById).toHaveBeenCalledWith('recipe-1');
    expect(mockProductsUpdate).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        price: 40,
        food_cost_percentage: 20,
      })
    );
  });

  it('stores null food cost when product has no recipe', async () => {
    mockProductsFindById.mockResolvedValueOnce(
      makePersistedProduct({ id: 'product-1', recipe_id: undefined, price: 20, food_cost_percentage: null })
    );
    mockCategorySortOrder(chain, 4);
    mockProductsUpdate.mockResolvedValueOnce(
      makePersistedProduct({ id: 'product-1', recipe_id: undefined, price: 25, food_cost_percentage: null })
    );

    await updateProductWithFoodCost('product-1', { price: 25 });

    expect(mockRecipesFindById).not.toHaveBeenCalled();
    expect(mockProductsUpdate).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        price: 25,
        food_cost_percentage: null,
      })
    );
  });

  it('stores null food cost when computed percentage exceeds database precision', async () => {
    mockProductsFindById.mockResolvedValueOnce(
      makePersistedProduct({ id: 'product-1', recipe_id: 'recipe-1', price: 38, food_cost_percentage: null })
    );
    mockCategorySortOrder(chain, 4);
    mockRecipesFindById.mockResolvedValueOnce({ cost_per_unit: 6061.14 });
    mockProductsUpdate.mockResolvedValueOnce(
      makePersistedProduct({ id: 'product-1', recipe_id: 'recipe-1', price: 38, food_cost_percentage: null })
    );

    await updateProductWithFoodCost('product-1', {});

    expect(mockProductsUpdate).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        food_cost_percentage: null,
      })
    );
  });

  it('moves product to the end when category changes', async () => {
    mockProductsFindById.mockResolvedValueOnce(
      makePersistedProduct({
        id: 'product-1',
        category_id: 'cat-1',
        sort_order: 2,
        recipe_id: undefined,
        food_cost_percentage: null,
      })
    );
    mockCategorySortOrder(chain, 6);
    mockProductsUpdate.mockResolvedValueOnce(
      makePersistedProduct({
        id: 'product-1',
        category_id: 'cat-2',
        sort_order: 7,
      })
    );

    await updateProductWithFoodCost('product-1', { category_id: 'cat-2' });

    expect(mockProductsUpdate).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        category_id: 'cat-2',
        sort_order: 7,
      })
    );
    expect(chain.neq).toHaveBeenCalledWith('id', 'product-1');
  });
});

describe('reorderProductsInCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the reorder RPC with category and ordered ids', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    await reorderProductsInCategory('cat-1', ['prod-3', 'prod-1', 'prod-2']);

    expect(mockRpc).toHaveBeenCalledWith('reorder_menu_products', {
      p_category_id: 'cat-1',
      p_product_ids: ['prod-3', 'prod-1', 'prod-2'],
    });
  });

  it('throws when the reorder RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'rpc failed' } });

    await expect(
      reorderProductsInCategory('cat-1', ['prod-1'])
    ).rejects.toThrow('reorderProductsInCategory failed: rpc failed');
  });
});

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
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);

  return chain;
}

function mockCategorySortOrder(
  chain: ReturnType<typeof createMockChain>,
  maxSortOrder: number | null
) {
  mockFrom.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValueOnce({
    data: maxSortOrder == null ? null : { sort_order: maxSortOrder },
    error: null,
  });
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

  it('deduplicates modifier IDs before insert', async () => {
    chain.eq.mockResolvedValueOnce({ error: null });
    chain.insert.mockResolvedValueOnce({ error: null });

    await setProductModifiers('product-1', ['mod-a', 'mod-b', 'mod-a', '', 'mod-b']);

    expect(chain.insert).toHaveBeenCalledWith([
      { product_id: 'product-1', modifier_id: 'mod-a', sort_order: 0 },
      { product_id: 'product-1', modifier_id: 'mod-b', sort_order: 1 },
    ]);
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
