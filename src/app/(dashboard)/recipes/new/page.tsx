'use client';

import { useRouter } from 'next/navigation';
import { useRecipesStore } from '@/modules/recipes/store';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeForm } from '@/modules/recipes/components/recipe-form';
import { Card, CardContent } from '@/components/ui/card';
import { CreateRecipeInput } from '@/schemas/recipe';
import { toast } from 'sonner';

export default function NewRecipePage() {
  const router = useRouter();
  const { createRecipe, isLoading } = useRecipesStore();

  const handleSubmit = async (data: CreateRecipeInput) => {
    try {
      const recipe = await createRecipe(data);
      toast.success(`Receptura "${recipe.name}" zostala utworzona`);
      router.push(`/recipes/${recipe.id}`);
    } catch {
      toast.error('Nie udalo sie utworzyc receptury');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6" data-page="new-recipe">
      <PageHeader
        title="Nowa receptura"
        description="Dodaj recepture z lista skladnikow (BOM)"
      />

      <Card>
        <CardContent className="pt-6">
          <RecipeForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
