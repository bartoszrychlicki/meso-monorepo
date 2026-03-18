'use client';

import { useEffect, useMemo, useState } from 'react';
import { Product, Category } from '@/types/menu';
import { Recipe } from '@/types/recipe';
import { StockItem } from '@/types/inventory';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, Search, UtensilsCrossed } from 'lucide-react';
import { ProductCard } from './product-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateFoodCost, FoodCostResult } from '../utils/food-cost';
import { getProductPromotionPricing } from '../utils/pricing';
import { Button } from '@/components/ui/button';
import { ProductReorderList } from './product-reorder-list';

interface MenuGridProps {
  products: Product[];
  categories: Category[];
  stockItems: StockItem[];
  recipes: Recipe[];
  selectedCategoryId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleAvailability: (id: string) => void;
  onReorderProducts: (categoryId: string, productIds: string[]) => Promise<void>;
  onProductClick: (id: string) => void;
  isLoading: boolean;
}

export function MenuGrid({
  products,
  categories,
  stockItems,
  recipes,
  selectedCategoryId,
  searchQuery,
  onSearchChange,
  onToggleAvailability,
  onReorderProducts,
  onProductClick,
  isLoading,
}: MenuGridProps) {
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSavingReorder, setIsSavingReorder] = useState(false);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const recipeMap = useMemo(
    () => new Map(recipes.map((r) => [r.id, r])),
    [recipes]
  );

  const foodCostMap = useMemo(() => {
    const map = new Map<string, FoodCostResult>();
    for (const product of products) {
      const effectivePrice = getProductPromotionPricing(product).currentPrice;
      // Prefer recipe-based cost
      if (product.recipe_id) {
        const recipe = recipeMap.get(product.recipe_id);
        if (recipe) {
          const costPercentage = effectivePrice > 0
            ? (recipe.cost_per_unit / effectivePrice) * 100
            : 0;
          map.set(product.id, {
            totalCost: recipe.cost_per_unit,
            costPercentage,
            ingredientCosts: recipe.ingredients.map((ing) => ({
              reference_id: ing.reference_id,
              cost: ing.quantity * (ing.cost_per_unit ?? 0),
            })),
          });
          continue;
        }
      }
      // Fallback to inline ingredients
      const ingredients = product.ingredients ?? [];
      if (ingredients.length > 0 && stockItems.length > 0) {
        map.set(product.id, calculateFoodCost(ingredients, stockItems, effectivePrice));
      }
    }
    return map;
  }, [products, stockItems, recipeMap]);

  const canReorder =
    selectedCategoryId !== null &&
    searchQuery.trim().length === 0 &&
    products.length >= 2;

  useEffect(() => {
    if (!canReorder && isReorderMode) {
      setIsReorderMode(false);
    }
  }, [canReorder, isReorderMode]);

  const handleReorder = async (productIds: string[]) => {
    if (!selectedCategoryId) return;

    setIsSavingReorder(true);
    try {
      await onReorderProducts(selectedCategoryId, productIds);
    } finally {
      setIsSavingReorder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-component="menu-grid-skeleton">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-component="menu-grid">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!isReorderMode ? (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj produktu..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              data-field="search"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground">
            Tryb ukladania kolejnosci jest aktywny. Wyszukiwanie jest chwilowo ukryte.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isReorderMode ? 'default' : 'outline'}
            disabled={!canReorder || isSavingReorder}
            onClick={() => setIsReorderMode((current) => !current)}
            data-action="toggle-reorder-mode"
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {isReorderMode ? 'Wroc do siatki' : 'Uloz kolejnosc'}
          </Button>
        </div>
      </div>

      {!selectedCategoryId && !isReorderMode ? (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Wybierz konkretna kategorie, aby ulozyc kolejnosc produktow.
        </div>
      ) : null}

      {selectedCategoryId && searchQuery.trim().length > 0 && !isReorderMode ? (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Aby ulozyc kolejnosc, wyczysc wyszukiwanie i pokaz pelna liste produktow kategorii.
        </div>
      ) : null}

      {selectedCategoryId && searchQuery.trim().length === 0 && products.length < 2 && !isReorderMode ? (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Ta kategoria ma za malo produktow, aby zmieniac kolejnosc.
        </div>
      ) : null}

      {isReorderMode ? (
        <ProductReorderList
          products={products}
          isSaving={isSavingReorder}
          onReorder={handleReorder}
          onClose={() => setIsReorderMode(false)}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title="Brak produktow"
          description={
            searchQuery
              ? 'Nie znaleziono produktow pasujacych do wyszukiwania'
              : 'Dodaj pierwszy produkt do menu'
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryName={categoryMap.get(product.category_id)}
              foodCost={foodCostMap.get(product.id) ?? null}
              onToggleAvailability={onToggleAvailability}
              onClick={onProductClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
