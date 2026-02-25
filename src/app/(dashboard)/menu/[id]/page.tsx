'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useProduct } from '@/modules/menu/hooks';
import { useMenuStore } from '@/modules/menu/store';
import { useInventoryStore } from '@/modules/inventory/store';
import { useRecipesStore } from '@/modules/recipes/store';
import { ProductForm } from '@/modules/menu/components/product-form';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Product } from '@/types/menu';
import { toast } from 'sonner';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { product, isLoading } = useProduct(productId);
  const categories = useMenuStore((s) => s.categories);
  const updateProduct = useMenuStore((s) => s.updateProduct);
  const deleteProduct = useMenuStore((s) => s.deleteProduct);
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
  }, []);

  const handleSubmit = async (data: Omit<Product, 'created_at' | 'updated_at'>) => {
    setIsSubmitting(true);
    try {
      await updateProduct(productId, data);
      toast.success('Produkt zostal zaktualizowany');
      router.push('/menu');
    } catch (error) {
      toast.error('Blad podczas aktualizacji produktu');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunac ten produkt?')) return;
    try {
      await deleteProduct(productId);
      toast.success('Produkt zostal usuniety');
      router.push('/menu');
    } catch (error) {
      toast.error('Blad podczas usuwania produktu');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="menu-edit">
        <LoadingSkeleton variant="form" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6" data-page="menu-edit">
        <PageHeader title="Produkt nie znaleziony" />
        <EmptyState
          title="Nie znaleziono produktu"
          description="Produkt o podanym ID nie istnieje"
          action={
            <Button variant="outline" onClick={() => router.push('/menu')}>
              Powrot do menu
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="menu-edit">
      <PageHeader
        title={product.name}
        description="Edytuj szczegoly produktu"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/menu')}
              data-action="back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrot
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              data-action="delete-product"
              data-id={productId}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usun
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl">
        <ProductForm
          product={product}
          categories={categories}
          stockItems={stockItems}
          recipes={recipes}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/menu')}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
