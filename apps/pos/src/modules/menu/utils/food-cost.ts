import { RecipeIngredient } from '@/types/menu';
import { StockItem } from '@/types/inventory';

export interface FoodCostResult {
  totalCost: number;
  costPercentage: number;
  ingredientCosts: { reference_id: string; cost: number }[];
}

export function calculateFoodCost(
  ingredients: RecipeIngredient[],
  stockItems: StockItem[],
  productPrice: number
): FoodCostResult {
  const stockItemMap = new Map(stockItems.map((s) => [s.id, s]));

  const ingredientCosts = ingredients.map((ingredient) => {
    // Only stock_item type ingredients can be costed from stockItems
    const stockItem = ingredient.type === 'stock_item'
      ? stockItemMap.get(ingredient.reference_id)
      : undefined;
    const cost = stockItem ? ingredient.quantity * stockItem.cost_per_unit : 0;
    return { reference_id: ingredient.reference_id, cost };
  });

  const totalCost = Math.round(ingredientCosts.reduce((sum, ic) => sum + ic.cost, 0) * 100) / 100;
  const costPercentage = productPrice > 0 ? (totalCost / productPrice) * 100 : 0;

  return { totalCost, costPercentage, ingredientCosts };
}
