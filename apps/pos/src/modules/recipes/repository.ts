/**
 * Recipes Repository
 *
 * Data access layer for recipes, ingredients, and cost calculations.
 */

import { createRepository } from '@/lib/data/repository-factory';
import {
  Recipe,
  RecipeVersion,
  RecipeCostBreakdown,
  AllergenSource,
  IngredientUsageLog,
} from '@/types/recipe';
import { ProductCategory, Allergen } from '@/types/enums';
import { inventoryRepository } from '@/modules/inventory/repository';
import { convertQuantity } from '@/lib/utils/unit-conversion';
import { Product } from '@/types/menu';
import { StockItem } from '@/types/inventory';

// Base repositories
const recipesRepo = createRepository<Recipe>('recipes');
const recipeVersionsRepo = createRepository<RecipeVersion>('recipe_versions');
const usageLogsRepo = createRepository<IngredientUsageLog>('ingredient_usage_logs');
const productsRepo = createRepository<Product>('products');

const MAX_FOOD_COST_PERCENTAGE = 999.99;

type ResolvedRecipe = {
  allergenSources: AllergenSource[];
  allergens: Allergen[];
  costBreakdown: RecipeCostBreakdown;
};

type RecipeContext = {
  recipes: Map<string, Recipe>;
  stockItems: Map<string, StockItem>;
};

function roundFoodCostPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateFoodCostPercentageFromRecipe(
  costPerUnit: number,
  productPrice: number
): number | null {
  if (!Number.isFinite(costPerUnit) || costPerUnit < 0 || productPrice <= 0) {
    return null;
  }

  const percentage = roundFoodCostPercentage((costPerUnit / productPrice) * 100);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > MAX_FOOD_COST_PERCENTAGE) {
    return null;
  }

  return percentage;
}

function formatRecipeNames(recipes: Recipe[]): string {
  return recipes
    .map((recipe) => recipe.name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 5)
    .join(', ');
}

function formatProductNames(products: Product[]): string {
  return products
    .map((product) => product.name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 5)
    .join(', ');
}

function assertYieldUnitForCategory(
  recipe: Pick<Recipe, 'name' | 'product_category' | 'yield_unit'>
): void {
  if (
    recipe.product_category === ProductCategory.FINISHED_GOOD &&
    recipe.yield_unit !== 'szt'
  ) {
    throw new Error(
      `Recipe "${recipe.name}" is invalid: finished goods must use yield_unit "szt"`
    );
  }
}

async function buildRecipeContext(overrides: Recipe[] = []): Promise<RecipeContext> {
  const [recipes, stockItems] = await Promise.all([
    recipesRepo.findMany(() => true),
    inventoryRepository.getAllStockItems(),
  ]);

  const recipesMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  overrides.forEach((recipe) => {
    recipesMap.set(recipe.id, recipe);
  });

  return {
    recipes: recipesMap,
    stockItems: new Map(stockItems.map((stockItem) => [stockItem.id, stockItem])),
  };
}

function findAncestorRecipesInCollection(recipeId: string, recipes: Recipe[]): Recipe[] {
  const parents = new Map<string, Recipe>();
  const queue = [recipeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const recipe of recipes) {
      if (parents.has(recipe.id) || !recipe.is_active) continue;
      if (
        recipe.ingredients.some(
          (ingredient) =>
            ingredient.type === 'recipe' && ingredient.reference_id === currentId
        )
      ) {
        parents.set(recipe.id, recipe);
        queue.push(recipe.id);
      }
    }
  }

  return Array.from(parents.values());
}

function recipeDependsOnTarget(
  startRecipeId: string,
  targetRecipeId: string,
  recipesMap: Map<string, Recipe>
): boolean {
  const visited = new Set<string>();
  const queue = [startRecipeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === targetRecipeId) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentRecipe = recipesMap.get(currentId);
    if (!currentRecipe) continue;

    currentRecipe.ingredients.forEach((ingredient) => {
      if (ingredient.type === 'recipe') {
        queue.push(ingredient.reference_id);
      }
    });
  }

  return false;
}

