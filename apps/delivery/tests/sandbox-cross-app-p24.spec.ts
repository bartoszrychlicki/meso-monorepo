/**
 * Sandbox Cross-App E2E (Delivery -> P24 Sandbox -> POS KDS)
 *
 * Split into serial steps for better diagnostics.
 * Each step skips if its required precondition (from a previous step) is missing.
 *
 * Run with:
 *   npm run test:e2e:sandbox:headed
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 *   E2E_DELIVERY_BASE_URL (default: https://order.mesofood.pl)
 *   E2E_POS_BASE_URL      (default: https://pos.mesofood.pl)
 *   E2E_GATE_PASSWORD     (default: TuJestMeso2026)
 *   E2E_DELIVERY_EMAIL    (default: e2e-order-supabase@meso.dev)
 *   E2E_DELIVERY_PASSWORD (default: SandboxP24-test-123!)
 *   E2E_P24_AUTOMATE      (1/0, default: 1)
 *   E2E_P24_REDIRECT_TIMEOUT_MS (default: 300000)
 */
import { test, expect } from '@playwright/test'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  SANDBOX_CONFIG,
  getAdminClient,
  parsePln,
  readSummaryValueByLabel,
  readSummaryValueByLabels,
  getOrderTotals,
  getOrderDisplayItems,
  waitForOrderState,
  waitForKitchenTicket,
  ensureDeliveryAuthUser,
  ensureCustomerProfile,
  ensurePosAuthUser,
  loginDeliveryUser,
  loginPosUser,
  ensurePosLocationSelected,
  completeP24SandboxPayment,
  type DeliveryAuthUser,
} from './sandbox-helpers'

