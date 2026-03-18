import {
  Product,
  Category,
  ModifierGroup,
  MenuModifier,
  type ProductWriteInput,
} from '@/types/menu';
import { Recipe } from '@/types/recipe';
import { createRepository } from '@/lib/data/repository-factory';
import { supabase } from '@/lib/supabase/client';
import type { BaseRepository } from '@/lib/data/base-repository';
import {
  countProductsUsingModifierWithClient,
  getModifierGroupModifierIdsWithClient,
  getProductModifierGroupIdsWithClient,
  getProductModifiersWithClient,
  listModifierGroupsWithClient,
  setModifierGroupModifiersWithClient,
  setProductModifierGroupsWithClient,
} from './relations';

export const productsRepository = createRepository<Product>('products');
export const categoriesRepository = createRepository<Category>('categories');
export const modifierGroupsRepository = createRepository<ModifierGroup>('modifier_groups');
export const modifiersRepository = createRepository<MenuModifier>('modifiers');
export const recipesRepository = createRepository<Recipe>('recipes');

const MAX_FOOD_COST_PERCENTAGE = 999.99;

type ProductRepo = BaseRepository<Product>;
type RecipeRepo = BaseRepository<Recipe>;

function isSupabaseBackend(): boolean {
  return process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';
}

function normalizeModifierIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function roundFoodCostPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

function stripProductWriteRelations<T extends ProductWriteInput | Partial<ProductWriteInput>>(data: T) {
  const { modifier_group_ids: _modifierGroupIds, ...persistedProduct } = data;
  return persistedProduct;
}

async function getNextSortOrderForCategory(
  categoryId: string,
  excludeProductId?: string,
  productsRepo: ProductRepo = productsRepository
): Promise<number> {
  const categoryProducts = await productsRepo.findMany(
    (product) => product.category_id === categoryId && product.id !== excludeProductId
  );
  const maxSortOrder = categoryProducts.reduce(
    (maxValue, product) => Math.max(maxValue, product.sort_order ?? -1),
    -1
  );
  return maxSortOrder + 1;
}

export async function calculateProductFoodCostPercentage(
  recipeId: string | null | undefined,
  productPrice: number,
  recipeRepo: RecipeRepo = recipesRepository
): Promise<number | null> {
  if (!recipeId || productPrice <= 0) return null;
  const recipe = await recipeRepo.findById(recipeId);
  if (!recipe) return null;

  const costPerUnit = recipe.cost_per_unit;

  if (!Number.isFinite(costPerUnit) || costPerUnit < 0) return null;

  const percentage = roundFoodCostPercentage((costPerUnit / productPrice) * 100);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > MAX_FOOD_COST_PERCENTAGE) {
    return null;
  }

  return percentage;
}

export async function createProductWithFoodCost(
  data: ProductWriteInput,
  repositories: {
    productsRepo?: ProductRepo;
    recipesRepo?: RecipeRepo;
  } = {}
): Promise<Product> {
  const productsRepo = repositories.productsRepo ?? productsRepository;
  const recipesRepo = repositories.recipesRepo ?? recipesRepository;
  const nextSortOrder = await getNextSortOrderForCategory(data.category_id, undefined, productsRepo);
  const foodCostPercentage = await calculateProductFoodCostPercentage(
    data.recipe_id,
    data.price,
    recipesRepo
  );

  return productsRepo.create(
    {
      ...stripProductWriteRelations(data),
      sort_order: nextSortOrder,
      food_cost_percentage: foodCostPercentage,
    } as unknown as Omit<Product, 'id' | 'created_at' | 'updated_at'>
  );
}

export async function updateProductWithFoodCost(
  id: string,
  data: Partial<ProductWriteInput>,
  repositories: {
    productsRepo?: ProductRepo;
    recipesRepo?: RecipeRepo;
  } = {}
): Promise<Product> {
  const productsRepo = repositories.productsRepo ?? productsRepository;
  const recipesRepo = repositories.recipesRepo ?? recipesRepository;
  const existingProduct = await productsRepo.findById(id);
  if (!existingProduct) {
    throw new Error(`Product ${id} not found`);
  }

  const nextPrice = data.price ?? existingProduct.price;
  const nextRecipeId =
    data.recipe_id === undefined ? existingProduct.recipe_id : data.recipe_id;
  const nextCategoryId = data.category_id ?? existingProduct.category_id;
  const shouldMoveToCategoryEnd = nextCategoryId !== existingProduct.category_id;

  const foodCostPercentage = await calculateProductFoodCostPercentage(
    nextRecipeId,
    nextPrice,
    recipesRepo
  );

  const nextSortOrder = shouldMoveToCategoryEnd
    ? await getNextSortOrderForCategory(nextCategoryId, id, productsRepo)
    : data.sort_order;

  return productsRepo.update(id, {
    ...stripProductWriteRelations(data),
    ...(nextSortOrder === undefined ? {} : { sort_order: nextSortOrder }),
    food_cost_percentage: foodCostPercentage,
  });
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  return productsRepository.findMany((p) => p.category_id === categoryId && p.is_available);
}

