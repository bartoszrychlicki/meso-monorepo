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
import { StockItem } from '@/types/inventory';
import { ProductCategory, Allergen } from '@/types/enums';
import { inventoryRepository } from '@/modules/inventory/repository';

// Base repositories
const recipesRepo = createRepository<Recipe>('recipes');
const recipeVersionsRepo = createRepository<RecipeVersion>('recipe_versions');
const usageLogsRepo = createRepository<IngredientUsageLog>('ingredient_usage_logs');

/**
 * Recipes Repository
 * Provides data access methods for recipe management
 */
export const recipesRepository = {
  // Direct access to base repositories
  recipes: recipesRepo,
  versions: recipeVersionsRepo,
  usageLogs: usageLogsRepo,

  /**
   * Get recipes by product category
   *
   * @param category - Product category to filter by
   * @returns List of recipes in that category
   */
  async getRecipesByCategory(category: ProductCategory): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (r) => r.product_category === category && r.is_active
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
      (r) => r.product_id === productId && r.is_active
    );
    return recipes[0] ?? null;
  },

  /**
   * Calculate recipe cost from ingredients
   *
   * Fetches current stock item costs and computes total cost.
   *
   * @param recipe - Recipe to calculate cost for
   * @returns Cost breakdown with totals
   */
  async calculateRecipeCost(recipe: Recipe): Promise<RecipeCostBreakdown> {
    const ingredientDetails = await Promise.all(
      recipe.ingredients.map(async (ing) => {
        const stockItem = await inventoryRepository.getAllStockItems().then((items) =>
          items.find((s) => s.id === ing.stock_item_id)
        );

        if (!stockItem) {
          throw new Error(`Stock item not found: ${ing.stock_item_id}`);
        }

        const costPerUnit = stockItem.cost_per_unit;
        const totalCost = ing.quantity * costPerUnit;

        return {
          stock_item_id: stockItem.id,
          stock_item_name: stockItem.name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: costPerUnit,
          total_cost: totalCost,
          percentage_of_total: 0, // Calculated below
        };
      })
    );

    const totalCost = ingredientDetails.reduce(
      (sum, ing) => sum + ing.total_cost,
      0
    );

    // Calculate percentages
    ingredientDetails.forEach((ing) => {
      ing.percentage_of_total = (ing.total_cost / totalCost) * 100;
    });

    const costPerUnit = totalCost / recipe.yield_quantity;

    // Try to get selling price from product (if available)
    // TODO: Integrate with product pricing when menu module has it
    const sellingPrice = null;
    const foodCostPercentage = sellingPrice
      ? (totalCost / sellingPrice) * 100
      : null;

    return {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      ingredients: ingredientDetails,
      total_cost: totalCost,
      yield_quantity: recipe.yield_quantity,
      cost_per_unit: costPerUnit,
      selling_price: sellingPrice,
      food_cost_percentage: foodCostPercentage,
      calculated_at: new Date(),
    };
  },

  /**
   * Get all allergens in a recipe
   *
   * Recursively traverses ingredients to find all allergens,
   * including from nested recipes (semi-finished goods).
   *
   * @param recipe - Recipe to analyze
   * @returns List of unique allergens
   */
  async getAllergensInRecipe(recipe: Recipe): Promise<Allergen[]> {
    const allergenSet = new Set<Allergen>();

    for (const ingredient of recipe.ingredients) {
      // Get stock item
      const stockItem = await inventoryRepository
        .getAllStockItems()
        .then((items) => items.find((s) => s.id === ingredient.stock_item_id));

      if (!stockItem) continue;

      // Add direct allergens from stock item
      stockItem.allergens.forEach((a) => allergenSet.add(a));

      // If this ingredient is a semi-finished product, get its recipe
      if (stockItem.product_category === ProductCategory.SEMI_FINISHED) {
        const subRecipe = await this.getRecipeByProductId(stockItem.id);
        if (subRecipe) {
          const subAllergens = await this.getAllergensInRecipe(subRecipe);
          subAllergens.forEach((a) => allergenSet.add(a));
        }
      }
    }

    return Array.from(allergenSet);
  },

  /**
   * Get allergen sources in recipe
   *
   * Maps which ingredients contribute which allergens.
   *
   * @param recipe - Recipe to analyze
   * @returns List of ingredients with their allergens
   */
  async getAllergenSources(recipe: Recipe): Promise<AllergenSource[]> {
    const sources: AllergenSource[] = [];

    for (const ingredient of recipe.ingredients) {
      const stockItem = await inventoryRepository
        .getAllStockItems()
        .then((items) => items.find((s) => s.id === ingredient.stock_item_id));

      if (!stockItem || stockItem.allergens.length === 0) continue;

      sources.push({
        stock_item_id: stockItem.id,
        stock_item_name: stockItem.name,
        allergens: stockItem.allergens,
      });
    }

    return sources;
  },

  /**
   * Create recipe with cost calculation
   *
   * Creates recipe, calculates cost, and sets allergens automatically.
   *
   * @param data - Recipe data
   * @returns Created recipe with calculated fields
   */
  async createRecipeWithCalculation(
    data: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'allergens' | 'total_cost' | 'cost_per_unit' | 'food_cost_percentage' | 'version'>
  ): Promise<Recipe> {
    // Create recipe with version 1
    const recipe = await recipesRepo.create({
      ...data,
      allergens: [],
      total_cost: 0,
      cost_per_unit: 0,
      food_cost_percentage: null,
      version: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Calculate allergens and costs
    const allergens = await this.getAllergensInRecipe(recipe);
    const costBreakdown = await this.calculateRecipeCost(recipe);

    // Update recipe with calculated values
    const updatedRecipe = await recipesRepo.update(recipe.id, {
      allergens,
      total_cost: costBreakdown.total_cost,
      cost_per_unit: costBreakdown.cost_per_unit,
      food_cost_percentage: costBreakdown.food_cost_percentage,
      updated_at: new Date(),
    });

    // Create version history
    await recipeVersionsRepo.create({
      recipe_id: recipe.id,
      version: 1,
      ingredients: recipe.ingredients,
      total_cost: costBreakdown.total_cost,
      cost_per_unit: costBreakdown.cost_per_unit,
      changed_by: data.created_by,
      change_notes: 'Initial version',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return updatedRecipe;
  },

  /**
   * Update recipe with versioning
   *
   * Creates new version and recalculates costs.
   *
   * @param recipeId - Recipe ID
   * @param data - Updated recipe data
   * @param changedBy - User making the change
   * @param changeNotes - Notes about what changed
   * @returns Updated recipe
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

    // Update recipe
    const updatedRecipe = await recipesRepo.update(recipeId, {
      ...data,
      version: newVersion,
      last_updated_by: changedBy,
      updated_at: new Date(),
    });

    // Recalculate if ingredients changed
    if (data.ingredients) {
      const allergens = await this.getAllergensInRecipe(updatedRecipe);
      const costBreakdown = await this.calculateRecipeCost(updatedRecipe);

      await recipesRepo.update(recipeId, {
        allergens,
        total_cost: costBreakdown.total_cost,
        cost_per_unit: costBreakdown.cost_per_unit,
        food_cost_percentage: costBreakdown.food_cost_percentage,
        updated_at: new Date(),
      });
    }

    // Create version history
    await recipeVersionsRepo.create({
      recipe_id: recipeId,
      version: newVersion,
      ingredients: updatedRecipe.ingredients,
      total_cost: updatedRecipe.total_cost,
      cost_per_unit: updatedRecipe.cost_per_unit,
      changed_by: changedBy,
      change_notes: changeNotes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return updatedRecipe;
  },

  /**
   * Get recipe version history
   *
   * @param recipeId - Recipe ID
   * @returns List of versions, sorted by version number (newest first)
   */
  async getRecipeVersions(recipeId: string): Promise<RecipeVersion[]> {
    const versions = await recipeVersionsRepo.findMany(
      (v) => v.recipe_id === recipeId
    );
    return versions.sort((a, b) => b.version - a.version);
  },

  /**
   * Log ingredient usage for production
   *
   * Records when a recipe is used to produce finished goods.
   * This helps track ingredient consumption and costs.
   *
   * @param data - Production log data
   * @returns Created usage log
   */
  async logIngredientUsage(
    data: Omit<IngredientUsageLog, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IngredientUsageLog> {
    return usageLogsRepo.create({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
  },

  /**
   * Get recipes containing specific allergen
   *
   * @param allergen - Allergen to search for
   * @returns List of recipes containing that allergen
   */
  async getRecipesWithAllergen(allergen: Allergen): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (r) => r.is_active && r.allergens.includes(allergen)
    );
  },

  /**
   * Get recipes without specific allergens
   *
   * @param allergens - Allergens to exclude
   * @returns List of recipes safe for those allergen restrictions
   */
  async getRecipesWithoutAllergens(allergens: Allergen[]): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (r) =>
        r.is_active &&
        !r.allergens.some((a) => allergens.includes(a))
    );
  },

  /**
   * Search recipes by name
   *
   * @param query - Search query
   * @returns List of matching recipes
   */
  async searchRecipes(query: string): Promise<Recipe[]> {
    const lowerQuery = query.toLowerCase();
    return recipesRepo.findMany(
      (r) =>
        r.is_active &&
        (r.name.toLowerCase().includes(lowerQuery) ||
          r.description?.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Get all active recipes
   *
   * @returns List of active recipes
   */
  async getAllActiveRecipes(): Promise<Recipe[]> {
    return recipesRepo.findMany((r) => r.is_active);
  },
};

export default recipesRepository;