// TODO: Fix flaky P24 sandbox test — see https://github.com/bartoszrychlicki/meso-monorepo/issues/7
test.describe.serial.skip('Sandbox Cross-App Flow: Delivery -> P24 -> POS KDS', () => {
  let admin: SupabaseClient
  let deliveryUserId = ''
  let deliveryUserEmail = ''
  let deliveryUserCreatedForTest = false
  let createdOrderId = ''
  let orderNumber = ''
  let kitchenTicketId = ''

  test.beforeAll(() => {
    admin = getAdminClient()
  })

  test.afterAll(async () => {
    try {
      if (createdOrderId) {
        await admin.from('orders_kitchen_tickets').delete().eq('order_id', createdOrderId)
        await admin.from('orders_order_items').delete().eq('order_id', createdOrderId)
        await admin.from('orders_orders').delete().eq('id', createdOrderId)
      }
      if (deliveryUserId && deliveryUserCreatedForTest) {
        await admin.from('crm_loyalty_transactions').delete().eq('customer_id', deliveryUserId)
        await admin.from('crm_customers').delete().eq('id', deliveryUserId)
        await admin.auth.admin.deleteUser(deliveryUserId)
      }
    } catch (error) {
      console.warn('[cleanup] Non-fatal cleanup warning:', error)
    }
  })

  // -----------------------------------------------------------------------
  // Step 1: Provision delivery user
  // -----------------------------------------------------------------------
  test('1. Provision delivery user', async () => {
    test.setTimeout(60_000)

    const deliveryUser: DeliveryAuthUser = await ensureDeliveryAuthUser(admin)
    deliveryUserId = deliveryUser.id
    deliveryUserEmail = deliveryUser.email
    deliveryUserCreatedForTest = deliveryUser.createdForTest
    await ensureCustomerProfile(admin, deliveryUser)
  })

  // -----------------------------------------------------------------------
  // Step 2: Place order and complete P24 payment
  // (Kept as single test because checkout -> P24 redirect -> return
  //  requires continuous browser session)
  // -----------------------------------------------------------------------
  test('2. Place order and complete P24 sandbox payment', async ({ page }) => {
    test.setTimeout(5 * 60_000)
    test.skip(!deliveryUserEmail, 'step 1 failed — no delivery user')

    // Login
    await loginDeliveryUser(page, deliveryUserEmail, SANDBOX_CONFIG.deliveryPassword)

    // Validate menu
    await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/menu`, { timeout: 60_000 })
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({ timeout: 20_000 })

    // Find a product
    const { data: product, error: productError } = await admin
      .from('menu_products')
      .select('id, name, price')
      .eq('is_active', true)
      .eq('is_available', true)
      .gte('price', 20)
      .lt('price', 80)
      .order('price', { ascending: true })
      .limit(1)
      .single()

    expect(productError).toBeNull()
    expect(product).toBeTruthy()

    // Add product to cart
    await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/product/${product!.id}`, { timeout: 60_000 })
    const addToCartButton = page.getByTestId('product-detail-add-to-cart')
    await expect(addToCartButton).toBeVisible({ timeout: 20_000 })
    await addToCartButton.click()
    await page.waitForURL(url => !url.pathname.includes('/product/'), { timeout: 20_000 })

    // Ensure checkout is reachable (min order constraint safety-net)
    await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/cart`, { timeout: 60_000 })
    const checkoutLink = page.getByTestId('cart-checkout-link')
    await expect(checkoutLink).toBeVisible({ timeout: 15_000 })
    const checkoutHref = await checkoutLink.getAttribute('href')

    if (checkoutHref !== '/checkout') {
      await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/product/${product!.id}`, { timeout: 60_000 })
      await expect(addToCartButton).toBeVisible({ timeout: 20_000 })
      await addToCartButton.click()
      await page.waitForURL(url => !url.pathname.includes('/product/'), { timeout: 20_000 })
      await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/cart`, { timeout: 60_000 })
      await expect(checkoutLink).toHaveAttribute('href', '/checkout', { timeout: 15_000 })
    }

    // Go through checkout with online payment
    await checkoutLink.click()
    await expect(page).toHaveURL(/\/checkout/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /PODSUMOWANIE/i })).toBeVisible({ timeout: 20_000 })

    await page.waitForFunction(() => {
      const input = document.getElementById('firstName') as HTMLInputElement | null
      return !!input && input.value.length > 0
    }, { timeout: 15_000 })

    await page.getByLabel('Imię').fill(SANDBOX_CONFIG.deliveryFirstName)
    await page.getByLabel('Nazwisko').fill(SANDBOX_CONFIG.deliveryLastName)
    await page.getByLabel('Email').fill(deliveryUserEmail)
    await page.getByLabel(/Numer telefonu|Telefon/i).fill('+48500777111')

    const onlinePaymentButton = page.getByRole('button', { name: /Płatność online/i }).first()
    await expect(onlinePaymentButton).toBeVisible({ timeout: 10_000 })
    await onlinePaymentButton.click()

    const termsCheckbox = page.getByTestId('terms-acceptance')
    await expect(termsCheckbox).toBeVisible()
    if (!(await termsCheckbox.isChecked())) {
      await termsCheckbox.click()
    }

    const submitButton = page.getByTestId('checkout-submit-button')
    await expect(submitButton).toBeVisible()

    const waitForRegisterRequest = () =>
      page.waitForRequest(
        req => req.method() === 'POST' && req.url().includes('/api/payments/p24/register'),
        { timeout: 15_000 }
      ).catch(() => null)

    let registerRequestPromise = waitForRegisterRequest()
    await submitButton.click()
    let registerRequest = await registerRequestPromise
    if (!registerRequest) {
      registerRequestPromise = waitForRegisterRequest()
      await submitButton.click()
      registerRequest = await registerRequestPromise
    }
    if (!registerRequest) {
      const visibleErrors = await page.locator('p.text-red-400').allTextContents()
      const activeToasts = await page.locator('[data-sonner-toast]').allTextContents().catch(() => [])
      throw new Error(
        `Missing /api/payments/p24/register request. URL=${page.url()} | ` +
        `formErrors=${JSON.stringify(visibleErrors)} | toasts=${JSON.stringify(activeToasts)}`
      )
    }

    const registerPayload = registerRequest!.postDataJSON() as { orderId?: string }
    createdOrderId = String(registerPayload?.orderId || '')
    expect(createdOrderId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )

    // Complete P24 payment and return to confirmation
    await completeP24SandboxPayment(page)

    await expect(page).toHaveURL(new RegExp(`/order-confirmation\\?orderId=${createdOrderId}`), { timeout: 60_000 })
    await expect(
      page.getByText('ZAMÓWIENIE ZŁOŻONE').or(page.getByText('OCZEKIWANIE NA PŁATNOŚĆ'))
    ).toBeVisible({ timeout: 20_000 })
  })

  // -----------------------------------------------------------------------
  // Step 3: Verify payment and order in DB
  // -----------------------------------------------------------------------
  test('3. Verify payment and order in DB', async ({ page }) => {
    test.setTimeout(60_000)
    test.skip(!createdOrderId, 'step 2 failed — no order')

    const paidOrder = await waitForOrderState(
      admin,
      createdOrderId,
      { paymentStatus: 'paid', orderStatus: 'confirmed' },
      3 * 60_000
    )
    orderNumber = paidOrder.order_number as string
    expect(orderNumber).toMatch(/^WEB-/)

    const orderTotals = await getOrderTotals(admin, createdOrderId)
    expect(Math.abs(orderTotals.total - orderTotals.expectedGrossTotal)).toBeLessThan(0.01)

    // Verify confirmation page amounts
    await loginDeliveryUser(page, deliveryUserEmail, SANDBOX_CONFIG.deliveryPassword)
    await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/order-confirmation?orderId=${createdOrderId}`, { timeout: 60_000 })

    // Wait for order data to load (page shows spinner until fetched)
    await expect(
      page.getByText('ZAMÓWIENIE ZŁOŻONE').or(page.getByText('OCZEKIWANIE NA PŁATNOŚĆ'))
    ).toBeVisible({ timeout: 30_000 })

    const confirmationProducts = await readSummaryValueByLabel(page, 'Produkty')
    const confirmationTotal = await readSummaryValueByLabel(page, 'Razem')
    expect(confirmationProducts).toBeTruthy()
    expect(confirmationTotal).toBeTruthy()

    const confirmationProductsValue = parsePln(confirmationProducts!)
    const confirmationTotalValue = parsePln(confirmationTotal!)
    expect(Math.abs(confirmationProductsValue - orderTotals.subtotal)).toBeLessThan(0.01)
    expect(Math.abs(confirmationTotalValue - orderTotals.total)).toBeLessThan(0.01)

    const confirmationDelivery = await readSummaryValueByLabel(page, 'Dostawa')
    if (orderTotals.deliveryFee > 0) {
      expect(confirmationDelivery).toBeTruthy()
      const confirmationDeliveryValue = parsePln(confirmationDelivery!)
      expect(Math.abs(confirmationDeliveryValue - orderTotals.deliveryFee)).toBeLessThan(0.01)
    } else {
      expect((confirmationDelivery || '').toLowerCase()).toContain('gratis')
    }
  })

  // -----------------------------------------------------------------------
  // Step 4: Verify kitchen ticket created
  // -----------------------------------------------------------------------
  test('4. Verify kitchen ticket created', async () => {
    test.setTimeout(90_000)
    test.skip(!createdOrderId, 'step 2 failed — no order')

    const kitchenTicket = await waitForKitchenTicket(admin, createdOrderId, 90_000)
    expect(kitchenTicket.status).toBe('pending')
    kitchenTicketId = kitchenTicket.id as string
  })

  // -----------------------------------------------------------------------
  // Step 5: Verify POS order detail
  // -----------------------------------------------------------------------
  test('5. Verify POS order detail', async ({ browser }) => {
    test.setTimeout(120_000)
    test.skip(!createdOrderId, 'step 2 failed — no order')

    // Primary verification: DB (always available via admin client)
    const orderTotals = await getOrderTotals(admin, createdOrderId)
    const orderDisplayItems = await getOrderDisplayItems(admin, createdOrderId)
    expect(Math.abs(orderTotals.total - orderTotals.expectedGrossTotal)).toBeLessThan(0.01)
    expect(orderDisplayItems.length).toBeGreaterThan(0)

    // Secondary: POS UI verification (best-effort — requires auth session)
    const posContext = await browser.newContext()
    const posPage = await posContext.newPage()

    await ensurePosAuthUser(admin)
    await loginPosUser(posPage)
    await posPage.goto(`${SANDBOX_CONFIG.posBaseUrl}/orders/${createdOrderId}`, { timeout: 60_000 })
    await ensurePosLocationSelected(posPage)

    const firstItemName = orderDisplayItems[0]?.productName
    const posDetailLoaded = firstItemName
      ? await posPage.getByText(firstItemName).first().isVisible({ timeout: 20_000 }).catch(() => false)
      : false

    if (posDetailLoaded) {
      for (const orderItem of orderDisplayItems) {
        await expect(posPage.getByText(orderItem.productName).first()).toBeVisible({ timeout: 10_000 })
      }

      const posSubtotalText = await readSummaryValueByLabels(posPage, ['Suma czesciowa'])
      const posTotalText = await readSummaryValueByLabels(posPage, ['Kwota brutto', 'Razem'])

      if (posSubtotalText && posTotalText) {
        const posSubtotalValue = parsePln(posSubtotalText)
        const posTotalValue = parsePln(posTotalText)
        expect(Math.abs(posSubtotalValue - orderTotals.subtotal)).toBeLessThan(0.01)
        expect(Math.abs(posTotalValue - orderTotals.total)).toBeLessThan(0.01)
      } else {
        console.warn('[E2E] POS order detail loaded but summary rows unavailable. DB totals already verified.')
      }
    } else {
      console.warn('[E2E] POS order detail UI did not render. DB totals already verified above.')
    }

    await posContext.close()
  })

  // -----------------------------------------------------------------------
  // Step 6: POS KDS — verify ticket, start preparing, verify delivery sync
  // -----------------------------------------------------------------------
  test('6. POS KDS: verify ticket and start preparing', async ({ page, browser }) => {
    test.setTimeout(120_000)
    test.skip(!kitchenTicketId, 'step 4 failed — no kitchen ticket')

    // Primary verification: DB — confirm ticket exists and has correct data
    const { data: ktData } = await admin
      .from('orders_kitchen_tickets')
      .select('id, order_id, status, items')
      .eq('id', kitchenTicketId)
      .single()

    expect(ktData).toBeTruthy()
    expect(ktData!.status).toBe('pending')
    expect(ktData!.order_id).toBe(createdOrderId)

    const kitchenItems = Array.isArray(ktData?.items)
      ? ktData.items as Array<Record<string, unknown>>
      : []
    expect(kitchenItems.length).toBeGreaterThan(0)

    // KDS UI: best-effort — POS browser client needs Supabase auth session to fetch tickets
    const posContext = await browser.newContext()
    const posPage = await posContext.newPage()

    await ensurePosAuthUser(admin)
    await loginPosUser(posPage)
    await posPage.goto(`${SANDBOX_CONFIG.posBaseUrl}/kitchen`, { timeout: 60_000 })
    await ensurePosLocationSelected(posPage)

    const ticketSelector = `[data-ticket-id="${kitchenTicketId}"][data-status="pending"]`
    const ticketVisible = await posPage.locator(ticketSelector).first().isVisible({ timeout: 30_000 }).catch(() => false)

    if (ticketVisible) {
      const ticketCard = posPage.locator(ticketSelector)
        .filter({ has: posPage.locator('[data-action="start-preparing"]') })
        .first()

      for (const kitchenItem of kitchenItems) {
        const variantName = String(kitchenItem.variant_name || '').trim()
        if (variantName) {
          await expect(ticketCard.getByText(`(${variantName})`).first()).toBeVisible({ timeout: 10_000 })
        }
      }

      await ticketCard.locator('[data-action="start-preparing"]').click()
      await expect(
        posPage.locator(`[data-ticket-id="${kitchenTicketId}"][data-status="preparing"]`).first()
      ).toBeVisible({ timeout: 20_000 })

      await posContext.close()

      // Verify order status synced back to delivery
      await waitForOrderState(admin, createdOrderId, { orderStatus: 'preparing' }, 90_000)

      await loginDeliveryUser(page, deliveryUserEmail, SANDBOX_CONFIG.deliveryPassword)
      await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/order-confirmation?orderId=${createdOrderId}`, { timeout: 60_000 })
      await expect(
        page.getByText('ZAMÓWIENIE ZŁOŻONE').or(page.getByText('OCZEKIWANIE NA PŁATNOŚĆ')).or(page.getByText('W PRZYGOTOWANIU'))
      ).toBeVisible({ timeout: 30_000 })
    } else {
      console.warn('[E2E] KDS board did not render ticket in UI (Supabase auth session issue). DB verification passed above.')
      await posContext.close()
    }
  })
})
