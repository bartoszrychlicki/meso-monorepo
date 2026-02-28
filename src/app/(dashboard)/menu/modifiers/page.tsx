'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useModifiers } from '@/modules/menu/hooks';
import { useRecipesStore } from '@/modules/recipes/store';
import { ModifierManagement } from '@/modules/menu/components/modifier-management';

export default function ModifiersPage() {
  const { modifiers, isLoading, createModifier, updateModifier, deleteModifier } = useModifiers();
  const recipes = useRecipesStore((s) => s.recipes);
  const loadRecipes = useRecipesStore((s) => s.loadRecipes);

  useEffect(() => {
    if (recipes.length === 0) loadRecipes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6" data-page="modifiers">
      <PageHeader title="Modyfikatory" description="Zarzadzaj modyfikatorami produktow" />
      <ModifierManagement
        modifiers={modifiers}
        recipes={recipes}
        isLoading={isLoading}
        onCreateModifier={createModifier}
        onUpdateModifier={updateModifier}
        onDeleteModifier={deleteModifier}
      />
    </div>
  );
}
