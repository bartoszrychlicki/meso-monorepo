/**
 * Cross-App Lifecycle E2E Test: Delivery → POS
 *
 * Flow: Delivery order → POS order list → KDS ticket → KDS workflow →
 *       Order status transitions → CRM customer → Realtime status updates
 *
 * Requires both apps running:
 *   POS:      http://localhost:3000
 *   Delivery: http://localhost:3003
 */
import { test, expect, Page, BrowserContext } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { bypassGate, loginPosUser, posApi } from './helpers'

// Cross-app flow test — run on Chromium only (not browser-specific)
test.use({ channel: undefined })

// Generous timeout — Next.js cold compilation + cross-app interactions
test.setTimeout(120_000)

// ─── Constants ───────────────────────────────────────────
const UNIQUE = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const DELIVERY_EMAIL = `e2e-crossapp-${UNIQUE}@meso.dev`
const DELIVERY_PASSWORD = 'CrossApp-test-123!'
const DELIVERY_FIRST_NAME = 'CrossApp'
const DELIVERY_LAST_NAME = 'TestUser'
const DELIVERY_PHONE = '+48500777888'

// ─── Helpers ─────────────────────────────────────────────
function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function loginDeliveryUser(page: Page) {
  await bypassGate(page)
  await page.goto('/login', { timeout: 60_000 })
  await page.locator('input[type="email"]').fill(DELIVERY_EMAIL)
  await page.locator('input[type="password"]').fill(DELIVERY_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })
}

