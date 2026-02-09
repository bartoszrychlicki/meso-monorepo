'use client';

import { useMemo } from 'react';
import { Product, Category } from '@/types/menu';
import { StockItem } from '@/types/inventory';
import { Input } from '@/components/ui/input';
import { Search, UtensilsCrossed } from 'lucide-react';
import { ProductCard } from './product-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateFoodCost, FoodCostResult } from '../utils/food-cost';

interface MenuGridProps {
  products: Product[];
  categories: Category[];
  stockItems: StockItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleAvailability: (id: string) => void;
  onProductClick: (id: string) => void;
  isLoading: boolean;
}

export function MenuGrid({
  products,
  categories,
  stockItems,
  searchQuery,
  onSearchChange,
  onToggleAvailability,
  onProductClick,
  isLoading,
}: MenuGridProps) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const foodCostMap = useMemo(() => {
    const map = new Map<string, FoodCostResult>();
    if (stockItems.length === 0) return map;
    for (const product of products) {
      const ingredients = product.ingredients ?? [];
      if (ingredients.length > 0) {
        map.set(product.id, calculateFoodCost(ingredients, stockItems, product.price));
      }
    }
    return map;
  }, [products, stockItems]);

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
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj produktu..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          data-field="search"
        />
      </div>

      {/* Grid */}
      {products.length === 0 ? (
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
