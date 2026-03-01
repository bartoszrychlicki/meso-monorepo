/**
 * Recipe Calculator Utilities
 *
 * Helper functions for recipe calculations, food cost%, and conversions.
 */

import { Recipe, RecipeIngredient, RecipeCostBreakdown } from '@/types/recipe';
import { ProductCategory, Allergen } from '@/types/enums';

/**
 * Calculate food cost percentage
 *
 * @param recipeCost - Total cost of recipe
 * @param sellingPrice - Selling price
 * @returns Food cost percentage (0-100)
 */
export function calculateFoodCostPercentage(
  recipeCost: number,
  sellingPrice: number
): number {
  if (sellingPrice === 0) return 0;
  return (recipeCost / sellingPrice) * 100;
}

/**
 * Calculate ideal selling price for target food cost%
 *
 * @param recipeCost - Total cost of recipe
 * @param targetFoodCostPercentage - Target food cost% (e.g., 30 for 30%)
 * @returns Recommended selling price
 */
export function calculateIdealPrice(
  recipeCost: number,
  targetFoodCostPercentage: number
): number {
  if (targetFoodCostPercentage === 0) return 0;
  return recipeCost / (targetFoodCostPercentage / 100);
}

/**
 * Calculate margin from food cost%
 *
 * @param foodCostPercentage - Food cost% (0-100)
 * @returns Margin percentage
 */
export function calculateMargin(foodCostPercentage: number): number {
  return 100 - foodCostPercentage;
}

/**
 * Scale recipe for different batch size
 *
 * @param recipe - Original recipe
 * @param newYield - New yield quantity
 * @returns Scaled recipe ingredients
 */
export function scaleRecipe(
  recipe: Recipe,
  newYield: number
): RecipeIngredient[] {
  const scaleFactor = newYield / recipe.yield_quantity;

  return recipe.ingredients.map((ing) => ({
    ...ing,
    quantity: ing.quantity * scaleFactor,
  }));
}

/**
 * Convert unit measurements
 *
 * Common conversions for recipes.
 *
 * @param quantity - Original quantity
 * @param fromUnit - Unit to convert from
 * @param toUnit - Unit to convert to
 * @returns Converted quantity or null if conversion not supported
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  // Normalize units
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  // Same unit
  if (from === to) return quantity;

  // Weight conversions
  const weightConversions: Record<string, number> = {
    kg: 1000,
    g: 1,
    dag: 10,
    mg: 0.001,
  };

  if (from in weightConversions && to in weightConversions) {
    return (quantity * weightConversions[from]) / weightConversions[to];
  }

  // Volume conversions
  const volumeConversions: Record<string, number> = {
    l: 1000,
    ml: 1,
    dl: 100,
  };

  if (from in volumeConversions && to in volumeConversions) {
    return (quantity * volumeConversions[from]) / volumeConversions[to];
  }

  // No conversion available
  return null;
}

/**
 * Get product category display name
 *
 * @param category - Product category
 * @returns Polish display name
 */
export function getCategoryDisplayName(category: ProductCategory): string {
  const names: Record<ProductCategory, string> = {
    [ProductCategory.RAW_MATERIAL]: 'Surowiec',
    [ProductCategory.SEMI_FINISHED]: 'Półprodukt',
    [ProductCategory.FINISHED_GOOD]: 'Produkt finalny',
  };
  return names[category];
}

/**
 * Get allergen display name
 *
 * @param allergen - Allergen enum
 * @returns Polish display name
 */
export function getAllergenDisplayName(allergen: Allergen): string {
  const names: Record<Allergen, string> = {
    [Allergen.GLUTEN]: 'Gluten',
    [Allergen.CRUSTACEANS]: 'Skorupiaki',
    [Allergen.EGGS]: 'Jaja',
    [Allergen.FISH]: 'Ryby',
    [Allergen.PEANUTS]: 'Orzeszki ziemne',
    [Allergen.SOYBEANS]: 'Soja',
    [Allergen.MILK]: 'Mleko',
    [Allergen.NUTS]: 'Orzechy',
    [Allergen.CELERY]: 'Seler',
    [Allergen.MUSTARD]: 'Gorczyca',
    [Allergen.SESAME]: 'Sezam',
    [Allergen.SULPHITES]: 'Dwutlenek siarki',
    [Allergen.LUPIN]: 'Łubin',
    [Allergen.MOLLUSCS]: 'Mięczaki',
  };
  return names[allergen];
}

/**
 * Get allergen icon/emoji
 *
 * @param allergen - Allergen enum
 * @returns Emoji representation
 */
export function getAllergenIcon(allergen: Allergen): string {
  const icons: Record<Allergen, string> = {
    [Allergen.GLUTEN]: '🌾',
    [Allergen.CRUSTACEANS]: '🦀',
    [Allergen.EGGS]: '🥚',
    [Allergen.FISH]: '🐟',
    [Allergen.PEANUTS]: '🥜',
    [Allergen.SOYBEANS]: '🫘',
    [Allergen.MILK]: '🥛',
    [Allergen.NUTS]: '🌰',
    [Allergen.CELERY]: '🥬',
    [Allergen.MUSTARD]: '🟡',
    [Allergen.SESAME]: '⚪',
    [Allergen.SULPHITES]: '🔵',
    [Allergen.LUPIN]: '🟣',
    [Allergen.MOLLUSCS]: '🐚',
  };
  return icons[allergen];
}

/**
 * Format food cost percentage for display
 *
 * @param percentage - Food cost percentage
 * @returns Formatted string with color indicator
 */
export function formatFoodCostPercentage(percentage: number | null): {
  text: string;
  color: 'green' | 'yellow' | 'red';
} {
  if (percentage === null) {
    return { text: 'N/A', color: 'yellow' };
  }

  const text = `${percentage.toFixed(1)}%`;

  // Industry standard: < 30% = great, 30-35% = good, > 35% = high
  if (percentage < 30) {
    return { text, color: 'green' };
  } else if (percentage <= 35) {
    return { text, color: 'yellow' };
  } else {
    return { text, color: 'red' };
  }
}

/**
 * Calculate ingredient cost contribution
 *
 * Shows which ingredients cost the most.
 *
 * @param costBreakdown - Recipe cost breakdown
 * @returns Sorted list of ingredients by cost (highest first)
 */
export function getTopCostIngredients(
  costBreakdown: RecipeCostBreakdown,
  limit = 5
) {
  return costBreakdown.ingredients
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, limit);
}

/**
 * Validate recipe ingredients
 *
 * Checks for common issues in recipes.
 *
 * @param ingredients - Recipe ingredients
 * @returns List of validation errors
 */
export function validateRecipeIngredients(
  ingredients: RecipeIngredient[]
): string[] {
  const errors: string[] = [];

  if (ingredients.length === 0) {
    errors.push('Receptura musi zawierać przynajmniej jeden składnik');
  }

  // Check for duplicate ingredients
  const stockItemIds = ingredients.map((i) => i.stock_item_id);
  const duplicates = stockItemIds.filter(
    (id, index) => stockItemIds.indexOf(id) !== index
  );

  if (duplicates.length > 0) {
    errors.push('Receptura zawiera duplikaty składników');
  }

  // Check for zero or negative quantities
  ingredients.forEach((ing, index) => {
    if (ing.quantity <= 0) {
      errors.push(`Składnik #${index + 1} ma nieprawidłową ilość`);
    }
  });

  return errors;
}
