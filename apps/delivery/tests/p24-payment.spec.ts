import { test, expect } from '@playwright/test'
import {
  loginTestUser,
  addFirstProductToCart,
  ensureCheckoutIsAvailable,
  fillCheckoutContactForm,
  acceptTerms,
} from './helpers'

test.describe('P24 Payment Flow (Mocked)', () => {
  test('Full flow: Menu -> Checkout -> Mock Payment Redirect -> Confirmation', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Payment flow covered on desktop to reduce mobile flakiness')

    // Login required for checkout access
    await loginTestUser(page)

    await addFirstProductToCart(page)
    await ensureCheckoutIsAvailable(page)

    await page.goto('/cart')
    await page.getByTestId('cart-checkout-link').click()
    await expect(page).toHaveURL(/\/checkout/)

    await fillCheckoutContactForm(page)
    await acceptTerms(page)

    await page.route('**/api/payments/p24/register', async (route) => {
      const payload = route.request().postDataJSON() as { orderId: string | number }

      await route.fulfill({
        json: {
          token: `mock_token_${Date.now()}`,
          url: `/order-confirmation?orderId=${payload.orderId}&status=success`,
        },
      })
    })

    const submitButton = page.getByTestId('checkout-submit-button')

    // Click submit — single click may complete the entire flow
    // (form auto-submits via requestSubmit, then order is created)
    await submitButton.click()

    // If still on checkout after first click, click again
    const redirected = await page.waitForURL(/\/order-confirmation\?orderId=/, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false)

    if (!redirected) {
      await submitButton.click()
    }

    await expect(page).toHaveURL(/\/order-confirmation\?orderId=.*status=success/, { timeout: 20_000 })
    // Page shows either "ZAMÓWIENIE ZŁOŻONE" (paid) or "OCZEKIWANIE NA PŁATNOŚĆ" (pending)
    // depending on whether the webhook has already updated the status
    await expect(
      page.getByText('ZAMÓWIENIE ZŁOŻONE').or(page.getByText('OCZEKIWANIE NA PŁATNOŚĆ'))
    ).toBeVisible({ timeout: 10_000 })
    // Order confirmation shows order_number with WEB- prefix
    await expect(page.getByText(/Zamówienie #WEB-/)).toBeVisible()
  })
})
