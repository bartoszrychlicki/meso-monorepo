/**
 * Sandbox Smoke Tests (~30s)
 *
 * Fast, non-destructive checks against live environment.
 * Designed to fail fast before the heavier P24 flow runs.
 */
import { test, expect } from '@playwright/test'
import {
  SANDBOX_CONFIG,
  getAdminClient,
  setGateCookie,
} from './sandbox-helpers'

test.describe('Sandbox Smoke', () => {
  test('delivery app loads and menu has products', async ({ page }) => {
    test.setTimeout(30_000)
    await setGateCookie(page, SANDBOX_CONFIG.deliveryBaseUrl)
    await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/menu`, { timeout: 20_000 })
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({ timeout: 15_000 })
  })

  test('product detail page renders', async ({ page }) => {
    test.setTimeout(30_000)
    const admin = getAdminClient()
    const { data: product } = await admin
      .from('menu_products')
      .select('id')
      .eq('is_active', true)
      .eq('is_available', true)
      .limit(1)
      .single()

    expect(product).toBeTruthy()

    await setGateCookie(page, SANDBOX_CONFIG.deliveryBaseUrl)
    await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/product/${product!.id}`, { timeout: 20_000 })
    const addToCart = page.getByTestId('product-detail-add-to-cart')
    await expect(addToCart).toBeVisible({ timeout: 15_000 })
  })

  test('POS KDS page loads', async ({ page }) => {
    test.setTimeout(30_000)
    await setGateCookie(page, SANDBOX_CONFIG.posBaseUrl)
    await page.goto(`${SANDBOX_CONFIG.posBaseUrl}/kitchen`, { timeout: 20_000 })
    await expect(page.locator('[data-component="kds-board"]')).toBeVisible({ timeout: 15_000 })
  })

  test('POS API health check', async () => {
    test.setTimeout(15_000)
    const apiKey = SANDBOX_CONFIG.posApiKey
    test.skip(!apiKey, 'POS_API_KEY not set')

    const response = await fetch(`${SANDBOX_CONFIG.posApiBaseUrl}/orders?limit=1`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    })
    expect(response.status).toBe(200)
  })
})