export async function getActiveProducts(): Promise<Product[]> {
  return productsRepository.findMany((p) => p.is_available);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const lowerQuery = query.toLowerCase();
  return productsRepository.findMany(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

export async function toggleAvailability(productId: string): Promise<Product> {
  const product = await productsRepository.findById(productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  return productsRepository.update(productId, { is_available: !product.is_available });
}

export async function toggleMenuVisibility(productId: string): Promise<Product> {
  const product = await productsRepository.findById(productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  return productsRepository.update(productId, {
    is_hidden_in_menu: !(product.is_hidden_in_menu === true),
  });
}

export async function reorderProductsInCategory(
  categoryId: string,
  productIds: string[]
): Promise<void> {
  if (isSupabaseBackend()) {
    const response = await fetch('/api/v1/menu/products/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category_id: categoryId,
        product_ids: productIds,
      }),
    });

    if (!response.ok) {
      let errorMessage = `request failed with status ${response.status}`;

      try {
        const payload = await response.json() as {
          error?: {
            message?: string;
          };
        };
        errorMessage = payload.error?.message || errorMessage;
      } catch {
        // Keep the fallback message when the response has no JSON error payload.
      }

      throw new Error(`reorderProductsInCategory failed: ${errorMessage}`);
    }

    return;
  }

  const categoryProducts = await productsRepository.findMany(
    (product) => product.category_id === categoryId
  );
  const categoryProductIds = new Set(categoryProducts.map((product) => product.id));
  const uniqueIds = new Set(productIds);

  if (uniqueIds.size !== productIds.length) {
    throw new Error('reorderProductsInCategory failed: duplicate product IDs');
  }

  if (categoryProducts.length !== productIds.length) {
    throw new Error('reorderProductsInCategory failed: incomplete category product list');
  }

  if (productIds.some((productId) => !categoryProductIds.has(productId))) {
    throw new Error('reorderProductsInCategory failed: product outside category');
  }

  await Promise.all(
    productIds.map((productId, index) =>
      productsRepository.update(productId, { sort_order: index })
    )
  );
}

export async function getProductModifierIds(productId: string): Promise<string[]> {
  const modifiers = await getProductModifiers(productId);
  return modifiers.map((modifier) => modifier.id);
}

export async function setProductModifiers(productId: string, modifierIds: string[]): Promise<void> {
  const normalizedModifierIds = normalizeModifierIds(modifierIds);
  const { error: delError } = await supabase
    .from('product_modifiers')
    .delete()
    .eq('product_id', productId);
  if (delError) throw new Error(`setProductModifiers delete failed: ${delError.message}`);

  if (normalizedModifierIds.length > 0) {
    const rows = normalizedModifierIds.map((modifier_id, index) => ({
      product_id: productId,
      modifier_id,
      sort_order: index,
    }));
    const { error: insError } = await supabase
      .from('product_modifiers')
      .insert(rows);
    if (insError) throw new Error(`setProductModifiers insert failed: ${insError.message}`);
  }
}

export async function getProductModifiers(productId: string): Promise<MenuModifier[]> {
  return getProductModifiersWithClient(supabase, productId);
}

export async function countProductsUsingModifier(modifierId: string): Promise<number> {
  return countProductsUsingModifierWithClient(supabase, modifierId);
}

export async function listModifierGroups(): Promise<ModifierGroup[]> {
  return listModifierGroupsWithClient(supabase);
}

export async function getProductModifierGroupIds(productId: string): Promise<string[]> {
  return getProductModifierGroupIdsWithClient(supabase, productId);
}

export async function setProductModifierGroups(productId: string, groupIds: string[]): Promise<void> {
  await setProductModifierGroupsWithClient(supabase, productId, groupIds);
}

export async function getModifierGroupModifierIds(groupId: string): Promise<string[]> {
  return getModifierGroupModifierIdsWithClient(supabase, groupId);
}

export async function setModifierGroupModifiers(groupId: string, modifierIds: string[]): Promise<void> {
  await setModifierGroupModifiersWithClient(supabase, groupId, modifierIds);
}
