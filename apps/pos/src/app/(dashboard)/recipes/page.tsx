/**
 * Recipes Page
 *
 * List of all recipes with filtering and search.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, ChefHat, LayoutGrid, Rows3 } from 'lucide-react';
import { RECIPE_PRODUCT_CATEGORIES, RecipeProductCategory } from '@/types/recipe';
import {
  formatFoodCostPercentage,
  getCategoryDisplayName,
} from '@/modules/recipes/utils/recipe-calculator';
import { formatCurrency } from '@/lib/utils';

export default function RecipesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
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

        {RECIPE_PRODUCT_CATEGORIES.map((category) => (
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row">
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
                  setCategoryFilter(value as RecipeProductCategory | 'all')
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
                  {RECIPE_PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getCategoryDisplayName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <div className="inline-flex rounded-md border p-1">
                <Button
                  size="icon"
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  onClick={() => setViewMode('table')}
                  title="Widok tabeli"
                  aria-label="Widok tabeli"
                  data-action="view-table"
                >
                  <Rows3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  onClick={() => setViewMode('cards')}
                  title="Widok kafelków"
                  aria-label="Widok kafelków"
                  data-action="view-cards"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipe List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ładowanie receptur...</p>
        </div>
      ) : filteredRecipes.length > 0 ? (
        viewMode === 'table' ? (
          <Card className="p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>FC</TableHead>
                    <TableHead>Koszt jednostkowy</TableHead>
                    <TableHead>Kategoria</TableHead>
                    <TableHead className="text-right">Ilość składników</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipes.map((recipe) => {
                    const foodCost = formatFoodCostPercentage(
                      recipe.food_cost_percentage
                    );

                    return (
                      <TableRow
                        key={recipe.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/recipes/${recipe.id}`)}
                        data-id={recipe.id}
                      >
                        <TableCell className="font-medium">{recipe.name}</TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${foodCostColors[foodCost.color]}`}
                            data-field="food-cost"
                          >
                            {foodCost.text}
                          </span>
                        </TableCell>
                        <TableCell data-field="cost-per-unit">
                          {formatCurrency(recipe.cost_per_unit)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={categoryColors[recipe.product_category]}
                            data-category={recipe.product_category}
                          >
                            {getCategoryDisplayName(recipe.product_category)}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          data-field="ingredients-count"
                        >
                          {recipe.ingredients.length}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )
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
