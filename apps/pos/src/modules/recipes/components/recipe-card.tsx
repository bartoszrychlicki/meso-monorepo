/**
 * Recipe Card Component
 *
 * Displays a recipe card with key information.
 */

import Link from 'next/link';
import { Recipe } from '@/types/recipe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AllergenBadges } from './allergen-badges';
import { getCategoryDisplayName, formatFoodCostPercentage } from '../utils/recipe-calculator';
import { Clock, DollarSign, Package, CircleHelp } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const foodCost = formatFoodCostPercentage(recipe.food_cost_percentage);
  const foodCostTooltip =
    'FC (Food Cost) = (koszt jednostkowy receptury / cena sprzedazy produktu) x 100. N/A oznacza brak dostepnej ceny sprzedazy do wyliczenia.';

  const categoryColors = {
    raw_material: 'bg-blue-100 text-blue-700 border-blue-200',
    semi_finished: 'bg-purple-100 text-purple-700 border-purple-200',
    finished_good: 'bg-green-100 text-green-700 border-green-200',
  };

  const foodCostColors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <TooltipProvider>
      <Link href={`/recipes/${recipe.id}`}>
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          data-component="recipe-card"
          data-id={recipe.id}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg">{recipe.name}</CardTitle>
              <Badge
                className={categoryColors[recipe.product_category]}
                data-category={recipe.product_category}
              >
                {getCategoryDisplayName(recipe.product_category)}
              </Badge>
            </div>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {recipe.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Składniki:</span>
                <span className="font-medium" data-field="ingredients-count">
                  {recipe.ingredients.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium" data-field="prep-time">
                  {recipe.preparation_time_minutes} min
                </span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span
                  className={`font-medium ${foodCostColors[foodCost.color]}`}
                  data-field="food-cost"
                >
                  {foodCost.text}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {foodCostTooltip}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Cost */}
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Koszt jednostkowy:</span>
              <span className="font-bold" data-field="cost-per-unit">
                {recipe.cost_per_unit.toFixed(2)} zł
              </span>
            </div>

            {/* Allergens */}
            {recipe.allergens.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Alergeny:</p>
                <AllergenBadges allergens={recipe.allergens} size="sm" />
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </TooltipProvider>
  );
}
