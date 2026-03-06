/**
 * Recipes Store
 *
 * Zustand store for recipe management.
 */

import { create } from 'zustand';
import {
  Recipe,
  RecipeCostBreakdown,
  AllergenSource,
  RecipeProductCategory,
  RECIPE_PRODUCT_CATEGORIES,
} from '@/types/recipe';
import { Allergen } from '@/types/enums';
import { recipesRepository } from './repository';
import { CreateRecipeInput, UpdateRecipeInput } from '@/schemas/recipe';

interface RecipesStore {
  // State
  recipes: Recipe[];
  selectedRecipeId: string | null;
  searchQuery: string;
  categoryFilter: RecipeProductCategory | 'all';
  allergenFilter: Allergen[];
  isLoading: boolean;
  error: string | null;

  // Cost calculation cache
  costBreakdowns: Map<string, RecipeCostBreakdown>;
  allergenSources: Map<string, AllergenSource[]>;

  // Actions
  loadRecipes: () => Promise<void>;
  createRecipe: (data: CreateRecipeInput) => Promise<Recipe>;
  updateRecipe: (
    id: string,
    data: UpdateRecipeInput,
    changedBy: string,
    notes?: string
  ) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  setSelectedRecipeId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: RecipeProductCategory | 'all') => void;
  setAllergenFilter: (allergens: Allergen[]) => void;
  clearError: () => void;

  // Cost & Allergen actions
  calculateRecipeCost: (recipeId: string) => Promise<RecipeCostBreakdown>;
  getAllergenSources: (recipeId: string) => Promise<AllergenSource[]>;

  // Computed
  getFilteredRecipes: () => Recipe[];
  getRecipesByCategory: () => Map<RecipeProductCategory, Recipe[]>;
  getSelectedRecipe: () => Recipe | null;
  getRecipeStats: () => {
    total: number;
    byCategory: Record<string, number>;
  };
}

/**
 * Recipes Store
 * Manages recipe and BOM data
 */
