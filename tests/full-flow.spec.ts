import { test, expect } from '@playwright/test'
import {
  loginTestUser,
  addFirstProductToCart,
  ensureCheckoutIsAvailable,
  fillCheckoutContactForm,
} from './helpers'

test.describe('Full User Journey', () => {
  test('Complete flow: Menu -> Cart -> Checkout (ready to submit)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Checkout flow covered on desktop to reduce mobile flakiness')

    // Login required for checkout access
    await loginTestUser(page)

    await addFirstProductToCart(page)
    await ensureCheckoutIsAvailable(page)

    await page.goto('/cart')
    const checkoutLink = page.getByTestId('cart-checkout-link')
    await expect(checkoutLink).toHaveAttribute('href', '/checkout')
    await checkoutLink.click()

    await expect(page).toHaveURL(/\/checkout/)
    await fillCheckoutContactForm(page)

    const submitButton = page.getByTestId('checkout-submit-button')
    await expect(submitButton).toBeVisible()

    // Submit button is always enabled (terms check happens in click handler)
    // Clicking without terms accepted should show error toast
    await submitButton.click()
    await expect(page.getByText(/Musisz zaakceptować Regulamin/).first()).toBeVisible({ timeout: 5_000 })

    // Accept terms and verify the button still works (styled differently)
    const termsCheckbox = page.getByTestId('terms-acceptance')
    await termsCheckbox.click()
    await expect(submitButton).toBeEnabled()
  })
})
