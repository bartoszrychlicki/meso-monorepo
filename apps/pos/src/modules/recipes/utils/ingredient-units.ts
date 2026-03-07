import { convertQuantity } from '@/lib/utils/unit-conversion';
import { StockItem } from '@/types/inventory';
import { Recipe } from '@/types/recipe';

type IngredientWithUnit = {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  quantity: number;
  unit: string;
};

interface NormalizeIngredientUnitsOptions {
  stockItems: Pick<StockItem, 'id' | 'unit'>[];
  recipes: Pick<Recipe, 'id' | 'yield_unit'>[];
}

function getCanonicalUnit(
  ingredient: IngredientWithUnit,
  { stockItems, recipes }: NormalizeIngredientUnitsOptions
): string | null {
  if (ingredient.type === 'recipe') {
    return recipes.find((recipe) => recipe.id === ingredient.reference_id)?.yield_unit ?? null;
  }

  return stockItems.find((stockItem) => stockItem.id === ingredient.reference_id)?.unit ?? null;
}

export function normalizeIngredientUnits<T extends IngredientWithUnit>(
  ingredients: T[],
  options: NormalizeIngredientUnitsOptions
): { ingredients: T[]; changed: boolean } {
  let changed = false;

  const normalizedIngredients = ingredients.map((ingredient) => {
    const canonicalUnit = getCanonicalUnit(ingredient, options);
    if (!canonicalUnit) return ingredient;

    const quantityForCheck =
      Number.isFinite(ingredient.quantity) && ingredient.quantity > 0
        ? ingredient.quantity
        : 1;
    const canConvert =
      ingredient.unit.trim().length > 0 &&
      convertQuantity(quantityForCheck, ingredient.unit, canonicalUnit) != null;

    if (canConvert) return ingredient;

    changed = true;
    return {
      ...ingredient,
      unit: canonicalUnit,
    };
  });

  return { ingredients: normalizedIngredients, changed };
}
