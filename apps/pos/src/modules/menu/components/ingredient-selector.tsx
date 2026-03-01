'use client';

import { useMemo } from 'react';
import { RecipeIngredient } from '@/types/menu';
import { StockItem } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { calculateFoodCost } from '../utils/food-cost';
import { cn } from '@/lib/utils';

interface IngredientSelectorProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  stockItems: StockItem[];
  productPrice: number;
}

export function IngredientSelector({
  ingredients,
  onChange,
  stockItems,
  productPrice,
}: IngredientSelectorProps) {
  const stockItemMap = useMemo(
    () => new Map(stockItems.map((s) => [s.id, s])),
    [stockItems]
  );

  const foodCost = useMemo(
    () => calculateFoodCost(ingredients, stockItems, productPrice),
    [ingredients, stockItems, productPrice]
  );

  const usedIds = new Set(ingredients.map((i) => i.stock_item_id));

  const addIngredient = () => {
    const available = stockItems.find((s) => !usedIds.has(s.id));
    if (!available) return;
    onChange([
      {
        stock_item_id: available.id,
        stock_item_name: available.name,
        quantity: 0.1,
        unit: available.unit,
      },
      ...ingredients,
    ]);
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    onChange(
      ingredients.map((ing, i) => (i === index ? { ...ing, ...updates } : ing))
    );
  };

  const changeStockItem = (index: number, stockItemId: string) => {
    const item = stockItemMap.get(stockItemId);
    if (!item) return;
    updateIngredient(index, {
      stock_item_id: stockItemId,
      stock_item_name: item.name,
      unit: item.unit,
    });
  };

  return (
    <div className="space-y-4" data-component="ingredient-selector">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Skladniki receptury</h3>
          <p className="text-sm text-muted-foreground">
            Dodaj skladniki z magazynu aby obliczyc food cost
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addIngredient}
          disabled={stockItems.length === 0}
          data-action="add-ingredient"
        >
          <Plus className="mr-1 h-4 w-4" />
          Dodaj skladnik
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Brak skladnikow. Dodaj skladniki aby obliczyc food cost.
        </div>
      ) : (
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => {
            const stockItem = stockItemMap.get(ingredient.stock_item_id);
            const ingredientCost = stockItem
              ? ingredient.quantity * stockItem.cost_per_unit
              : 0;

            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex-1">
                  <Select
                    value={ingredient.stock_item_id}
                    onValueChange={(v) => changeStockItem(index, v)}
                  >
                    <SelectTrigger className="w-full" data-field="ingredient-stock-item">
                      <SelectValue placeholder="Wybierz skladnik" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          disabled={usedIds.has(s.id) && s.id !== ingredient.stock_item_id}
                        >
                          {s.name} ({formatCurrency(s.cost_per_unit)}/{s.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={ingredient.quantity}
                    onChange={(e) =>
                      updateIngredient(index, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-24"
                    data-field="ingredient-quantity"
                  />
                  <span className="text-sm text-muted-foreground w-8">
                    {ingredient.unit}
                  </span>
                </div>
                <span className="text-sm font-medium w-20 text-right" data-field="ingredient-cost">
                  {formatCurrency(ingredientCost)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                  className="text-muted-foreground hover:text-destructive"
                  data-action="remove-ingredient"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {ingredients.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Food cost:</span>
            <span className="text-lg font-bold" data-field="food-cost">
              {formatCurrency(foodCost.totalCost)}
            </span>
          </div>
          {productPrice > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-muted-foreground">% ceny sprzedazy:</span>
              <span
                className={cn(
                  'text-sm font-bold',
                  foodCost.costPercentage < 25
                    ? 'text-green-600'
                    : foodCost.costPercentage < 35
                    ? 'text-yellow-600'
                    : 'text-red-600'
                )}
                data-field="food-cost-percentage"
              >
                {foodCost.costPercentage.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
