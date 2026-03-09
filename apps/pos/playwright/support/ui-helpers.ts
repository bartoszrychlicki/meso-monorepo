import { expect, type Locator, type Page } from '@playwright/test';

export async function selectRadixOption(
  page: Page,
  trigger: Locator,
  optionText: string | RegExp
): Promise<void> {
  await trigger.click();
  await page.getByRole('option', { name: optionText }).click();
}

export async function createRecipeViaUi(
  page: Page,
  options: {
    name: string;
    category: 'semi_finished' | 'finished_good';
    yieldQuantity: number;
    yieldUnit?: 'szt' | 'kg';
    prepTime: number;
    description?: string;
    stockIngredients?: Array<{ id: string; quantity: number }>;
    recipeIngredients?: Array<{ id?: string; name: string; quantity: number }>;
    instructions?: string;
  }
): Promise<string> {
  await page.goto('/recipes/new');
  await expect(page.locator('[data-component="recipe-form"]')).toBeVisible();

  await page.locator('[data-field="recipe-name"]').fill(options.name);

  if (options.description) {
    await page.locator('[data-field="recipe-description"]').fill(options.description);
  }

  await selectRadixOption(
    page,
    page.locator('[data-field="product-category"]'),
    options.category === 'semi_finished' ? 'Półprodukt' : 'Produkt finalny'
  );

  await page.locator('[data-field="yield-quantity"]').fill(String(options.yieldQuantity));

  if (options.category === 'semi_finished' && options.yieldUnit) {
    await selectRadixOption(
      page,
      page.locator('[data-field="yield-unit"]'),
      options.yieldUnit
    );
  }

  await page.locator('[data-field="prep-time"]').fill(String(options.prepTime));

  for (const ingredient of options.stockIngredients ?? []) {
    await page.locator(`[data-action="toggle-ingredient-${ingredient.id}"]`).first().click();
    await page.locator(`[data-field="quantity-${ingredient.id}"]`).fill(String(ingredient.quantity));
  }

  if ((options.recipeIngredients ?? []).length > 0) {
    await page.locator('[data-action="tab-recipes"]').click();

    for (const ingredient of options.recipeIngredients ?? []) {
      await page
        .locator('div.cursor-pointer')
        .filter({ hasText: ingredient.name })
        .first()
        .click();

      const selectedRow = ingredient.id
        ? page.locator(`[data-ingredient-id="${ingredient.id}"]`)
        : page.locator('[data-ingredient-id]').filter({ hasText: ingredient.name }).first();

      await expect(selectedRow).toBeVisible();
      await selectedRow.getByRole('textbox').fill(String(ingredient.quantity));
    }
  }

  if (options.instructions) {
    await page.locator('[data-field="instructions"]').fill(options.instructions);
  }

  await page.locator('[data-action="save-recipe"]').click();
  await page.waitForURL(/\/recipes\/[0-9a-f-]+$/);

  const url = new URL(page.url());
  return url.pathname.split('/').pop()!;
}

export async function updateRecipeStockIngredientViaUi(
  page: Page,
  options: {
    recipeId: string;
    stockItemId: string;
    quantity: number;
    changeNotes: string;
  }
): Promise<void> {
  await page.goto(`/recipes/${options.recipeId}/edit`);
  await expect(page.locator('[data-page="edit-recipe"]')).toBeVisible();
  await page
    .locator(`[data-field="quantity-${options.stockItemId}"]`)
    .fill(String(options.quantity));
  await page.locator('[data-action="save-recipe"]').click();
  await expect(page.locator('[data-field="change-notes"]')).toBeVisible();
  await page.locator('[data-field="change-notes"]').fill(options.changeNotes);
  await page.locator('[data-action="confirm-save"]').click();
  await page.waitForURL(new RegExp(`/recipes/${options.recipeId}$`));
}

export async function createStockItemViaUi(
  page: Page,
  options: {
    name: string;
    sku: string;
    unit: 'kg' | 'szt' | 'g' | 'ml';
    costPerUnit: number;
    purchaseUnitWeightKg?: number;
    warehouseName: string;
    quantity: number;
    minQuantity: number;
    storageLocation: string;
  }
): Promise<void> {
  await page.goto('/inventory');
  await expect(page.locator('[data-page="inventory"]')).toBeVisible();

  await page.locator('[data-action="add-stock-item"]').click();
  await expect(page.locator('[data-component="stock-item-form"]')).toBeVisible();

  await page.locator('[data-field="name"]').fill(options.name);
  await page.locator('[data-field="sku"]').fill(options.sku);
  await selectRadixOption(page, page.locator('[data-field="unit"]'), options.unit);
  await page.locator('[data-field="cost-per-unit"]').fill(String(options.costPerUnit));

  if (options.purchaseUnitWeightKg != null) {
    await page
      .locator('[data-field="purchase-unit-weight-kg"]')
      .fill(String(options.purchaseUnitWeightKg));
  }

  await selectRadixOption(
    page,
    page.locator('[data-field="warehouse"]'),
    options.warehouseName
  );
  await page.locator('[data-field="quantity"]').fill(String(options.quantity));
  await page.locator('[data-field="min-quantity"]').fill(String(options.minQuantity));
  await page.locator('[data-field="storage-location"]').fill(options.storageLocation);
  await page.locator('[data-action="confirm-create"]').click();
  await expect(page.locator('[data-component="stock-item-form"]')).toBeHidden();
}

export async function createMenuProductViaUi(
  page: Page,
  options: {
    name: string;
    categoryName: string;
    price: number;
    recipeName: string;
    description?: string;
  }
): Promise<void> {
  await page.goto('/menu/new');
  await expect(page.locator('[data-component="product-form"]')).toBeVisible();

  await page.locator('[data-field="product-name"]').fill(options.name);
  await selectRadixOption(
    page,
    page.locator('[data-field="product-category"]'),
    options.categoryName
  );
  await page.locator('[data-field="product-price"]').fill(String(options.price));

  if (options.description) {
    await page.locator('[data-field="product-description"]').fill(options.description);
  }

  await selectRadixOption(
    page,
    page.locator('[data-field="recipe-id"]'),
    new RegExp(options.recipeName)
  );

  await page.locator('[data-action="submit-product"]').click();
}
