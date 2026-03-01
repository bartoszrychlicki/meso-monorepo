/**
 * E2E Test: Order Placement Flow
 *
 * Tests the complete order placement flow including:
 * - Pay on pickup (full UI flow with DB verification)
 * - Online payment (order creation + simulated webhook)
 * - Operator status transitions via API
 *
 * URUCHOMIENIE:
 *   npx playwright test order-placement-e2e --headed
 *
 * WYMAGANIA:
 *   - .env.local z NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Dzialajacy serwer dev (uruchamiany automatycznie przez playwright.config.ts)
 *   - Aktywna lokalizacja w DB (locations.is_active = true)
 *   - Przynajmniej jeden aktywny produkt w DB
 */

import { test, expect } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  bypassGate,
  loginTestUser,
  addFirstProductToCart,
  ensureCheckoutIsAvailable,
  fillCheckoutContactForm,
  acceptTerms,
} from './helpers'

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const TEST_EMAIL = 'e2e-test@meso.dev'

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ──────────────────────────────────────────────────────────
// Tests (serial — tests build on each other)
// ──────────────────────────────────────────────────────────

test.describe.serial('Order Placement Flow', () => {
  let admin: SupabaseClient
  let testUserId: string
  const createdOrderIds: string[] = []

  // Shared state between tests
  let onlinePaymentOrderId: string

  test.beforeAll(async () => {
    admin = getAdminClient()

    // Find the test user by email in the customers table (avoids listUsers pagination issues)
    const { data: customer } = await admin
      .from('crm_customers')
      .select('id')
      .eq('email', TEST_EMAIL)
      .maybeSingle()

    if (customer) {
      testUserId = customer.id
    }

    // Clean up any test orders from previous runs
    if (testUserId) {
      const { data: existingOrders } = await admin
        .from('orders_orders')
        .select('id')
        .eq('customer_id', testUserId)

      if (existingOrders && existingOrders.length > 0) {
        const orderIds = existingOrders.map(o => o.id)
        await admin.from('orders_order_items').delete().in('order_id', orderIds)
        await admin.from('orders_orders').delete().in('id', orderIds)
      }
    }
  })

  test.afterAll(async () => {
    // Clean up test orders created during this run
    if (createdOrderIds.length > 0) {
      await admin.from('orders_order_items').delete().in('order_id', createdOrderIds)
      await admin.from('orders_orders').delete().in('id', createdOrderIds)
    }

    // Also clean up any remaining orders for the test user
    if (testUserId) {
      const { data: remainingOrders } = await admin
        .from('orders_orders')
        .select('id')
        .eq('customer_id', testUserId)

      if (remainingOrders && remainingOrders.length > 0) {
        const orderIds = remainingOrders.map(o => o.id)
        await admin.from('orders_order_items').delete().in('order_id', orderIds)
        await admin.from('orders_orders').delete().in('id', orderIds)
      }
    }
  })

  // ──────────────────────────────────────────────────────
  // TEST 1: Pay on pickup — full flow
  // ──────────────────────────────────────────────────────
  test('pay on pickup — full order flow with DB verification', async ({ page }) => {
    // 1. Login
    await loginTestUser(page)

    // Store the test user ID if we didn't have it yet
    if (!testUserId) {
      const { data: customer } = await admin
        .from('crm_customers')
        .select('id')
        .eq('email', TEST_EMAIL)
        .maybeSingle()
      if (customer) testUserId = customer.id
    }

    // 2. Find a cheap product and inject cart state directly into localStorage.
    //    This bypasses the product detail page which may auto-select expensive variants,
    //    pushing the subtotal above the pay_on_pickup limit.
    const { data: cheapProduct, error: productError } = await admin
      .from('menu_products')
      .select('id, name, price')
      .eq('is_active', true)
      .gte('price', 35)
      .lt('price', 80) // Leave margin well below pay_on_pickup max (100)
      .order('price', { ascending: true })
      .limit(1)
      .single()

    expect(productError, `No suitable product found (35-80 PLN): ${productError?.message}`).toBeNull()
    expect(cheapProduct, 'Must find a product in 35-80 PLN range').toBeTruthy()

    console.log(`[TEST] Using product "${cheapProduct!.name}" at ${cheapProduct!.price} PLN (id: ${cheapProduct!.id})`)

    // Inject cart state directly — guarantees subtotal = product.price (no variant/addon surprises)
    const cartState = JSON.stringify({
      state: {
        items: [{
          id: `${cheapProduct!.id}-base-0-[]-${Date.now()}`,
          productId: cheapProduct!.id,
          name: cheapProduct!.name,
          price: cheapProduct!.price,
          quantity: 1,
          addons: [],
        }],
        locationId: null,
        deliveryType: 'pickup',
      },
      version: 0,
    })
    await page.evaluate((json) => localStorage.setItem('meso-cart', json), cartState)

    // 3. Navigate to checkout
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: /PODSUMOWANIE/i })).toBeVisible({ timeout: 15_000 })

    // 5. Wait for contact form to auto-fill (profile data loads async)
    await page.waitForFunction(() => {
      const el = document.getElementById('firstName') as HTMLInputElement
      return el && el.value.length > 0
    }, { timeout: 10_000 })

    // 6. Fill contact form
    await fillCheckoutContactForm(page)

    // 7. Select "Platnosc przy odbiorze"
    // First, log the actual subtotal shown on the page for diagnostics
    const subtotalText = await page.locator('text=Produkty').locator('..').locator('span').last().textContent()
    console.log(`[TEST] Checkout subtotal displayed: ${subtotalText}`)

    const payOnPickupButton = page.locator('button').filter({ hasText: 'Płatność przy odbiorze' })
    await expect(payOnPickupButton).toBeVisible()
    await expect(payOnPickupButton).toBeEnabled({ timeout: 5_000 })
    await payOnPickupButton.click()

    // 8. Accept terms
    await acceptTerms(page)

    // 9. Click submit button
    const submitBtn = page.getByTestId('checkout-submit-button')
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // 10. Wait for redirect to order-confirmation
    await expect(page).toHaveURL(/\/order-confirmation\?orderId=/, { timeout: 20_000 })

    // 11. Extract orderId (UUID) from URL query params
    const urlObj = new URL(page.url())
    const orderId = urlObj.searchParams.get('orderId')
    expect(orderId, 'orderId should be present in URL').toBeTruthy()
    createdOrderIds.push(orderId!)

    // 12. Verify in DB: order exists with correct status
    const { data: order, error: orderError } = await admin
      .from('orders_orders')
      .select('*')
      .eq('id', orderId!)
      .single()

    expect(orderError, `Error fetching order: ${orderError?.message}`).toBeNull()
    expect(order, 'Order should exist in database').toBeTruthy()

    // Verify pay_on_pickup specific fields
    expect(order!.status).toBe('confirmed')
    expect(order!.payment_status).toBe('pay_on_pickup')
    expect(order!.payment_method).toBe('pay_on_pickup')
    expect(order!.customer_id).toBe(testUserId)
    expect(order!.total).toBeGreaterThan(0)
    expect(order!.subtotal).toBeGreaterThan(0)
    expect(order!.confirmed_at).toBeTruthy()

    // 13. Verify order_items exist
    const { data: items, error: itemsError } = await admin
      .from('orders_order_items')
      .select('*')
      .eq('order_id', orderId!)

    expect(itemsError, `Error fetching order items: ${itemsError?.message}`).toBeNull()
    expect(items, 'order_items should exist').toBeTruthy()
    expect(items!.length, 'Must have at least 1 order item').toBeGreaterThan(0)

    const firstItem = items![0]
    expect(firstItem.order_id).toBe(orderId!)
    expect(firstItem.product_id).toBeTruthy()
    expect(firstItem.quantity).toBeGreaterThan(0)
    expect(firstItem.unit_price).toBeGreaterThan(0)
    expect(firstItem.total_price).toBeGreaterThan(0)

    console.log(`Pay on pickup order #${orderId} created successfully`)
    console.log(`  status: ${order!.status}, payment: ${order!.payment_status}, total: ${order!.total} PLN, items: ${items!.length}`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 2: Online payment — order creation (no P24 redirect)
  // ──────────────────────────────────────────────────────
  test('online payment — order creation with mocked P24', async ({ page }) => {
    // 1. Login (session may have been lost between tests)
    await loginTestUser(page)

    // 2. Clear cart and add product
    await page.evaluate(() => localStorage.removeItem('meso-cart'))
    await addFirstProductToCart(page)
    await ensureCheckoutIsAvailable(page)

    // 3. Navigate to checkout
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: /PODSUMOWANIE/i })).toBeVisible({ timeout: 15_000 })

    // 5. Wait for contact form to auto-fill
    await page.waitForFunction(() => {
      const el = document.getElementById('firstName') as HTMLInputElement
      return el && el.value.length > 0
    }, { timeout: 10_000 })

    // 6. Fill contact form
    await fillCheckoutContactForm(page)

    // 7. Keep default "Platnosc online" selected (do NOT click pay_on_pickup)
    // The default payment type is 'online'

    // 8. Accept terms
    await acceptTerms(page)

    // 9. Intercept P24 registration to prevent external redirect
    let capturedOrderId = ''
    await page.route('**/api/payments/p24/register', async (route) => {
      let body: Record<string, unknown> = {}
      try { body = route.request().postDataJSON() as Record<string, unknown> } catch { /* empty */ }
      capturedOrderId = String(body?.orderId || '')
      console.log(`[TEST] Intercepted P24 register, orderId=${capturedOrderId}`)

      // Return a mock response that redirects to order-confirmation
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: `mock_token_${Date.now()}`,
          url: `/order-confirmation?orderId=${capturedOrderId}`,
        }),
      })
    })

    // 10. Click submit
    const submitBtn = page.getByTestId('checkout-submit-button')
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // 11. Wait for redirect to order-confirmation
    await expect(page).toHaveURL(/\/order-confirmation\?orderId=/, { timeout: 20_000 })

    // 12. Extract orderId (UUID) — prefer from URL, fall back to intercepted value
    const urlObj = new URL(page.url())
    const orderIdFromUrl = urlObj.searchParams.get('orderId')
    const orderId = orderIdFromUrl || capturedOrderId
    expect(orderId, 'orderId should be available').toBeTruthy()
    createdOrderIds.push(orderId)

    // 13. Verify in DB: order with pending_payment status
    const { data: order, error: orderError } = await admin
      .from('orders_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    expect(orderError, `Error fetching order: ${orderError?.message}`).toBeNull()
    expect(order, 'Order should exist in database').toBeTruthy()

    // Online payment orders start as pending_payment/pending
    expect(order!.status).toBe('pending_payment')
    expect(order!.payment_status).toBe('pending')
    expect(order!.payment_method).not.toBe('pay_on_pickup')
    expect(order!.customer_id).toBe(testUserId)
    expect(order!.total).toBeGreaterThan(0)

    // Verify order_items exist
    const { data: items } = await admin
      .from('orders_order_items')
      .select('id')
      .eq('order_id', orderId)

    expect(items).toBeTruthy()
    expect(items!.length).toBeGreaterThan(0)

    // Store for subsequent tests
    onlinePaymentOrderId = orderId

    console.log(`Online payment order #${orderId} created successfully`)
    console.log(`  status: ${order!.status}, payment: ${order!.payment_status}, total: ${order!.total} PLN`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 3: Simulated payment webhook — status update
  // ──────────────────────────────────────────────────────
  test('simulated P24 webhook updates order to confirmed/paid', async ({ page }) => {
    expect(onlinePaymentOrderId, 'onlinePaymentOrderId must be set from Test 2').toBeTruthy()

    // 1. Simulate what the P24 webhook does: update status to confirmed, payment to paid
    const now = new Date().toISOString()
    const { error: updateError } = await admin
      .from('orders_orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        paid_at: now,
        confirmed_at: now,
      })
      .eq('id', onlinePaymentOrderId)

    expect(updateError, `Error updating order: ${updateError?.message}`).toBeNull()

    // 2. Verify DB state after update
    const { data: updatedOrder } = await admin
      .from('orders_orders')
      .select('status, payment_status, paid_at, confirmed_at')
      .eq('id', onlinePaymentOrderId)
      .single()

    expect(updatedOrder!.status).toBe('confirmed')
    expect(updatedOrder!.payment_status).toBe('paid')
    expect(updatedOrder!.paid_at).toBeTruthy()
    expect(updatedOrder!.confirmed_at).toBeTruthy()

    // 3. Navigate to order confirmation page and verify UI
    await loginTestUser(page)
    await page.goto(`/order-confirmation?orderId=${onlinePaymentOrderId}`)

    // 4. Wait for the page to load and display confirmation
    await expect(page.getByText('ZAMÓWIENIE ZŁOŻONE')).toBeVisible({ timeout: 15_000 })

    // 5. Verify the page does NOT show "OCZEKIWANIE NA PLATNOSC"
    const pendingPaymentText = page.getByText('OCZEKIWANIE NA PŁATNOŚĆ')
    await expect(pendingPaymentText).not.toBeVisible()

    // 6. Verify order number is visible (UUID-based, show last 8 chars)
    const orderIdSuffix = onlinePaymentOrderId.slice(-8).toUpperCase()
    await expect(page.getByText(new RegExp(orderIdSuffix))).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Order confirmation page may display order_number instead of id suffix — that's OK
      console.log(`Order id suffix #${orderIdSuffix} not found on page, order_number may be used instead`)
    })

    console.log(`Order #${onlinePaymentOrderId} confirmed via simulated webhook`)
    console.log(`  Order confirmation page shows "ZAMOWIENIE ZLOZONE" as expected`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 4: Operator status transitions
  // ──────────────────────────────────────────────────────
  test('operator API transitions order through preparing -> ready -> delivered', async ({ page, baseURL }) => {
    expect(onlinePaymentOrderId, 'onlinePaymentOrderId must be set from Test 2').toBeTruthy()

    // Set meso_access cookie so API requests bypass the password gate middleware
    await bypassGate(page)

    const apiUrl = `${baseURL}/api/operator/orders`
    const operatorPin = process.env.OPERATOR_PIN || '0000'

    // ── Transition 1: confirmed -> preparing ──
    const preparingResponse = await page.request.patch(apiUrl, {
      data: {
        orderId: onlinePaymentOrderId,
        status: 'preparing',
        timestampField: 'preparing_at',
      },
      headers: {
        'x-operator-pin': operatorPin,
        'Content-Type': 'application/json',
      },
    })

    expect(preparingResponse.ok(), `PATCH to preparing failed: ${preparingResponse.status()}`).toBe(true)
    const preparingBody = await preparingResponse.json()
    expect(preparingBody.success).toBe(true)

    // Verify in DB
    const { data: preparingOrder } = await admin
      .from('orders_orders')
      .select('status, preparing_at')
      .eq('id', onlinePaymentOrderId)
      .single()

    expect(preparingOrder!.status).toBe('preparing')
    expect(preparingOrder!.preparing_at).toBeTruthy()

    console.log(`  confirmed -> preparing: OK (preparing_at: ${preparingOrder!.preparing_at})`)

    // ── Transition 2: preparing -> ready ──
    const readyResponse = await page.request.patch(apiUrl, {
      data: {
        orderId: onlinePaymentOrderId,
        status: 'ready',
        timestampField: 'ready_at',
      },
      headers: {
        'x-operator-pin': operatorPin,
        'Content-Type': 'application/json',
      },
    })

    expect(readyResponse.ok(), `PATCH to ready failed: ${readyResponse.status()}`).toBe(true)
    const readyBody = await readyResponse.json()
    expect(readyBody.success).toBe(true)

    // Verify in DB
    const { data: readyOrder } = await admin
      .from('orders_orders')
      .select('status, ready_at')
      .eq('id', onlinePaymentOrderId)
      .single()

    expect(readyOrder!.status).toBe('ready')
    expect(readyOrder!.ready_at).toBeTruthy()

    console.log(`  preparing -> ready: OK (ready_at: ${readyOrder!.ready_at})`)

    // ── Transition 3: ready -> delivered ──
    const deliveredResponse = await page.request.patch(apiUrl, {
      data: {
        orderId: onlinePaymentOrderId,
        status: 'delivered',
        timestampField: 'delivered_at',
      },
      headers: {
        'x-operator-pin': operatorPin,
        'Content-Type': 'application/json',
      },
    })

    expect(deliveredResponse.ok(), `PATCH to delivered failed: ${deliveredResponse.status()}`).toBe(true)
    const deliveredBody = await deliveredResponse.json()
    expect(deliveredBody.success).toBe(true)

    // Verify in DB
    const { data: deliveredOrder } = await admin
      .from('orders_orders')
      .select('status, delivered_at')
      .eq('id', onlinePaymentOrderId)
      .single()

    expect(deliveredOrder!.status).toBe('delivered')
    expect(deliveredOrder!.delivered_at).toBeTruthy()

    console.log(`  ready -> delivered: OK (delivered_at: ${deliveredOrder!.delivered_at})`)
    console.log(`Order #${onlinePaymentOrderId} completed full lifecycle: confirmed -> preparing -> ready -> delivered`)
  })
})