export const useRecipesStore = create<RecipesStore>((set, get) => ({
  // Initial state
  recipes: [],
  selectedRecipeId: null,
  searchQuery: '',
  categoryFilter: 'all',
  allergenFilter: [],
  isLoading: false,
  error: null,
  costBreakdowns: new Map(),
  allergenSources: new Map(),

  /**
   * Load all active recipes
   */
  loadRecipes: async () => {
    set({ isLoading: true, error: null });
    try {
      const recipes = await recipesRepository.getAllActiveRecipes();
      set({ recipes, isLoading: false });
    } catch (error) {
      console.error('Failed to load recipes:', error);
      set({
        error: 'Nie udało się załadować receptur',
        isLoading: false,
      });
    }
  },

  /**
   * Create a new recipe
   *
   * @param data - Recipe creation data
   * @returns Created recipe with calculated costs
   */
  createRecipe: async (data: CreateRecipeInput) => {
    set({ isLoading: true, error: null });
    try {
      const recipe = await recipesRepository.createRecipeWithCalculation({
        ...data,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        last_updated_by: null,
        is_active: true,
        created_by: data.created_by || 'system',
      });

      set({
        recipes: [...get().recipes, recipe],
        isLoading: false,
      });

      return recipe;
    } catch (error) {
      console.error('Failed to create recipe:', error);
      set({
        error: 'Nie udało się utworzyć receptury',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Update an existing recipe
   *
   * @param id - Recipe ID
   * @param data - Update data
   * @param changedBy - User making the change
   * @param notes - Optional change notes
   */
  updateRecipe: async (
    id: string,
    data: UpdateRecipeInput,
    changedBy: string,
    notes?: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      await recipesRepository.updateRecipeWithVersioning(
        id,
        data,
        changedBy,
        notes
      );

      // Clear all cost/allergen caches so parent recipe caches are invalidated
      set({ costBreakdowns: new Map(), allergenSources: new Map() });

      await get().loadRecipes();
    } catch (error) {
      console.error('Failed to update recipe:', error);
      set({
        error: 'Nie udało się zaktualizować receptury',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Soft delete a recipe
   *
   * @param id - Recipe ID
   */
  deleteRecipe: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await recipesRepository.deactivateRecipe(id);
      await get().loadRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      set({
        error: 'Nie udało się usunąć receptury',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Set selected recipe ID
   *
   * @param id - Recipe ID or null to clear selection
   */
  setSelectedRecipeId: (id) => set({ selectedRecipeId: id }),

  /**
   * Set search query
   *
   * @param query - Search query string
   */
  setSearchQuery: (query) => set({ searchQuery: query }),

  /**
   * Set category filter
   *
   * @param category - Category or 'all' for no filter
   */
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  /**
   * Set allergen filter
   *
   * @param allergens - List of allergens to filter by
   */
  setAllergenFilter: (allergens) => set({ allergenFilter: allergens }),

  /**
   * Clear error message
   */
  clearError: () => set({ error: null }),

  /**
   * Calculate recipe cost
   *
   * Uses cache if available.
   *
   * @param recipeId - Recipe ID
   * @returns Cost breakdown
   */
  calculateRecipeCost: async (recipeId: string) => {
    // Check cache
    const cached = get().costBreakdowns.get(recipeId);
    if (cached) return cached;

    // Calculate
    const recipe = get().recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const breakdown = await recipesRepository.calculateRecipeCost(recipe);

    // Cache result
    const costBreakdowns = get().costBreakdowns;
    costBreakdowns.set(recipeId, breakdown);
    set({ costBreakdowns });

    return breakdown;
  },

  /**
   * Get allergen sources for recipe
   *
   * Uses cache if available.
   *
   * @param recipeId - Recipe ID
   * @returns List of allergen sources
   */
  getAllergenSources: async (recipeId: string) => {
    // Check cache
    const cached = get().allergenSources.get(recipeId);
    if (cached) return cached;

    // Calculate
    const recipe = get().recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const sources = await recipesRepository.getAllergenSources(recipe);

    // Cache result
    const allergenSources = get().allergenSources;
    allergenSources.set(recipeId, sources);
    set({ allergenSources });

    return sources;
  },

  /**
   * Get filtered recipes based on search and filters
   *
   * @returns Filtered recipe list
   */
  getFilteredRecipes: () => {
    const { recipes, searchQuery, categoryFilter, allergenFilter } = get();
    let filtered = recipes;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((r) => r.product_category === categoryFilter);
    }

    // Apply allergen filter (exclude recipes with these allergens)
    if (allergenFilter.length > 0) {
      filtered = filtered.filter(
        (r) => !r.allergens.some((a) => allergenFilter.includes(a))
      );
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Get recipes grouped by category
   *
   * @returns Map of category to recipe list
   */
  getRecipesByCategory: () => {
    const recipes = get().recipes;
    const byCategory = new Map<RecipeProductCategory, Recipe[]>();

    RECIPE_PRODUCT_CATEGORIES.forEach((category) => {
      byCategory.set(
        category,
        recipes.filter((r) => r.product_category === category)
      );
    });

    return byCategory;
  },

  /**
   * Get currently selected recipe
   *
   * @returns Selected recipe or null
   */
  getSelectedRecipe: () => {
    const { recipes, selectedRecipeId } = get();
    if (!selectedRecipeId) return null;
    return recipes.find((r) => r.id === selectedRecipeId) ?? null;
  },

  /**
   * Get recipe statistics summary
   *
   * @returns Stats object
   */
  getRecipeStats: () => {
    const recipes = get().recipes;

    const byCategory: Record<string, number> = {};
    RECIPE_PRODUCT_CATEGORIES.forEach((category) => {
      byCategory[category] = recipes.filter(
        (r) => r.product_category === category
      ).length;
    });

    return {
      total: recipes.length,
      byCategory,
    };
  },
}));

export default useRecipesStore;
