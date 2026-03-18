import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/types/menu';

// Mock the supabase client before importing the repository
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockFetch = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const mockProductsCreate = vi.fn();
const mockProductsUpdate = vi.fn();
const mockProductsFindById = vi.fn();
const mockProductsFindMany = vi.fn();
const mockRecipesFindById = vi.fn();
const mockGetProductModifiersWithClient = vi.fn();
const mockCountProductsUsingModifierWithClient = vi.fn();

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
        findMany: (...args: unknown[]) => mockProductsFindMany(...args),
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

vi.mock('../relations', () => ({
  getProductModifiersWithClient: (...args: unknown[]) => mockGetProductModifiersWithClient(...args),
  countProductsUsingModifierWithClient: (...args: unknown[]) => mockCountProductsUsingModifierWithClient(...args),
  getProductModifierGroupIdsWithClient: vi.fn(),
  setProductModifierGroupsWithClient: vi.fn(),
  getModifierGroupModifierIdsWithClient: vi.fn(),
  setModifierGroupModifiersWithClient: vi.fn(),
  listModifierGroupsWithClient: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('calculates and persists food cost on product create', async () => {
    mockProductsFindMany.mockResolvedValueOnce([
      makePersistedProduct({ id: 'product-existing', sort_order: 4 }),
    ]);
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
    mockProductsFindMany.mockResolvedValueOnce([
      makePersistedProduct({ id: 'product-2', category_id: 'cat-2', sort_order: 6 }),
    ]);
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
    expect(mockProductsFindMany).toHaveBeenCalled();
  });
});

describe('reorderProductsInCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('calls the protected reorder API with category and ordered ids on supabase backend', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_BACKEND', 'supabase');
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    await reorderProductsInCategory('cat-1', ['prod-3', 'prod-1', 'prod-2']);

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/menu/products/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category_id: 'cat-1',
        product_ids: ['prod-3', 'prod-1', 'prod-2'],
      }),
    });
  });

  it('throws when the reorder API fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_BACKEND', 'supabase');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({
        error: {
          message: 'Brak wymaganego uprawnienia: menu:write',
        },
      }),
    });

    await expect(
      reorderProductsInCategory('cat-1', ['prod-1'])
    ).rejects.toThrow('reorderProductsInCategory failed: Brak wymaganego uprawnienia: menu:write');
  });

  it('updates local repository sort order when using localStorage backend', async () => {
    mockProductsFindMany.mockResolvedValueOnce([
      makePersistedProduct({ id: 'prod-1', category_id: 'cat-1', sort_order: 0 }),
      makePersistedProduct({ id: 'prod-2', category_id: 'cat-1', sort_order: 1 }),
    ]);
    mockProductsUpdate.mockResolvedValue(makePersistedProduct());

    await reorderProductsInCategory('cat-1', ['prod-2', 'prod-1']);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockProductsUpdate).toHaveBeenNthCalledWith(1, 'prod-2', { sort_order: 0 });
    expect(mockProductsUpdate).toHaveBeenNthCalledWith(2, 'prod-1', { sort_order: 1 });
  });

  it('rejects incomplete local reorder payloads', async () => {
    mockProductsFindMany.mockResolvedValueOnce([
      makePersistedProduct({ id: 'prod-1', category_id: 'cat-1', sort_order: 0 }),
      makePersistedProduct({ id: 'prod-2', category_id: 'cat-1', sort_order: 1 }),
    ]);

    await expect(
      reorderProductsInCategory('cat-1', ['prod-1'])
    ).rejects.toThrow('reorderProductsInCategory failed: incomplete category product list');
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

describe('getProductModifierIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of modifier IDs', async () => {
    mockGetProductModifiersWithClient.mockResolvedValueOnce([
      { id: 'mod-1' },
      { id: 'mod-2' },
      { id: 'mod-3' },
    ]);

    const result = await getProductModifierIds('product-1');
    expect(result).toEqual(['mod-1', 'mod-2', 'mod-3']);
  });

  it('returns empty array when no modifiers', async () => {
    mockGetProductModifiersWithClient.mockResolvedValueOnce([]);

    const result = await getProductModifierIds('product-no-mods');
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    mockGetProductModifiersWithClient.mockRejectedValueOnce(
      new Error('getProductModifiers failed: connection refused')
    );

    await expect(getProductModifierIds('product-1')).rejects.toThrow(
      'getProductModifiers failed: connection refused'
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full modifier objects from relational helpers', async () => {
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

    mockGetProductModifiersWithClient.mockResolvedValueOnce(modifiers);

    const result = await getProductModifiers('product-1');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('No Onion');
    expect(result[1].name).toBe('Extra Cheese');
  });

  it('returns empty array when no links exist', async () => {
    mockGetProductModifiersWithClient.mockResolvedValueOnce([]);

    const result = await getProductModifiers('product-no-mods');
    expect(result).toEqual([]);
  });

  it('throws on relation helper error', async () => {
    mockGetProductModifiersWithClient.mockRejectedValueOnce(
      new Error('getProductModifiers failed: table not found')
    );

    await expect(getProductModifiers('product-1')).rejects.toThrow(
      'getProductModifiers failed: table not found'
    );
  });
});

describe('countProductsUsingModifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns count of products using a modifier', async () => {
    mockCountProductsUsingModifierWithClient.mockResolvedValueOnce(5);

    const result = await countProductsUsingModifier('mod-1');
    expect(result).toBe(5);
  });

  it('returns 0 when no products use the modifier', async () => {
    mockCountProductsUsingModifierWithClient.mockResolvedValueOnce(0);

    const result = await countProductsUsingModifier('mod-unused');
    expect(result).toBe(0);
  });

  it('throws on error', async () => {
    mockCountProductsUsingModifierWithClient.mockRejectedValueOnce(
      new Error('countProductsUsingModifier failed: permission denied')
    );

    await expect(countProductsUsingModifier('mod-1')).rejects.toThrow(
      'countProductsUsingModifier failed: permission denied'
    );
  });
});