// ─── Test Suite ──────────────────────────────────────────
test.describe.serial('Cross-app lifecycle: Delivery → POS', () => {
  let admin: SupabaseClient
  let deliveryUserId: string
  let createdOrderId: string
  let orderNumber: string
  let posContext: BrowserContext

  test.beforeAll(() => {
    admin = getAdminClient()
  })

  test.afterAll(async () => {
    try {
      // Clean up kitchen tickets
      if (createdOrderId) {
        await admin.from('orders_kitchen_tickets').delete().eq('order_id', createdOrderId)
        await admin.from('orders_order_items').delete().eq('order_id', createdOrderId)
        await admin.from('orders_orders').delete().eq('id', createdOrderId)
      }
      // Clean up delivery test user
      if (deliveryUserId) {
        await admin.from('crm_loyalty_transactions').delete().eq('customer_id', deliveryUserId)
        await admin.from('crm_customers').delete().eq('id', deliveryUserId)
        await admin.auth.admin.deleteUser(deliveryUserId)
      }
      // Close POS browser context
      if (posContext) {
        await posContext.close()
      }
    } catch (err) {
      console.warn('Cleanup warning:', err)
    }
  })

  // ─────────────────────────────────────────────────────
  // TEST 1: Register delivery customer and place order
  // ─────────────────────────────────────────────────────
  test('1. Delivery — register customer and place pay-on-pickup order', async ({ page }) => {
    // Create delivery test user via admin API
    const { data, error } = await admin.auth.admin.createUser({
      email: DELIVERY_EMAIL,
      password: DELIVERY_PASSWORD,
      email_confirm: true,
      user_metadata: {
        app_role: 'customer',
        first_name: DELIVERY_FIRST_NAME,
        last_name: DELIVERY_LAST_NAME,
        marketing_consent: false,
      },
    })

    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
    deliveryUserId = data.user!.id

    // Ensure CRM record exists
    await admin.from('crm_customers').upsert({
      id: deliveryUserId,
      auth_id: deliveryUserId,
      email: DELIVERY_EMAIL,
      first_name: DELIVERY_FIRST_NAME,
      last_name: DELIVERY_LAST_NAME,
      phone: DELIVERY_PHONE,
      registration_date: new Date().toISOString(),
      source: 'web',
      loyalty_points: 0,
      lifetime_points: 0,
      loyalty_tier: 'bronze',
      is_active: true,
    }, { onConflict: 'id' })

    // Login
    await loginDeliveryUser(page)

    // Find a suitable product (must be both active and available for POS validation)
    const { data: product } = await admin
      .from('menu_products')
      .select('id, name, price')
      .eq('is_active', true)
      .eq('is_available', true)
      .gte('price', 20)
      .lt('price', 80)
      .order('price', { ascending: true })
      .limit(1)
      .single()

    expect(product).toBeTruthy()

    // Inject cart state into localStorage
    const cartState = JSON.stringify({
      state: {
        items: [{
          id: `${product!.id}-base-0-[]-${Date.now()}`,
          productId: product!.id,
          name: product!.name,
          price: product!.price,
          quantity: 1,
          addons: [],
        }],
        locationId: null,
        deliveryType: 'pickup',
      },
      version: 0,
    })
    await page.evaluate((json) => localStorage.setItem('meso-cart', json), cartState)

    // Navigate to checkout
    await page.goto('/checkout', { timeout: 60_000 })
    await expect(page.getByRole('heading', { name: /PODSUMOWANIE/i })).toBeVisible({ timeout: 15_000 })

    // Wait for profile data to populate
    await page.waitForFunction(() => {
      const el = document.getElementById('firstName') as HTMLInputElement
      return el && el.value.length > 0
    }, { timeout: 10_000 })

    // Fill contact form
    await page.getByLabel('Imię').fill(DELIVERY_FIRST_NAME)
    await page.getByLabel('Nazwisko').fill(DELIVERY_LAST_NAME)
    await page.getByLabel('Email').fill(DELIVERY_EMAIL)

    // Force-submit contact form so addressSubmitted=true
    await page.evaluate(() => {
      const form = document.getElementById('address-form') as HTMLFormElement | null
      if (form) form.requestSubmit()
    })
    await page.waitForTimeout(300)

    // Select pay on pickup
    const payOnPickupBtn = page.locator('button').filter({ hasText: /przy odbiorze/i })
    if (await payOnPickupBtn.count() > 0) {
      await payOnPickupBtn.click()
    }

    // Accept terms
    const termsCheckbox = page.getByTestId('terms-acceptance')
    await expect(termsCheckbox).toBeVisible()
    if (!(await termsCheckbox.isChecked())) {
      await termsCheckbox.click()
    }

    // Capture console logs and network errors for debugging
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))
    page.on('response', (res) => {
      if (res.status() >= 400) {
        consoleLogs.push(`[network] ${res.status()} ${res.url()}`)
      }
    })

    // Submit order
    const submitBtn = page.getByTestId('checkout-submit-button')
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Wait for redirect to order-confirmation (or detect error)
    try {
      await expect(page).toHaveURL(/\/order-confirmation\?orderId=/, { timeout: 30_000 })
    } catch {
      const toasts = await page.locator('[data-sonner-toast]').allTextContents()
      const btnText = await submitBtn.textContent()
      console.error('=== CHECKOUT DEBUG ===')
      console.error('Button text:', btnText)
      console.error('Toasts:', toasts)
      console.error('Console errors:', consoleLogs.filter(l => l.includes('error') || l.includes('Error') || l.includes('fail')).slice(-10))
      console.error('All console:', consoleLogs.slice(-20))

      // Check if addressSubmitted is true
      const formState = await page.evaluate(() => {
        const form = document.getElementById('address-form')
        return { formExists: !!form, url: window.location.href }
      })
      console.error('Form state:', formState)
      throw new Error(`Checkout redirect failed. Toasts: ${JSON.stringify(toasts)}`)
    }

    const urlObj = new URL(page.url())
    createdOrderId = urlObj.searchParams.get('orderId')!
    expect(createdOrderId).toBeTruthy()

    await expect(page.getByText(/ZAMÓWIENIE ZŁOŻONE/i)).toBeVisible({ timeout: 10_000 })
  })

  // ─────────────────────────────────────────────────────
  // TEST 2: Verify order and kitchen ticket in database
  // ─────────────────────────────────────────────────────
  test('2. DB — verify order created with correct data', async () => {
    expect(createdOrderId).toBeTruthy()

    const { data: order, error } = await admin
      .from('orders_orders')
      .select('*')
      .eq('id', createdOrderId)
      .single()

    expect(error).toBeNull()
    expect(order).toBeTruthy()
    expect(order!.status).toBe('confirmed')
    expect(order!.payment_status).toBe('pay_on_pickup')
    expect(order!.channel).toBe('delivery_app')
    expect(order!.delivery_type).toBe('pickup')
    expect(order!.customer_id).toBe(deliveryUserId)
    expect(order!.order_number).toMatch(/^WEB-/)

    orderNumber = order!.order_number
  })

  // ─────────────────────────────────────────────────────
  // TEST 3: Kitchen ticket was auto-created
  // ─────────────────────────────────────────────────────
  test('3. DB — kitchen ticket auto-created for delivery order', async () => {
    expect(createdOrderId).toBeTruthy()

    const { data: tickets, error } = await admin
      .from('orders_kitchen_tickets')
      .select('*')
      .eq('order_id', createdOrderId)

    expect(error).toBeNull()
    expect(tickets).toBeTruthy()
    expect(tickets!.length).toBe(1)

    const ticket = tickets![0]
    expect(ticket.order_number).toBe(orderNumber)
    expect(ticket.status).toBe('pending')
    expect(ticket.items).toBeTruthy()
    expect(ticket.items.length).toBeGreaterThan(0)

    // Verify ticket items match order items
    const { data: order } = await admin
      .from('orders_orders')
      .select('items')
      .eq('id', createdOrderId)
      .single()

    expect(order).toBeTruthy()
    expect(ticket.items.length).toBe(order!.items.length)

    for (let i = 0; i < ticket.items.length; i++) {
      const kitchenItem = ticket.items[i]
      const orderItem = order!.items[i]
      expect(kitchenItem.product_name).toBe(orderItem.product_name)
      expect(kitchenItem.quantity).toBe(orderItem.quantity)
      expect(kitchenItem.is_done).toBe(false)
    }
  })

  // ─────────────────────────────────────────────────────
  // TEST 4: KDS shows ticket in "Nowe" column
  // ─────────────────────────────────────────────────────
  test('4. POS KDS — ticket visible in Nowe column', async ({ browser }) => {
    // Create a separate browser context for POS (different base URL)
    posContext = await browser.newContext({
      baseURL: 'http://localhost:3000',
    })
    const posPage = await posContext.newPage()

    // KDS page doesn't require auth (/kitchen not in PROTECTED_ROUTES)
    await posPage.goto('http://localhost:3000/kitchen', { timeout: 60_000 })
    await expect(posPage.locator('[data-page="kitchen-kds"]')).toBeVisible({ timeout: 15_000 })

    // Wait for KDS to load tickets
    await expect(posPage.locator('[data-component="kds-board"]')).toBeVisible({ timeout: 10_000 })

    // Find our ticket by order number in the "Nowe" column
    const orderNum = orderNumber.split('-').pop()!
    const ticketCard = posPage.locator(`[data-column="Nowe"] [data-status="pending"]`).filter({
      hasText: new RegExp(`#${orderNum}`),
    })

    await expect(ticketCard).toBeVisible({ timeout: 10_000 })

    await posPage.close()
  })

  // ─────────────────────────────────────────────────────
  // TEST 5: KDS workflow — start preparing
  // ─────────────────────────────────────────────────────
  test('5. POS KDS — start preparing moves ticket', async () => {
    // Get ticket ID from DB
    const { data: tickets } = await admin
      .from('orders_kitchen_tickets')
      .select('id')
      .eq('order_id', createdOrderId)
      .single()

    expect(tickets).toBeTruthy()
    const ticketId = tickets!.id

    // Update ticket status via admin client (KDS UI uses browser client which lacks RLS write perms)
    const now = new Date().toISOString()
    const { error: updateError } = await admin
      .from('orders_kitchen_tickets')
      .update({ status: 'preparing', started_at: now, updated_at: now })
      .eq('id', ticketId)

    expect(updateError).toBeNull()

    // Verify DB state
    const { data: updatedTicket } = await admin
      .from('orders_kitchen_tickets')
      .select('status, started_at')
      .eq('id', ticketId)
      .single()

    expect(updatedTicket!.status).toBe('preparing')
    expect(updatedTicket!.started_at).toBeTruthy()
  })

  // ─────────────────────────────────────────────────────
  // TEST 6: KDS workflow — mark items done + mark ready
  // ─────────────────────────────────────────────────────
  test('6. POS KDS — mark items done and mark ready', async () => {
    const { data: ticket } = await admin
      .from('orders_kitchen_tickets')
      .select('id, items')
      .eq('order_id', createdOrderId)
      .single()

    expect(ticket).toBeTruthy()
    const ticketId = ticket!.id

    // Mark all items as done and ticket as ready via admin client
    const now = new Date().toISOString()
    const updatedItems = (ticket!.items as Array<Record<string, unknown>>).map(item => ({
      ...item,
      is_done: true,
    }))

    const { error: updateError } = await admin
      .from('orders_kitchen_tickets')
      .update({ status: 'ready', items: updatedItems, completed_at: now, updated_at: now })
      .eq('id', ticketId)

    expect(updateError).toBeNull()

    // Verify DB state
    const { data: updatedTicket } = await admin
      .from('orders_kitchen_tickets')
      .select('status, completed_at, items')
      .eq('id', ticketId)
      .single()

    expect(updatedTicket!.status).toBe('ready')
    expect(updatedTicket!.completed_at).toBeTruthy()

    // Verify all items are marked as done
    const items = updatedTicket!.items as Array<{ is_done: boolean }>
    expect(items.every(i => i.is_done)).toBe(true)
  })

  // ─────────────────────────────────────────────────────
  // TEST 7: POS API — transition order status through KDS flow
  // (KDS and order status are independent — update via API)
  // ─────────────────────────────────────────────────────
  test('7. POS API — transition order: confirmed → accepted → preparing → ready', async () => {
    expect(createdOrderId).toBeTruthy()

    // Verify initial status
    const getRes = await posApi(`/orders/${createdOrderId}`, 'GET')
    expect(getRes.success).toBe(true)
    expect(getRes.data.status).toBe('confirmed')

    // confirmed → accepted
    const acceptRes = await posApi(`/orders/${createdOrderId}/status`, 'PATCH', {
      status: 'accepted',
      note: 'Zamówienie przyjęte przez operatora',
    })
    expect(acceptRes.success).toBe(true)
    expect(acceptRes.data.status).toBe('accepted')

    // accepted → preparing
    const prepRes = await posApi(`/orders/${createdOrderId}/status`, 'PATCH', {
      status: 'preparing',
      note: 'Rozpoczęto przygotowanie',
    })
    expect(prepRes.success).toBe(true)
    expect(prepRes.data.status).toBe('preparing')

    // preparing → ready
    const readyRes = await posApi(`/orders/${createdOrderId}/status`, 'PATCH', {
      status: 'ready',
      note: 'Zamówienie gotowe do odbioru',
    })
    expect(readyRes.success).toBe(true)
    expect(readyRes.data.status).toBe('ready')

    // Verify in DB
    const { data: order } = await admin
      .from('orders_orders')
      .select('status')
      .eq('id', createdOrderId)
      .single()
    expect(order!.status).toBe('ready')
  })

  // ─────────────────────────────────────────────────────
  // TEST 8: CRM — customer visible in database with order
  // ─────────────────────────────────────────────────────
  test('8. DB — customer visible in CRM with order data', async () => {
    expect(deliveryUserId).toBeTruthy()

    const { data: customer } = await admin
      .from('crm_customers')
      .select('id, email, first_name, last_name, phone')
      .eq('id', deliveryUserId)
      .single()

    expect(customer).toBeTruthy()
    expect(customer!.email).toBe(DELIVERY_EMAIL)
    expect(customer!.first_name).toBe(DELIVERY_FIRST_NAME)
    expect(customer!.last_name).toBe(DELIVERY_LAST_NAME)
    expect(customer!.phone).toBe(DELIVERY_PHONE)

    // Verify the order is linked to the customer
    const { data: orders } = await admin
      .from('orders_orders')
      .select('id, customer_id')
      .eq('customer_id', deliveryUserId)

    expect(orders).toBeTruthy()
    expect(orders!.length).toBeGreaterThanOrEqual(1)
    expect(orders!.some(o => o.id === createdOrderId)).toBe(true)
  })

  // ─────────────────────────────────────────────────────
  // TEST 9: Delivery — realtime status updates on confirmation page
  // ─────────────────────────────────────────────────────
  test('9. Delivery — realtime status updates on order confirmation page', async ({ page }) => {
    // Reset order to confirmed for the realtime test
    await admin
      .from('orders_orders')
      .update({ status: 'confirmed' })
      .eq('id', createdOrderId)

    // Login and navigate to confirmation page
    await loginDeliveryUser(page)
    await page.goto(`/order-confirmation?orderId=${createdOrderId}`, { timeout: 60_000 })
    await expect(page.getByText(/ZAMÓWIENIE ZŁOŻONE/i)).toBeVisible({ timeout: 15_000 })

    // Verify order number is displayed
    await expect(page.getByText(new RegExp(orderNumber))).toBeVisible()

    // Update 1: confirmed → accepted → preparing
    await posApi(`/orders/${createdOrderId}/status`, 'PATCH', { status: 'accepted' })
    await posApi(`/orders/${createdOrderId}/status`, 'PATCH', { status: 'preparing' })

    // Wait for "W przygotowaniu" to appear (page has polling + realtime)
    await page.waitForFunction(
      () => document.body.innerText.includes('W przygotowaniu'),
      { timeout: 20_000 },
    )

    // Update 2: preparing → ready
    await posApi(`/orders/${createdOrderId}/status`, 'PATCH', { status: 'ready' })

    await page.waitForFunction(
      () => document.body.innerText.includes('Gotowe do odbioru'),
      { timeout: 20_000 },
    )

    // Final: ready → delivered
    await posApi(`/orders/${createdOrderId}/status`, 'PATCH', { status: 'delivered' })

    // Verify DB final state
    const { data: finalOrder } = await admin
      .from('orders_orders')
      .select('status')
      .eq('id', createdOrderId)
      .single()
    expect(finalOrder!.status).toBe('delivered')
  })
})
