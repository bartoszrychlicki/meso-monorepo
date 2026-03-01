import { test, expect } from '@playwright/test';
import { addFirstProductToCart, gotoMenu } from './helpers';

test.describe('Menu and Cart', () => {
  test('Should display menu items', async ({ page }) => {
    await gotoMenu(page);
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  });

  test('Should add item to cart from product details', async ({ page }) => {
    await addFirstProductToCart(page);

    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /TWÓJ KOSZYK/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Koszyk jest pusty/i })).toHaveCount(0);
    await expect(page.getByText('Razem', { exact: true })).toBeVisible();
    await expect(page.getByTestId('cart-checkout-link')).toBeVisible();
  });
});
