'use client';

import { Category } from '@/types/menu';
import { cn } from '@/lib/utils';
import { LayoutGrid, Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface CategoryListProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  productCountByCategory: Record<string, number>;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (category: Category) => void;
  onToggleCategory?: (category: Category) => void;
  onAddCategory?: () => void;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  'from-orange-500 to-red-600': 'from-orange-500/20 to-red-600/20',
  'from-yellow-400 to-orange-500': 'from-yellow-400/20 to-orange-500/20',
  'from-green-400 to-emerald-600': 'from-green-400/20 to-emerald-600/20',
  'from-blue-400 to-cyan-600': 'from-blue-400/20 to-cyan-600/20',
  'from-pink-400 to-rose-600': 'from-pink-400/20 to-rose-600/20',
  'from-violet-400 to-purple-600': 'from-violet-400/20 to-purple-600/20',
};

export function CategoryList({
  categories,
  selectedCategoryId,
  onSelectCategory,
  productCountByCategory,
  onEditCategory,
  onDeleteCategory,
  onToggleCategory,
  onAddCategory,
}: CategoryListProps) {
  const totalProducts = Object.values(productCountByCategory).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-1" data-component="category-list">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          selectedCategoryId === null
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        data-action="select-category"
        data-id="all"
      >
        <span className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          Wszystkie
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            selectedCategoryId === null
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted-foreground/10 text-muted-foreground'
          )}
        >
          {totalProducts}
        </span>
      </button>

      {categories.map((category) => {
        const isSelected = selectedCategoryId === category.id;
        const count = productCountByCategory[category.id] ?? 0;
        const bgGradient = category.color ? CATEGORY_GRADIENTS[category.color] : '';

        return (
          <ContextMenu key={category.id}>
            <ContextMenuTrigger asChild>
              <button
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isSelected
                    ? `bg-gradient-to-r ${bgGradient || 'bg-primary/10'} text-foreground shadow-sm ring-1 ring-primary/20`
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  !category.is_active && 'opacity-50'
                )}
                data-action="select-category"
                data-id={category.id}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full bg-gradient-to-br',
                      category.color || 'from-gray-400 to-gray-600'
                    )}
                  />
                  {category.name}
                  {!category.is_active && (
                    <EyeOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    isSelected
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-muted-foreground/10 text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              {onEditCategory && (
                <ContextMenuItem
                  onClick={() => onEditCategory(category)}
                  data-action="edit-category"
                  data-id={category.id}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </ContextMenuItem>
              )}
              {onToggleCategory && (
                <ContextMenuItem
                  onClick={() => onToggleCategory(category)}
                  data-action="toggle-category"
                  data-id={category.id}
                >
                  {category.is_active ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Schowaj
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Pokaż
                    </>
                  )}
                </ContextMenuItem>
              )}
              {onDeleteCategory && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => onDeleteCategory(category)}
                    disabled={count > 0}
                    className="text-destructive focus:text-destructive"
                    data-action="delete-category"
                    data-id={category.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                    {count > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        ({count} prod.)
                      </span>
                    )}
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      {onAddCategory && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onAddCategory}
          data-action="add-category"
        >
          <Plus className="h-4 w-4" />
          Dodaj kategorie
        </Button>
      )}
    </div>
  );
}
