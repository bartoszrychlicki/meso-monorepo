'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Settings2 } from 'lucide-react';
import { useMenu, useModifiers } from '@/modules/menu/hooks';
import { useInventoryStore } from '@/modules/inventory/store';
import { useRecipesStore } from '@/modules/recipes/store';
import { CategoryList } from '@/modules/menu/components/category-list';
import { CategoryFormDialog } from '@/modules/menu/components/category-form-dialog';
import { MenuGrid } from '@/modules/menu/components/menu-grid';
import { ModifierManagement } from '@/modules/menu/components/modifier-management';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Category } from '@/types/menu';
import { toast } from 'sonner';

export default function MenuPage() {
  const router = useRouter();
  const {
    products,
    allProducts,
    categories,
    selectedCategoryId,
    searchQuery,
    isLoading,
    setSelectedCategory,
    setSearchQuery,
    toggleProductAvailability,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useMenu();

  const { modifiers, isLoading: modifiersLoading, createModifier, updateModifier, deleteModifier } = useModifiers();

  const stockItems = useInventoryStore((s) => s.stockItems);
  const loadStockItems = useInventoryStore((s) => s.loadStockItems);
  const recipes = useRecipesStore((s) => s.recipes);
  const loadRecipes = useRecipesStore((s) => s.loadRecipes);

  useEffect(() => {
    if (stockItems.length === 0) {
      loadStockItems();
    }
    if (recipes.length === 0) {
      loadRecipes();
    }
  }, [loadRecipes, loadStockItems, recipes.length, stockItems.length]);

  // Modifier sheet state
  const [modifierSheetOpen, setModifierSheetOpen] = useState(false);

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of allProducts) {
      counts[product.category_id] = (counts[product.category_id] ?? 0) + 1;
    }
    return counts;
  }, [allProducts]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data);
      toast.success('Kategoria zaktualizowana');
    } else {
      await createCategory(data);
      toast.success('Kategoria dodana');
    }
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteCategoryConfirm(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      toast.success('Kategoria usunieta');
    } catch {
      toast.error('Nie udalo sie usunac kategorii');
    }
    setDeleteCategoryConfirm(false);
    setCategoryToDelete(null);
  };

  const handleToggleCategory = async (category: Category) => {
    await updateCategory(category.id, { is_active: !category.is_active });
    toast.success(category.is_active ? 'Kategoria schowana' : 'Kategoria widoczna');
  };

  return (
    <div className="space-y-6" data-page="menu">
      <PageHeader
        title="Menu"
        description="Zarzadzaj produktami i kategoriami"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setModifierSheetOpen(true)}
              data-action="open-modifiers"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Modyfikatory
            </Button>
            <Button
              onClick={() => router.push('/menu/new')}
              data-action="new-product"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nowy produkt
            </Button>
          </div>
        }
      />

      <div className="flex gap-6">
        {/* Sidebar with categories */}
        <div className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-4">
            <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kategorie
            </h3>
            <CategoryList
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategory}
              productCountByCategory={productCountByCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onToggleCategory={handleToggleCategory}
              onAddCategory={handleAddCategory}
            />
          </div>
        </div>

        {/* Main grid */}
        <div className="flex-1 min-w-0">
          <MenuGrid
            products={products}
            categories={categories}
            stockItems={stockItems}
            recipes={recipes}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onToggleAvailability={toggleProductAvailability}
            onProductClick={(id) => router.push(`/menu/${id}`)}
            isLoading={isLoading}
          />
        </div>
      </div>

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        existingCount={categories.length}
      />

      <ConfirmDialog
        open={deleteCategoryConfirm}
        onOpenChange={setDeleteCategoryConfirm}
        title="Usun kategorie"
        description={`Czy na pewno chcesz usunac kategorie "${categoryToDelete?.name}"?`}
        confirmLabel="Usun"
        onConfirm={confirmDeleteCategory}
        variant="destructive"
      />

      <Sheet open={modifierSheetOpen} onOpenChange={setModifierSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Modyfikatory</SheetTitle>
          </SheetHeader>
          <ModifierManagement
            modifiers={modifiers}
            recipes={recipes}
            isLoading={modifiersLoading}
            onCreateModifier={createModifier}
            onUpdateModifier={updateModifier}
            onDeleteModifier={deleteModifier}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
