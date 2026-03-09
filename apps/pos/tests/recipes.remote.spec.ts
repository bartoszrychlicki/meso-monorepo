import { test, expect } from '@playwright/test';
import {
  SEEDED_STOCK_ITEMS,
  buildTaggedValue,
  readRunContext,
} from '../playwright/support/run-context';
import { createAdminClient } from '../playwright/support/supabase-admin';
import {
  createRecipeViaUi,
  updateRecipeStockIngredientViaUi,
} from '../playwright/support/ui-helpers';

test('creates nested recipes, versions edits, and recalculates parent recipe cost', async ({
  page,
}) => {
  const admin = createAdminClient();
  const runContext = await readRunContext();
  const semiName = buildTaggedValue(runContext, 'semi-patty');
  const finalName = buildTaggedValue(runContext, 'finished-burger');
  const semiDescription = buildTaggedValue(runContext, 'semi-description');
  const finalDescription = buildTaggedValue(runContext, 'final-description');
  const changeNotes = buildTaggedValue(runContext, 'increase-beef-to-200g');

  const semiRecipeId = await createRecipeViaUi(page, {
    name: semiName,
    category: 'semi_finished',
    yieldQuantity: 1,
    yieldUnit: 'szt',
    prepTime: 5,
    description: semiDescription,
    stockIngredients: [
      { id: SEEDED_STOCK_ITEMS.beef.id, quantity: 150 },
    ],
    instructions: buildTaggedValue(runContext, 'semi-instructions'),
  });

  const { data: semiRecipe, error: semiRecipeError } = await admin
    .from('recipes_recipes')
    .select('*')
    .eq('id', semiRecipeId)
    .maybeSingle();

  expect(semiRecipeError).toBeNull();
  expect(semiRecipe).not.toBeNull();
  expect(semiRecipe?.name).toBe(semiName);
  expect(Number(semiRecipe?.cost_per_unit)).toBeGreaterThan(0);

  const finalRecipeId = await createRecipeViaUi(page, {
    name: finalName,
    category: 'finished_good',
    yieldQuantity: 1,
    prepTime: 12,
    description: finalDescription,
    stockIngredients: [
      { id: SEEDED_STOCK_ITEMS.buns.id, quantity: 1 },
      { id: SEEDED_STOCK_ITEMS.cheddar.id, quantity: 40 },
    ],
    recipeIngredients: [
      { id: semiRecipeId, name: semiName, quantity: 1 },
    ],
    instructions: buildTaggedValue(runContext, 'final-instructions'),
  });

  const { data: finalRecipe, error: finalRecipeError } = await admin
    .from('recipes_recipes')
    .select('*')
    .eq('id', finalRecipeId)
    .maybeSingle();

  expect(finalRecipeError).toBeNull();
  expect(finalRecipe).not.toBeNull();
  expect(finalRecipe?.name).toBe(finalName);
  expect(finalRecipe?.ingredients).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'recipe',
        reference_id: semiRecipeId,
      }),
    ])
  );

  const initialParentCost = Number(finalRecipe?.cost_per_unit);

  await updateRecipeStockIngredientViaUi(page, {
    recipeId: semiRecipeId,
    stockItemId: SEEDED_STOCK_ITEMS.beef.id,
    quantity: 200,
    changeNotes,
  });

  await expect(page.locator('[data-page="recipe-detail"]')).toHaveAttribute(
    'data-id',
    semiRecipeId
  );

  const { data: updatedParentRecipe, error: updatedParentRecipeError } = await admin
    .from('recipes_recipes')
    .select('*')
    .eq('id', finalRecipeId)
    .maybeSingle();

  expect(updatedParentRecipeError).toBeNull();
  expect(Number(updatedParentRecipe?.cost_per_unit)).toBeGreaterThan(initialParentCost);

  const { data: recipeVersions, error: recipeVersionsError } = await admin
    .from('recipes_recipe_versions')
    .select('*')
    .eq('recipe_id', semiRecipeId)
    .order('version', { ascending: false });

  expect(recipeVersionsError).toBeNull();
  expect(recipeVersions?.[0]).toEqual(
    expect.objectContaining({
      change_notes: changeNotes,
      version: 2,
    })
  );
});
