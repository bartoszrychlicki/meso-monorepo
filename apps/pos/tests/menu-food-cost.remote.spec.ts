import { test, expect } from '@playwright/test';
import {
  SEEDED_STOCK_ITEMS,
  buildTaggedValue,
  readRunContext,
} from '../playwright/support/run-context';
import { createAdminClient } from '../playwright/support/supabase-admin';
import {
  createMenuProductViaUi,
  createRecipeViaUi,
  updateRecipeStockIngredientViaUi,
} from '../playwright/support/ui-helpers';

function toFoodCostSnapshot(costPerUnit: number, price: number): number {
  return Math.round(((costPerUnit / price) * 100) * 100) / 100;
}

test('persists and refreshes menu food cost snapshots after nested recipe changes', async ({
  page,
}) => {
  const admin = createAdminClient();
  const runContext = await readRunContext();
  const semiName = buildTaggedValue(runContext, 'menu-semi-patty');
  const finalName = buildTaggedValue(runContext, 'menu-final-burger');
  const productName = buildTaggedValue(runContext, 'menu-product');
  const productPrice = 10000;
  const changeNotes = buildTaggedValue(runContext, 'menu-beef-update');

  const { data: firstMenuCategory, error: firstMenuCategoryError } = await admin
    .from('menu_categories')
    .select('id, name')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  expect(firstMenuCategoryError).toBeNull();
  expect(firstMenuCategory).not.toBeNull();

  const semiRecipeId = await createRecipeViaUi(page, {
    name: semiName,
    category: 'semi_finished',
    yieldQuantity: 1,
    yieldUnit: 'szt',
    prepTime: 5,
    description: buildTaggedValue(runContext, 'menu-semi-description'),
    stockIngredients: [
      { id: SEEDED_STOCK_ITEMS.beef.id, quantity: 150 },
    ],
  });

  const finalRecipeId = await createRecipeViaUi(page, {
    name: finalName,
    category: 'finished_good',
    yieldQuantity: 1,
    prepTime: 10,
    description: buildTaggedValue(runContext, 'menu-final-description'),
    stockIngredients: [
      { id: SEEDED_STOCK_ITEMS.buns.id, quantity: 1 },
      { id: SEEDED_STOCK_ITEMS.cheddar.id, quantity: 40 },
    ],
    recipeIngredients: [
      { id: semiRecipeId, name: semiName, quantity: 1 },
    ],
  });

  const { data: finalRecipeBeforeProduct, error: finalRecipeBeforeProductError } = await admin
    .from('recipes_recipes')
    .select('*')
    .eq('id', finalRecipeId)
    .maybeSingle();

  expect(finalRecipeBeforeProductError).toBeNull();
  expect(finalRecipeBeforeProduct).not.toBeNull();

  await createMenuProductViaUi(page, {
    name: productName,
    categoryName: firstMenuCategory!.name,
    price: productPrice,
    recipeName: finalName,
    description: buildTaggedValue(runContext, 'menu-product-description'),
  });

  await expect
    .poll(async () => {
      const { data, error } = await admin
        .from('menu_products')
        .select('id')
        .eq('name', productName)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data?.id ?? null;
    })
    .not.toBeNull();

  await page.goto('/menu');
  await page.locator('[data-field="search"]').fill(productName);
  const productCard = page.locator('[data-component="product-card"]').filter({
    hasText: productName,
  });
  await expect(productCard).toHaveCount(1);

  const expectedInitialSnapshot = toFoodCostSnapshot(
    Number(finalRecipeBeforeProduct?.cost_per_unit),
    productPrice
  );

  await expect(productCard.locator('[data-field="food-cost"]')).toContainText(
    `FC ${expectedInitialSnapshot.toFixed(0)}%`
  );

  const { data: menuProductBeforeUpdate, error: menuProductBeforeUpdateError } = await admin
    .from('menu_products')
    .select('*')
    .eq('name', productName)
    .maybeSingle();

  expect(menuProductBeforeUpdateError).toBeNull();
  expect(menuProductBeforeUpdate).not.toBeNull();
  expect(menuProductBeforeUpdate?.recipe_id).toBe(finalRecipeId);
  expect(Number(menuProductBeforeUpdate?.food_cost_percentage)).toBeCloseTo(
    expectedInitialSnapshot,
    2
  );

  await updateRecipeStockIngredientViaUi(page, {
    recipeId: semiRecipeId,
    stockItemId: SEEDED_STOCK_ITEMS.beef.id,
    quantity: 220,
    changeNotes,
  });

  const { data: finalRecipeAfterUpdate, error: finalRecipeAfterUpdateError } = await admin
    .from('recipes_recipes')
    .select('*')
    .eq('id', finalRecipeId)
    .maybeSingle();

  expect(finalRecipeAfterUpdateError).toBeNull();
  expect(finalRecipeAfterUpdate).not.toBeNull();

  const expectedUpdatedSnapshot = toFoodCostSnapshot(
    Number(finalRecipeAfterUpdate?.cost_per_unit),
    productPrice
  );

  await page.goto('/menu');
  await page.locator('[data-field="search"]').fill(productName);

  const updatedCard = page.locator('[data-component="product-card"]').filter({
    hasText: productName,
  });
  await expect(updatedCard.locator('[data-field="food-cost"]')).toContainText(
    `FC ${expectedUpdatedSnapshot.toFixed(0)}%`
  );

  const { data: menuProductAfterUpdate, error: menuProductAfterUpdateError } = await admin
    .from('menu_products')
    .select('*')
    .eq('name', productName)
    .maybeSingle();

  expect(menuProductAfterUpdateError).toBeNull();
  expect(menuProductAfterUpdate).not.toBeNull();
  expect(Number(menuProductAfterUpdate?.food_cost_percentage)).toBeCloseTo(
    expectedUpdatedSnapshot,
    2
  );
  expect(Number(menuProductAfterUpdate?.food_cost_percentage)).toBeGreaterThan(
    Number(menuProductBeforeUpdate?.food_cost_percentage)
  );
});
