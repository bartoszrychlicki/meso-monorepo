'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Recipe } from '@/types/recipe';
import { recipesRepository } from '@/modules/recipes/repository';
import { useRecipesStore } from '@/modules/recipes/store';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeForm } from '@/modules/recipes/components/recipe-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateRecipeInput } from '@/schemas/recipe';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const { updateRecipe, isLoading: storeLoading } = useRecipesStore();
  const { toast } = useToast();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  useBreadcrumbLabel(params.id as string, recipe?.name);
  const [isLoading, setIsLoading] = useState(true);

  // Change reason dialog state
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [pendingData, setPendingData] = useState<CreateRecipeInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const recipeData = await recipesRepository.recipes.findById(
          params.id as string
        );
        setRecipe(recipeData ?? null);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  // When form submits, store data and show change reason dialog
  const handleFormSubmit = async (data: CreateRecipeInput) => {
    setPendingData(data);
    setChangeNotes('');
    setShowChangeDialog(true);
  };

  // When change reason is confirmed, actually save
  const handleConfirmSave = async () => {
    if (!pendingData || !recipe || !changeNotes.trim()) return;

    setIsSaving(true);
    try {
      await updateRecipe(
        recipe.id,
        pendingData,
        'system', // changedBy - will be replaced with actual user when auth is added
        changeNotes.trim()
      );
      toast({
        title: 'Receptura zaktualizowana',
        description: `"${pendingData.name}" zostala zapisana (v${recipe.version + 1})`,
      });
      setShowChangeDialog(false);
      router.push(`/recipes/${recipe.id}`);
    } catch {
      toast({
        title: 'Blad',
        description: 'Nie udalo sie zaktualizowac receptury',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/recipes/${params.id}`);
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

  return (
    <div className="space-y-6" data-page="edit-recipe" data-id={recipe.id}>
      <PageHeader
        title={`Edytuj: ${recipe.name}`}
        description={`Wersja ${recipe.version} — edycja receptury`}
      />

      <Card>
        <CardContent className="pt-6">
          <RecipeForm
            defaultValues={{
              name: recipe.name,
              description: recipe.description ?? '',
              product_id: recipe.product_id,
              product_category: recipe.product_category,
              ingredients: recipe.ingredients,
              yield_quantity: recipe.yield_quantity,
              yield_unit: recipe.yield_unit,
              preparation_time_minutes: recipe.preparation_time_minutes,
              instructions: recipe.instructions ?? '',
              created_by: recipe.created_by,
            }}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            isLoading={storeLoading || isSaving}
          />
        </CardContent>
      </Card>

      {/* Change reason dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Powod zmiany</DialogTitle>
            <DialogDescription>
              Opisz co zostalo zmienione w recepturze. To pole jest wymagane.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="change-notes">Opis zmian *</Label>
            <Textarea
              id="change-notes"
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="np. Zmieniono ilosc sera z 30g na 40g"
              rows={3}
              data-field="change-notes"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangeDialog(false)}
              disabled={isSaving}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={!changeNotes.trim() || isSaving}
              data-action="confirm-save"
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
