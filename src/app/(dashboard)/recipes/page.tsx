/**
 * Recipes Page
 *
 * List of all recipes with filtering and search.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRecipesStore } from '@/modules/recipes/store';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeCard } from '@/modules/recipes/components/recipe-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, ChefHat } from 'lucide-react';
import { ProductCategory } from '@/types/enums';
import { getCategoryDisplayName } from '@/modules/recipes/utils/recipe-calculator';

export default function RecipesPage() {
  const {
    loadRecipes,
    getFilteredRecipes,
    getRecipeStats,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    isLoading,
  } = useRecipesStore();

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filteredRecipes = getFilteredRecipes();
  const stats = getRecipeStats();

  return (
    <div className="space-y-6" data-page="recipes">
      <PageHeader
        title="Receptury (BOM)"
        description="Zarządzanie recepturami i kalkulacja kosztów produkcji"
        actions={
          <Link href="/recipes/new">
            <Button data-action="create-recipe">
              <Plus className="mr-2 h-4 w-4" />
              Nowa receptura
            </Button>
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-muted-foreground" />
              Łącznie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-metric="total-recipes">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        {Object.values(ProductCategory).map((category) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {getCategoryDisplayName(category)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-metric={`${category}-recipes`}
              >
                {stats.byCategory[category] || 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj receptur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-field="search-query"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(value) =>
                setCategoryFilter(value as ProductCategory | 'all')
              }
            >
              <SelectTrigger
                className="w-full sm:w-[220px]"
                data-field="category-filter"
              >
                <SelectValue placeholder="Filtruj po kategorii" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {Object.values(ProductCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ładowanie receptur...</p>
        </div>
      ) : filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Brak receptur</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Spróbuj zmienić kryteria wyszukiwania'
                : 'Dodaj pierwszą recepturę do systemu'}
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <Link href="/recipes/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj recepturę
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
