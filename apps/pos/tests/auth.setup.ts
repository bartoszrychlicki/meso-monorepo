import { test, expect } from '@playwright/test';
import {
  STORAGE_STATE_PATH,
  readRunContext,
} from '../playwright/support/run-context';

test('authenticates the remote staff user once and saves storage state', async ({ page }) => {
  const runContext = await readRunContext();

  await page.goto('/login');
  await expect(page.locator('[data-component="login-form"]')).toBeVisible();

  await page.locator('[data-field="email"]').fill(runContext.email);
  await page.locator('[data-field="password"]').fill(runContext.password);
  await page.locator('[data-action="login-email"]').click();

  await page.waitForURL(/\/dashboard$/);
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
