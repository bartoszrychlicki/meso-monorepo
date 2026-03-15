'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useMenu, useModifiers } from '@/modules/menu/hooks';
import { useInventoryStore } from '@/modules/inventory/store';
import { useRecipesStore } from '@/modules/recipes/store';
import { ProductForm } from '@/modules/menu/components/product-form';
import { ProductWriteInput } from '@/types/menu';
import { setProductModifierGroups } from '@/modules/menu/repository';
import { toast } from 'sonner';

export default function NewProductPage() {
  const router = useRouter();
  const { categories, modifierGroups, createProduct } = useMenu();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (data: ProductWriteInput, modifierGroupIds: string[]) => {
    setIsSubmitting(true);
    try {
      const newProduct = await createProduct(data);
      if (modifierGroupIds.length > 0) {
        await setProductModifierGroups(newProduct.id, modifierGroupIds);
      }
      toast.success('Produkt zostal dodany');
      router.push('/menu');
    } catch (error) {
      toast.error('Blad podczas dodawania produktu');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-page="menu-new">
      <PageHeader
        title="Nowy produkt"
        description="Dodaj nowy produkt do menu"
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/menu')}
            data-action="back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrot
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl">
        <ProductForm
          categories={categories}
          stockItems={stockItems}
          recipes={recipes}
          allModifierGroups={modifierGroups}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/menu')}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
