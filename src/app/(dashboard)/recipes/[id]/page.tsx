'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Recipe } from '@/types/recipe';
import { StockItem } from '@/types/inventory';
import { recipesRepository } from '@/modules/recipes/repository';
import { inventoryRepository } from '@/modules/inventory/repository';
import { PageHeader } from '@/components/layout/page-header';
import { AllergenBadges } from '@/modules/recipes/components/allergen-badges';
import {
  getCategoryDisplayName,
  formatFoodCostPercentage,
} from '@/modules/recipes/utils/recipe-calculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [recipeData, items] = await Promise.all([
          recipesRepository.recipes.findById(params.id as string),
          inventoryRepository.getAllStockItems(),
        ]);
        setRecipe(recipeData ?? null);
        setStockItems(items);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  const getStockItemName = (id: string) =>
    stockItems.find((s) => s.id === id)?.name ?? id;

  const getStockItemUnit = (id: string) =>
    stockItems.find((s) => s.id === id)?.unit ?? '';

  const getIngredientCost = (stockItemId: string, quantity: number) => {
    const item = stockItems.find((s) => s.id === stockItemId);
    return item ? quantity * item.cost_per_unit : 0;
  };

  const handleDelete = async () => {
    if (!recipe) return;
    try {
      await recipesRepository.recipes.update(recipe.id, {
        is_active: false,
        updated_at: new Date(),
      });
      toast({
        title: 'Receptura usunieta',
        description: `"${recipe.name}" zostala dezaktywowana`,
      });
      router.push('/recipes');
    } catch {
      toast({
        title: 'Blad',
        description: 'Nie udalo sie usunac receptury',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ladowanie receptury...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium mb-2">Nie znaleziono receptury</p>
        <Link href="/recipes">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wroc do listy
          </Button>
        </Link>
      </div>
    );
  }

  const foodCost = formatFoodCostPercentage(recipe.food_cost_percentage);

  const categoryColors: Record<string, string> = {
    raw_material: 'bg-blue-100 text-blue-700',
    semi_finished: 'bg-purple-100 text-purple-700',
    finished_good: 'bg-green-100 text-green-700',
  };

  const foodCostColors: Record<string, string> = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <div className="space-y-6" data-page="recipe-detail" data-id={recipe.id}>
      <PageHeader
        title={recipe.name}
        description={recipe.description || undefined}
        actions={
          <div className="flex gap-2">
            <Link href="/recipes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Lista
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              data-action="delete-recipe"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usun
            </Button>
          </div>
        }
      />

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Kategoria</div>
            <Badge className={`mt-1 ${categoryColors[recipe.product_category]}`}>
              {getCategoryDisplayName(recipe.product_category)}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Czas
            </div>
            <div className="text-2xl font-bold mt-1">
              {recipe.preparation_time_minutes} min
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Koszt / szt
            </div>
            <div className="text-2xl font-bold mt-1">
              {recipe.cost_per_unit.toFixed(2)} zl
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Food Cost %</div>
            <div className={`text-2xl font-bold mt-1 ${foodCostColors[foodCost.color]}`}>
              {foodCost.text}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Skladniki ({recipe.ingredients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase pb-2 border-b">
              <div className="col-span-5">Skladnik</div>
              <div className="col-span-2 text-right">Ilosc</div>
              <div className="col-span-2">Jednostka</div>
              <div className="col-span-3 text-right">Koszt</div>
            </div>
            {recipe.ingredients.map((ing, i) => {
              const cost = getIngredientCost(ing.stock_item_id, ing.quantity);
              return (
                <div
                  key={ing.id || i}
                  className="grid grid-cols-12 gap-2 py-2 border-b last:border-0"
                  data-ingredient={ing.stock_item_id}
                >
                  <div className="col-span-5 font-medium">
                    {getStockItemName(ing.stock_item_id)}
                    {ing.notes && (
                      <span className="block text-xs text-muted-foreground">
                        {ing.notes}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-right">{ing.quantity}</div>
                  <div className="col-span-2 text-muted-foreground">
                    {ing.unit}
                  </div>
                  <div className="col-span-3 text-right font-medium">
                    {cost.toFixed(2)} zl
                  </div>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="grid grid-cols-12 gap-2 font-bold">
              <div className="col-span-9">Koszt calkowity</div>
              <div className="col-span-3 text-right">
                {recipe.total_cost.toFixed(2)} zl
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2 text-sm text-muted-foreground">
              <div className="col-span-9">
                Wydajnosc: {recipe.yield_quantity} {recipe.yield_unit}
              </div>
              <div className="col-span-3 text-right">
                {recipe.cost_per_unit.toFixed(2)} zl / {recipe.yield_unit}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergens */}
      <Card>
        <CardHeader>
          <CardTitle>Alergeny</CardTitle>
        </CardHeader>
        <CardContent>
          <AllergenBadges allergens={recipe.allergens} />
        </CardContent>
      </Card>

      {/* Instructions */}
      {recipe.instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Instrukcje przygotowania</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-sans">
              {recipe.instructions}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Wersja:</span>{' '}
              <span className="font-medium">v{recipe.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Utworzona:</span>{' '}
              <span className="font-medium">
                {new Date(recipe.created_at).toLocaleDateString('pl-PL')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Aktualizacja:</span>{' '}
              <span className="font-medium">
                {new Date(recipe.updated_at).toLocaleDateString('pl-PL')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">ID:</span>{' '}
              <span className="font-mono text-xs">{recipe.id.slice(0, 8)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
