/**
 * Recipe Module Types
 *
 * Defines types for recipes (BOM - Bill of Materials), ingredients, and cost calculations.
 * Spec: Section 4, lines 503-612
 */

import { ProductCategory, Allergen } from './enums';
import { BaseEntity } from './common';

export const RECIPE_PRODUCT_CATEGORIES = [
  ProductCategory.SEMI_FINISHED,
  ProductCategory.FINISHED_GOOD,
] as const;

export type RecipeProductCategory =
  (typeof RECIPE_PRODUCT_CATEGORIES)[number];

/**
 * Recipe Ingredient
 * Represents a single ingredient in a recipe with quantity and unit
 */
export interface RecipeIngredient {
  id?: string;
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name?: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  notes?: string;
}

/**
 * Recipe (Bill of Materials)
 * Defines how to make a product from ingredients
 *
 * Supports nested recipes:
 * - SEMI_FINISHED: Intermediate products (buns, sauces, patties)
 * - FINISHED_GOOD: Final products made from semi-finished (burgers, meals)
 */
export interface Recipe extends BaseEntity {
  // Basic info
  product_id: string; // Which product this recipe makes
  name: string; // Recipe name (e.g., "Cheeseburger Classic")
  description: string | null;
  product_category: RecipeProductCategory; // SEMI_FINISHED, FINISHED_GOOD

  // Ingredients (BOM)
  ingredients: RecipeIngredient[];

  // Yield
  yield_quantity: number; // How much this recipe produces
  yield_unit: string; // Unit (szt, kg, l)

  // Preparation
  preparation_time_minutes: number; // Time to prepare
  instructions: string | null; // Step-by-step instructions

  // Allergens (auto-calculated from ingredients)
  allergens: Allergen[]; // 14 EU allergens

  // Costing (auto-calculated)
  total_cost: number; // Sum of all ingredient costs
  cost_per_unit: number; // total_cost / yield_quantity
  food_cost_percentage: number | null; // (cost / selling_price) × 100

  // Version control
  version: number; // Recipe version number
  is_active: boolean; // Current active version

  // Metadata
  created_by: string; // User who created recipe
  last_updated_by: string | null; // User who last modified
}

/**
 * Recipe Version History
 * Tracks changes to recipes over time
 */
export interface RecipeVersion extends BaseEntity {
  recipe_id: string;
  version: number;
  ingredients: RecipeIngredient[];
  total_cost: number;
  cost_per_unit: number;
  changed_by: string;
  change_notes: string | null;
}

/**
 * Ingredient Usage Log
 * Tracks when ingredients are used in production
 */
export interface IngredientUsageLog extends BaseEntity {
  recipe_id: string;
  production_date: Date;
  quantity_produced: number; // How many units were made
  ingredients_used: {
    stock_item_id: string;
    quantity_used: number;
    batch_id?: string; // FEFO tracking
    cost: number;
  }[];
  total_cost: number;
  produced_by: string;
  notes: string | null;
}

/**
 * Allergen Source Tracking
 * Maps which ingredients contain which allergens
 */
export interface AllergenSource {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name: string;
  allergens: Allergen[];
}

/**
 * Recipe Cost Breakdown
 * Detailed cost analysis for a recipe
 */
export interface RecipeCostBreakdown {
  recipe_id: string;
  recipe_name: string;
  ingredients: {
    type: 'stock_item' | 'recipe';
    reference_id: string;
    reference_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
    total_cost: number;
    percentage_of_total: number;
  }[];
  total_cost: number;
  yield_quantity: number;
  cost_per_unit: number;
  selling_price: number | null;
  food_cost_percentage: number | null;
  calculated_at: Date;
}