async function resolveRecipe(
  recipe: Recipe,
  context: RecipeContext,
  memo = new Map<string, ResolvedRecipe>(),
  stack: string[] = []
): Promise<ResolvedRecipe> {
  const cached = memo.get(recipe.id);
  if (cached) return cached;

  if (stack.includes(recipe.id)) {
    const cycle = [...stack, recipe.id].join(' -> ');
    throw new Error(`Cycle detected in recipes: ${cycle}`);
  }

  assertYieldUnitForCategory(recipe);

  const nextStack = [...stack, recipe.id];
  const allergenSet = new Set<Allergen>();
  const sourceMap = new Map<string, AllergenSource>();

  const ingredients = await Promise.all(
    recipe.ingredients.map(async (ingredient) => {
      if (ingredient.type === 'recipe') {
        const subRecipe = context.recipes.get(ingredient.reference_id);
        if (!subRecipe || !subRecipe.is_active) {
          throw new Error(`Sub-recipe not found: ${ingredient.reference_id}`);
        }
        if (subRecipe.product_category !== ProductCategory.SEMI_FINISHED) {
          throw new Error(
            `Sub-recipe "${subRecipe.name}" must be semi-finished`
          );
        }

        const normalizedQuantity = convertQuantity(
          ingredient.quantity,
          ingredient.unit,
          subRecipe.yield_unit
        );
        if (normalizedQuantity == null) {
          throw new Error(
            `Cannot convert ${ingredient.unit} to ${subRecipe.yield_unit} for sub-recipe "${subRecipe.name}"`
          );
        }

        const resolvedSubRecipe = await resolveRecipe(
          subRecipe,
          context,
          memo,
          nextStack
        );

        resolvedSubRecipe.allergens.forEach((allergen) =>
          allergenSet.add(allergen)
        );
        if (resolvedSubRecipe.allergens.length > 0) {
          sourceMap.set(`recipe:${subRecipe.id}`, {
            type: 'recipe',
            reference_id: subRecipe.id,
            reference_name: subRecipe.name,
            allergens: resolvedSubRecipe.allergens,
          });
        }

        return {
          type: 'recipe' as const,
          reference_id: subRecipe.id,
          reference_name: subRecipe.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: resolvedSubRecipe.costBreakdown.cost_per_unit,
          total_cost:
            normalizedQuantity * resolvedSubRecipe.costBreakdown.cost_per_unit,
          percentage_of_total: 0,
        };
      }

      const stockItem = context.stockItems.get(ingredient.reference_id);
      if (!stockItem) {
        throw new Error(`Stock item not found: ${ingredient.reference_id}`);
      }

      const normalizedQuantity = convertQuantity(
        ingredient.quantity,
        ingredient.unit,
        stockItem.unit
      );
      if (normalizedQuantity == null) {
        throw new Error(
          `Cannot convert ${ingredient.unit} to ${stockItem.unit} for stock item "${stockItem.name}"`
        );
      }

      stockItem.allergens.forEach((allergen) => allergenSet.add(allergen));
      if (stockItem.allergens.length > 0) {
        sourceMap.set(`stock_item:${stockItem.id}`, {
          type: 'stock_item',
          reference_id: stockItem.id,
          reference_name: stockItem.name,
          allergens: stockItem.allergens,
        });
      }

      return {
        type: 'stock_item' as const,
        reference_id: stockItem.id,
        reference_name: stockItem.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: stockItem.cost_per_unit,
        total_cost: normalizedQuantity * stockItem.cost_per_unit,
        percentage_of_total: 0,
      };
    })
  );

  const totalCost = ingredients.reduce((sum, ingredient) => sum + ingredient.total_cost, 0);
  ingredients.forEach((ingredient) => {
    ingredient.percentage_of_total =
      totalCost > 0 ? (ingredient.total_cost / totalCost) * 100 : 0;
  });

  const resolution: ResolvedRecipe = {
    allergenSources: Array.from(sourceMap.values()),
    allergens: Array.from(allergenSet),
    costBreakdown: {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      ingredients,
      total_cost: totalCost,
      yield_quantity: recipe.yield_quantity,
      cost_per_unit: totalCost / recipe.yield_quantity,
      selling_price: null,
      food_cost_percentage: null,
      calculated_at: new Date(),
    },
  };

  memo.set(recipe.id, resolution);
  return resolution;
}

