import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define mocks that are available when vi.mock factories run
const { mockRecipesRepo, mockVersionsRepo, mockUsageLogsRepo, mockGetAllStockItems } = vi.hoisted(() => {
  const makeMockRepo = () => ({
    findAll: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  });

  return {
    mockRecipesRepo: makeMockRepo(),
    mockVersionsRepo: makeMockRepo(),
    mockUsageLogsRepo: makeMockRepo(),
    mockGetAllStockItems: vi.fn(),
  };
});

// Mock inventory repository
vi.mock('@/modules/inventory/repository', () => ({
  inventoryRepository: {
    getAllStockItems: mockGetAllStockItems,
  },
}));

// Mock repository-factory — use collectionName argument to return the right mock
vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: (collectionName: string) => {
    if (collectionName === 'recipes') return mockRecipesRepo;
    if (collectionName === 'recipe_versions') return mockVersionsRepo;
    return mockUsageLogsRepo;
  },
}));

import { recipesRepository } from '../repository';
import { Allergen, ProductCategory } from '@/types/enums';
import { Recipe } from '@/types/recipe';

const mockStockItems = [
  {
    id: 'stock-beef',
    name: 'Wolowina',
    sku: 'SKU-BEEF',
    unit: 'g',
    cost_per_unit: 0.032,
    allergens: [],
    product_category: ProductCategory.RAW_MATERIAL,
    is_active: true,
    vat_rate: 'vat_5',
    consumption_type: 'ingredient',
    shelf_life_days: 7,
    default_min_quantity: 1000,
    storage_location: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'stock-buns',
    name: 'Bulki',
    sku: 'SKU-BUNS',
    unit: 'szt',
    cost_per_unit: 1.20,
    allergens: [Allergen.GLUTEN, Allergen.EGGS],
    product_category: ProductCategory.RAW_MATERIAL,
    is_active: true,
    vat_rate: 'vat_5',
    consumption_type: 'ingredient',
    shelf_life_days: 3,
    default_min_quantity: 100,
    storage_location: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'stock-cheddar',
    name: 'Ser cheddar',
    sku: 'SKU-CHEDDAR',
    unit: 'g',
    cost_per_unit: 0.028,
    allergens: [Allergen.MILK],
    product_category: ProductCategory.RAW_MATERIAL,
    is_active: true,
    vat_rate: 'vat_5',
    consumption_type: 'ingredient',
    shelf_life_days: 30,
    default_min_quantity: 500,
    storage_location: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const semiFinishedRecipe: Recipe = {
  id: 'recipe-patty',
  product_id: 'product-patty',
  name: 'Patty wolowy',
  description: null,
  product_category: ProductCategory.SEMI_FINISHED,
  ingredients: [
    { type: 'stock_item', reference_id: 'stock-beef', quantity: 150, unit: 'g' },
  ],
  yield_quantity: 1,
  yield_unit: 'szt',
  preparation_time_minutes: 5,
  instructions: null,
  allergens: [],
  total_cost: 4.80,
  cost_per_unit: 4.80,
  food_cost_percentage: null,
  version: 1,
  is_active: true,
  created_by: 'system',
  last_updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const finishedRecipe: Recipe = {
  id: 'recipe-burger',
  product_id: 'product-burger',
  name: 'Cheeseburger',
  description: null,
  product_category: ProductCategory.FINISHED_GOOD,
  ingredients: [
    { type: 'stock_item', reference_id: 'stock-buns', quantity: 1, unit: 'szt' },
    { type: 'recipe', reference_id: 'recipe-patty', quantity: 1, unit: 'szt' },
    { type: 'stock_item', reference_id: 'stock-cheddar', quantity: 40, unit: 'g' },
  ],
  yield_quantity: 1,
  yield_unit: 'szt',
  preparation_time_minutes: 12,
  instructions: null,
  allergens: [],
  total_cost: 0,
  cost_per_unit: 0,
  food_cost_percentage: null,
  version: 1,
  is_active: true,
  created_by: 'system',
  last_updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Nested Recipe Cost Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllStockItems.mockResolvedValue(mockStockItems);
  });

  it('calculates cost for recipe with sub-recipe ingredient', async () => {
    mockRecipesRepo.findById.mockImplementation((id: string) => {
      if (id === 'recipe-patty') return Promise.resolve(semiFinishedRecipe);
      return Promise.resolve(null);
    });

    const breakdown = await recipesRepository.calculateRecipeCost(finishedRecipe);

    // buns: 1 * 1.20 = 1.20
    // patty sub-recipe: 1 * 4.80 = 4.80
    // cheddar: 40 * 0.028 = 1.12
    // total = 7.12
    expect(breakdown.total_cost).toBeCloseTo(7.12, 2);
    expect(breakdown.cost_per_unit).toBeCloseTo(7.12, 2);
    expect(breakdown.ingredients).toHaveLength(3);

    const pattyLine = breakdown.ingredients.find((i) => i.type === 'recipe');
    expect(pattyLine).toBeDefined();
    expect(pattyLine!.reference_name).toBe('Patty wolowy');
    expect(pattyLine!.cost_per_unit).toBe(4.80);
  });

  it('calculates cost for stock-item-only recipe (no nesting)', async () => {
    const breakdown = await recipesRepository.calculateRecipeCost({
      ...semiFinishedRecipe,
      ingredients: [
        { type: 'stock_item', reference_id: 'stock-beef', quantity: 150, unit: 'g' },
      ],
    });

    // 150 * 0.032 = 4.80
    expect(breakdown.total_cost).toBeCloseTo(4.80, 2);
  });

  it('throws when sub-recipe not found', async () => {
    mockRecipesRepo.findById.mockResolvedValue(null);

    await expect(
      recipesRepository.calculateRecipeCost(finishedRecipe)
    ).rejects.toThrow('Sub-recipe not found: recipe-patty');
  });
});

