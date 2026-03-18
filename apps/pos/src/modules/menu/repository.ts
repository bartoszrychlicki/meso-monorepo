import { Product, Category, ModifierGroup, MenuModifier } from '@/types/menu';
import { Recipe } from '@/types/recipe';
import { createRepository } from '@/lib/data/repository-factory';
import { supabase } from '@/lib/supabase/client';

export const productsRepository = createRepository<Product>('products');
export const categoriesRepository = createRepository<Category>('categories');
export const modifierGroupsRepository = createRepository<ModifierGroup>('modifier_groups');
export const modifiersRepository = createRepository<MenuModifier>('modifiers');
export const recipesRepository = createRepository<Recipe>('recipes');

const MAX_FOOD_COST_PERCENTAGE = 999.99;

function isSupabaseBackend(): boolean {
  return process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';
}

function normalizeModifierIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function roundFoodCostPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

async function getNextSortOrderForCategory(
  categoryId: string,
  excludeProductId?: string
): Promise<number> {
  const categoryProducts = await productsRepository.findMany(
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
  productPrice: number
): Promise<number | null> {
  if (!recipeId || productPrice <= 0) return null;
  const recipe = await recipesRepository.findById(recipeId);
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
  data: Omit<Product, 'created_at' | 'updated_at'>
): Promise<Product> {
  const nextSortOrder = await getNextSortOrderForCategory(data.category_id);
  const foodCostPercentage = await calculateProductFoodCostPercentage(
    data.recipe_id,
    data.price
  );

  return productsRepository.create({
    ...data,
    sort_order: nextSortOrder,
    food_cost_percentage: foodCostPercentage,
  });
}

export async function updateProductWithFoodCost(
  id: string,
  data: Partial<Product>
): Promise<Product> {
  const existingProduct = await productsRepository.findById(id);
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
    nextPrice
  );

  const nextSortOrder = shouldMoveToCategoryEnd
    ? await getNextSortOrderForCategory(nextCategoryId, id)
    : data.sort_order;

  return productsRepository.update(id, {
    ...data,
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

export async function reorderProductsInCategory(
  categoryId: string,
  productIds: string[]
): Promise<void> {
  if (isSupabaseBackend()) {
    const { error } = await supabase.rpc('reorder_menu_products', {
      p_category_id: categoryId,
      p_product_ids: productIds,
    });

    if (error) {
      throw new Error(`reorderProductsInCategory failed: ${error.message}`);
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

/** Get modifier IDs for a product (ordered by per-product sort_order) */
export async function getProductModifierIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_modifiers')
    .select('modifier_id')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`getProductModifierIds failed: ${error.message}`);
  return (data ?? []).map((row: { modifier_id: string }) => row.modifier_id);
}

/** Set modifiers for a product (replace all) */
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

/** Get modifiers for a product (full objects, ordered by per-product sort_order) */
export async function getProductModifiers(productId: string): Promise<MenuModifier[]> {
  const { data, error } = await supabase
    .from('product_modifiers')
    .select('modifier_id, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`getProductModifiers failed: ${error.message}`);
  if (!data || data.length === 0) return [];

  const orderedIds: string[] = data.map((row: { modifier_id: string }) => row.modifier_id);
  const { data: modifiers, error: modError } = await supabase
    .from('menu_modifiers')
    .select('*')
    .in('id', orderedIds);
  if (modError) throw new Error(`getProductModifiers fetch failed: ${modError.message}`);

  // Re-sort by junction sort_order (orderedIds preserves that order)
  const modMap = new Map((modifiers ?? []).map((m: MenuModifier) => [m.id, m]));
  return orderedIds.map((id: string) => modMap.get(id)).filter(Boolean) as MenuModifier[];
}

/** Count products using a modifier */
export async function countProductsUsingModifier(modifierId: string): Promise<number> {
  const { count, error } = await supabase
    .from('product_modifiers')
    .select('product_id', { count: 'exact', head: true })
    .eq('modifier_id', modifierId);
  if (error) throw new Error(`countProductsUsingModifier failed: ${error.message}`);
  return count ?? 0;
}