async function persistResolvedRecipe(
  recipeId: string,
  resolution: ResolvedRecipe
): Promise<Recipe> {
  return recipesRepo.update(recipeId, {
    allergens: resolution.allergens,
    total_cost: resolution.costBreakdown.total_cost,
    cost_per_unit: resolution.costBreakdown.cost_per_unit,
    food_cost_percentage: resolution.costBreakdown.food_cost_percentage,
    updated_at: new Date().toISOString(),
  });
}

async function syncLinkedMenuProductFoodCosts(recipes: Recipe[]): Promise<void> {
  const recipeMap = new Map(
    recipes
      .filter((recipe) => recipe.is_active)
      .map((recipe) => [recipe.id, recipe] as const)
  );

  if (recipeMap.size === 0) {
    return;
  }

  const activeRecipeIds = new Set(recipeMap.keys());
  const linkedProducts = await productsRepo.findMany(
    (product) =>
      product.is_active &&
      typeof product.recipe_id === 'string' &&
      activeRecipeIds.has(product.recipe_id)
  );

  await Promise.all(
    linkedProducts.map(async (product) => {
      const recipe = recipeMap.get(product.recipe_id!);
      if (!recipe) return;

      const foodCostPercentage = calculateFoodCostPercentageFromRecipe(
        recipe.cost_per_unit,
        product.price
      );

      await productsRepo.update(product.id, {
        food_cost_percentage: foodCostPercentage,
      });
    })
  );
}

async function validateRecipeDependenciesInternal(
  recipeId: string | null,
  recipeDraft: Pick<
    Recipe,
    'name' | 'product_category' | 'yield_unit' | 'ingredients'
  >
): Promise<void> {
  assertYieldUnitForCategory(recipeDraft);

  const recipes = await recipesRepo.findMany(() => true);
  const recipesMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  for (const ingredient of recipeDraft.ingredients) {
    if (ingredient.type !== 'recipe') continue;

    if (recipeId && ingredient.reference_id === recipeId) {
      throw new Error('Recipe cannot reference itself');
    }

    if (
      recipeId &&
      recipeDependsOnTarget(ingredient.reference_id, recipeId, recipesMap)
    ) {
      throw new Error('Recipe dependency cycle detected');
    }

    const subRecipe = recipesMap.get(ingredient.reference_id);
    if (!subRecipe || !subRecipe.is_active) {
      throw new Error(`Sub-recipe not found: ${ingredient.reference_id}`);
    }

    if (subRecipe.product_category !== ProductCategory.SEMI_FINISHED) {
      throw new Error(
        `Only semi-finished recipes can be used as sub-recipes (${subRecipe.name})`
      );
    }

    const normalizedQuantity = convertQuantity(
      ingredient.quantity,
      ingredient.unit,
      subRecipe.yield_unit
    );
    if (normalizedQuantity == null) {
      throw new Error(
        `Cannot convert ${ingredient.unit} to ${subRecipe.yield_unit} for sub-recipe "${subRecipe.name}"`
      );
    }
  }
}

/**
 * Recipes Repository
 * Provides data access methods for recipe management
 */
