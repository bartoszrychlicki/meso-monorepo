import { RecipeIngredient } from '@/types/menu';
import { StockItem } from '@/types/inventory';

export interface FoodCostResult {
  totalCost: number;
  costPercentage: number;
  ingredientCosts: { stock_item_id: string; cost: number }[];
}

export function calculateFoodCost(
  ingredients: RecipeIngredient[],
  stockItems: StockItem[],
  productPrice: number
): FoodCostResult {
  const stockItemMap = new Map(stockItems.map((s) => [s.id, s]));

  const ingredientCosts = ingredients.map((ingredient) => {
    const stockItem = stockItemMap.get(ingredient.stock_item_id);
    const cost = stockItem ? ingredient.quantity * stockItem.cost_per_unit : 0;
    return { stock_item_id: ingredient.stock_item_id, cost };
  });

  const totalCost = Math.round(ingredientCosts.reduce((sum, ic) => sum + ic.cost, 0) * 100) / 100;
  const costPercentage = productPrice > 0 ? (totalCost / productPrice) * 100 : 0;

  return { totalCost, costPercentage, ingredientCosts };
}