describe('Nested Recipe Allergen Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllStockItems.mockResolvedValue(mockStockItems);
  });

  it('collects allergens from both stock items and sub-recipes', async () => {
    const pattyWithAllergens = { ...semiFinishedRecipe, allergens: [Allergen.SULPHITES] };
    mockRecipesRepo.findById.mockImplementation((id: string) => {
      if (id === 'recipe-patty') return Promise.resolve(pattyWithAllergens);
      return Promise.resolve(null);
    });

    const allergens = await recipesRepository.getAllergensInRecipe(finishedRecipe);

    expect(allergens).toContain(Allergen.GLUTEN);
    expect(allergens).toContain(Allergen.EGGS);
    expect(allergens).toContain(Allergen.MILK);
    expect(allergens).toContain(Allergen.SULPHITES);
    expect(allergens).toHaveLength(4);
  });

  it('deduplicates allergens', async () => {
    const pattyWithGluten = { ...semiFinishedRecipe, allergens: [Allergen.GLUTEN] };
    mockRecipesRepo.findById.mockResolvedValue(pattyWithGluten);

    const allergens = await recipesRepository.getAllergensInRecipe(finishedRecipe);
    const glutenCount = allergens.filter((a) => a === Allergen.GLUTEN).length;
    expect(glutenCount).toBe(1);
  });
});

describe('findRecipesUsingSubRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds parent recipes that reference a sub-recipe', async () => {
    mockRecipesRepo.findMany.mockImplementation((predicate: (r: Recipe) => boolean) => {
      return Promise.resolve([finishedRecipe].filter(predicate));
    });

    const parents = await recipesRepository.findRecipesUsingSubRecipe('recipe-patty');
    expect(parents).toHaveLength(1);
    expect(parents[0].id).toBe('recipe-burger');
  });

  it('returns empty array when no parents found', async () => {
    mockRecipesRepo.findMany.mockImplementation((predicate: (r: Recipe) => boolean) => {
      return Promise.resolve([finishedRecipe].filter(predicate));
    });

    const parents = await recipesRepository.findRecipesUsingSubRecipe('recipe-nonexistent');
    expect(parents).toHaveLength(0);
  });
});