export const recipesRepository = {
  // Direct access to base repositories
  recipes: recipesRepo,
  versions: recipeVersionsRepo,
  usageLogs: usageLogsRepo,

  async validateRecipeDependencies(
    recipeId: string | null,
    recipeDraft: Pick<
      Recipe,
      'name' | 'product_category' | 'yield_unit' | 'ingredients'
    >
  ): Promise<void> {
    await validateRecipeDependenciesInternal(recipeId, recipeDraft);
  },

  async getBlockedSubRecipeIds(recipeId: string): Promise<string[]> {
    const recipes = await recipesRepo.findMany((recipe) => recipe.is_active);
    const blockedIds = new Set(
      findAncestorRecipesInCollection(recipeId, recipes).map((recipe) => recipe.id)
    );
    blockedIds.add(recipeId);
    return Array.from(blockedIds);
  },

  async findAncestorRecipes(recipeId: string): Promise<Recipe[]> {
    const recipes = await recipesRepo.findMany((recipe) => recipe.is_active);
    return findAncestorRecipesInCollection(recipeId, recipes);
  },

  async recalculateRecipeClosure(
    recipeId: string,
    overrides = new Map<string, Recipe>()
  ): Promise<Recipe[]> {
    const context = await buildRecipeContext(Array.from(overrides.values()));
    const targetRecipe = overrides.get(recipeId) ?? context.recipes.get(recipeId);
    if (!targetRecipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const activeRecipes = Array.from(context.recipes.values()).filter(
      (recipe) => recipe.is_active || recipe.id === recipeId
    );
    const ancestorRecipes = findAncestorRecipesInCollection(recipeId, activeRecipes);
    const memo = new Map<string, ResolvedRecipe>();
    const updatedRecipes: Recipe[] = [];

    for (const currentRecipeId of [recipeId, ...ancestorRecipes.map((recipe) => recipe.id)]) {
      const currentRecipe =
        overrides.get(currentRecipeId) ?? context.recipes.get(currentRecipeId);
      if (!currentRecipe || !currentRecipe.is_active) continue;

      const resolution = await resolveRecipe(currentRecipe, context, memo);
      const persisted = await persistResolvedRecipe(currentRecipeId, resolution);
      context.recipes.set(currentRecipeId, persisted);
      updatedRecipes.push(persisted);
    }

    await syncLinkedMenuProductFoodCosts(updatedRecipes);

    return updatedRecipes;
  },

  /**
   * Get recipes by product category
   *
   * @param category - Product category to filter by
   * @returns List of recipes in that category
   */
  async getRecipesByCategory(category: ProductCategory): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (recipe) => recipe.product_category === category && recipe.is_active
    );
  },

  /**
   * Get recipe by product ID
   *
   * @param productId - Product ID
   * @returns Active recipe for that product or null
   */
  async getRecipeByProductId(productId: string): Promise<Recipe | null> {
    const recipes = await recipesRepo.findMany(
      (recipe) => recipe.product_id === productId && recipe.is_active
    );
    return recipes[0] ?? null;
  },

  /**
   * Calculate recipe cost from ingredients
   *
   * Handles both stock_item and recipe ingredient types.
   *
   * @param recipe - Recipe to calculate cost for
   * @returns Cost breakdown with totals
   */
  async calculateRecipeCost(recipe: Recipe): Promise<RecipeCostBreakdown> {
    const context = await buildRecipeContext([recipe]);
    const resolution = await resolveRecipe(recipe, context);
    return resolution.costBreakdown;
  },

  /**
   * Get all allergens in a recipe
   */
  async getAllergensInRecipe(recipe: Recipe): Promise<Allergen[]> {
    const context = await buildRecipeContext([recipe]);
    const resolution = await resolveRecipe(recipe, context);
    return resolution.allergens;
  },

  /**
   * Get allergen sources in recipe
   */
  async getAllergenSources(recipe: Recipe): Promise<AllergenSource[]> {
    const context = await buildRecipeContext([recipe]);
    const resolution = await resolveRecipe(recipe, context);
    return resolution.allergenSources;
  },

  /**
   * Create recipe with cost calculation
   */
  async createRecipeWithCalculation(
    data: Omit<
      Recipe,
      | 'id'
      | 'created_at'
      | 'updated_at'
      | 'allergens'
      | 'total_cost'
      | 'cost_per_unit'
      | 'food_cost_percentage'
      | 'version'
    >
  ): Promise<Recipe> {
    await validateRecipeDependenciesInternal(null, data);

    const recipe = await recipesRepo.create({
      ...data,
      allergens: [],
      total_cost: 0,
      cost_per_unit: 0,
      food_cost_percentage: null,
      version: 1,
      is_active: true,
    });

    const [updatedRecipe] = await this.recalculateRecipeClosure(
      recipe.id,
      new Map([[recipe.id, recipe]])
    );

    await recipeVersionsRepo.create({
      recipe_id: recipe.id,
      version: 1,
      ingredients: recipe.ingredients,
      total_cost: updatedRecipe?.total_cost ?? 0,
      cost_per_unit: updatedRecipe?.cost_per_unit ?? 0,
      changed_by: data.created_by,
      change_notes: 'Initial version',
    });

    return updatedRecipe ?? recipe;
  },

  /**
   * Find all active recipes that use a given recipe as a sub-recipe ingredient
   */
  async findRecipesUsingSubRecipe(recipeId: string): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (recipe) =>
        recipe.is_active &&
        recipe.ingredients.some(
          (ingredient) =>
            ingredient.type === 'recipe' &&
            ingredient.reference_id === recipeId
        )
    );
  },

  /**
   * Update recipe with versioning
   */
  async updateRecipeWithVersioning(
    recipeId: string,
    data: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>,
    changedBy: string,
    changeNotes?: string
  ): Promise<Recipe> {
    const existingRecipe = await recipesRepo.findById(recipeId);
    if (!existingRecipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const newVersion = existingRecipe.version + 1;
    const draftRecipe: Recipe = {
      ...existingRecipe,
      ...data,
      id: recipeId,
      version: newVersion,
      last_updated_by: changedBy,
      updated_at: new Date().toISOString(),
    };

    await validateRecipeDependenciesInternal(recipeId, draftRecipe);

    const updatedRecipe = await recipesRepo.update(recipeId, {
      ...data,
      version: newVersion,
      last_updated_by: changedBy,
      updated_at: new Date().toISOString(),
    });

    const shouldRecalculate =
      data.ingredients !== undefined ||
      data.yield_quantity !== undefined ||
      data.yield_unit !== undefined ||
      data.product_category !== undefined;

    const currentRecipe = shouldRecalculate
      ? (
          await this.recalculateRecipeClosure(
            recipeId,
            new Map([[recipeId, updatedRecipe]])
          )
        )[0] ?? updatedRecipe
      : updatedRecipe;

    await recipeVersionsRepo.create({
      recipe_id: recipeId,
      version: newVersion,
      ingredients: currentRecipe.ingredients,
      total_cost: currentRecipe.total_cost,
      cost_per_unit: currentRecipe.cost_per_unit,
      changed_by: changedBy,
      change_notes: changeNotes ?? null,
    });

    return currentRecipe;
  },

  async deactivateRecipe(recipeId: string): Promise<Recipe> {
    const recipe = await recipesRepo.findById(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const [ancestorRecipes, activeProducts] = await Promise.all([
      this.findAncestorRecipes(recipeId),
      productsRepo.findMany(
        (product) => product.recipe_id === recipeId && product.is_active
      ),
    ]);

    if (ancestorRecipes.length > 0) {
      throw new Error(
        `Nie mozna dezaktywowac receptury, bo jest uzywana w innych recepturach: ${formatRecipeNames(ancestorRecipes)}.`
      );
    }

    if (activeProducts.length > 0) {
      throw new Error(
        `Nie mozna dezaktywowac receptury, bo jest przypisana do aktywnych produktow menu: ${formatProductNames(activeProducts)}.`
      );
    }

    return recipesRepo.update(recipeId, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Get recipe version history
   */
  async getRecipeVersions(recipeId: string): Promise<RecipeVersion[]> {
    const versions = await recipeVersionsRepo.findMany(
      (version) => version.recipe_id === recipeId
    );
    return versions.sort((a, b) => b.version - a.version);
  },

  /**
   * Log ingredient usage for production
   */
  async logIngredientUsage(
    data: Omit<IngredientUsageLog, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IngredientUsageLog> {
    return usageLogsRepo.create(data);
  },

  /**
   * Get recipes containing specific allergen
   */
  async getRecipesWithAllergen(allergen: Allergen): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (recipe) => recipe.is_active && recipe.allergens.includes(allergen)
    );
  },

  /**
   * Get recipes without specific allergens
   */
  async getRecipesWithoutAllergens(allergens: Allergen[]): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (recipe) =>
        recipe.is_active &&
        !recipe.allergens.some((allergen) => allergens.includes(allergen))
    );
  },

  /**
   * Search recipes by name
   */
  async searchRecipes(query: string): Promise<Recipe[]> {
    const lowerQuery = query.toLowerCase();
    return recipesRepo.findMany(
      (recipe) =>
        recipe.is_active &&
        (recipe.name.toLowerCase().includes(lowerQuery) ||
          (recipe.description?.toLowerCase().includes(lowerQuery) ?? false))
    );
  },

  /**
   * Get all active recipes
   */
  async getAllActiveRecipes(): Promise<Recipe[]> {
    return recipesRepo.findMany((recipe) => recipe.is_active);
  },
};

export default recipesRepository;
