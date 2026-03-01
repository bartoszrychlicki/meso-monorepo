/**
 * Full Order Lifecycle E2E Test
 *
 * Flow: Registration → Login → Place Order → POS API Status Transitions → Customer Realtime Updates
 *
 * Requires both apps running:
 *   POS:      http://localhost:3000
 *   Delivery: http://localhost:3003
 */
import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { bypassGate } from './helpers'

// Generous timeout — Next.js cold compilation can be slow
test.setTimeout(90_000)

// ─── Constants ───────────────────────────────────────────
const UNIQUE = Date.now()
const TEST_EMAIL = `e2e-lifecycle-${UNIQUE}@meso.dev`
const TEST_PASSWORD = 'Lifecycle-test-123!'
const TEST_FIRST_NAME = 'E2ELife'
const TEST_LAST_NAME = 'TestUser'

const POS_BASE_URL = process.env.POS_API_URL || 'http://localhost:3000'
const POS_API_URL = `${POS_BASE_URL.replace(/\/api\/v1\/?$/, '')}/api/v1`
const POS_API_KEY = process.env.POS_API_KEY || 'meso_k1_iKFzaJkxfHEwTnK4e19fOqh4sbRyN2_gjcpn8YrRGwE'

// ─── Helpers ─────────────────────────────────────────────
function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function loginViaUI(page: Page) {
  await bypassGate(page)
  await page.goto('/login', { timeout: 60_000 })
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })
}

async function posApi(path: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${POS_API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': POS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  return { status: res.status, ...json }
}

// ─── Test Suite ──────────────────────────────────────────
test.describe.serial('Full Order Lifecycle: Register → Login → Order → Status Updates → Customer Tracking', () => {
  let admin: SupabaseClient
  let testUserId: string
  let createdOrderId: string
  let orderNumber: string

  test.beforeAll(() => {
    admin = getAdminClient()
  })

  test.afterAll(async () => {
    try {
      if (createdOrderId) {
        await admin.from('orders_order_items').delete().eq('order_id', createdOrderId)
        await admin.from('orders_orders').delete().eq('id', createdOrderId)
      }
      if (testUserId) {
        await admin.from('crm_loyalty_transactions').delete().eq('customer_id', testUserId)
        await admin.from('crm_customers').delete().eq('id', testUserId)
        await admin.auth.admin.deleteUser(testUserId)
      }
    } catch (err) {
      console.warn('Cleanup warning:', err)
    }
  })

  // ─────────────────────────────────────────────────────
  // TEST 1: Register a new customer account
  // ─────────────────────────────────────────────────────
  test('1. Register new customer via admin API', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        app_role: 'customer',
        first_name: TEST_FIRST_NAME,
        last_name: TEST_LAST_NAME,
        marketing_consent: false,
      },
    })

    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
    testUserId = data.user!.id

    await admin.from('crm_customers').upsert({
      id: testUserId,
      auth_id: testUserId,
      email: TEST_EMAIL,
      first_name: TEST_FIRST_NAME,
      last_name: TEST_LAST_NAME,
      phone: '+48500999888',
      registration_date: new Date().toISOString(),
      source: 'web',
      loyalty_points: 50,
      lifetime_points: 50,
      loyalty_tier: 'bronze',
      is_active: true,
    }, { onConflict: 'id' })

    const { data: customer } = await admin
      .from('crm_customers')
      .select('id, email, loyalty_points')
      .eq('id', testUserId)
      .single()

    expect(customer).toBeTruthy()
    expect(customer!.email).toBe(TEST_EMAIL)
    expect(customer!.loyalty_points).toBe(50)
  })

  // ─────────────────────────────────────────────────────
  // TEST 2: Login via delivery app UI
  // ─────────────────────────────────────────────────────
  test('2. Login with registered account', async ({ page }) => {
    await loginViaUI(page)

    const url = new URL(page.url())
    expect(['/menu', '/', '/account']).toContain(url.pathname)
  })

  // ─────────────────────────────────────────────────────
  // TEST 3: Place a pay-on-pickup order
  // ─────────────────────────────────────────────────────
  test('3. Place pay-on-pickup order via checkout', async ({ page }) => {
    await loginViaUI(page)

    // Find a product in the right price range
    const { data: product } = await admin
      .from('menu_products')
      .select('id, name, price')
      .eq('is_active', true)
      .gte('price', 35)
      .lt('price', 80)
      .order('price', { ascending: true })
      .limit(1)
      .single()

    expect(product).toBeTruthy()

    // Inject cart state directly into localStorage
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

    // Wait for profile data to populate the contact form
    await page.waitForFunction(() => {
      const el = document.getElementById('firstName') as HTMLInputElement
      return el && el.value.length > 0
    }, { timeout: 10_000 })

    // Fill only firstName/lastName/email — leave phone as loaded from profile (+48500999888)
    // Phone uses a custom PhoneInput with Controller; raw fill() doesn't trigger react-hook-form
    await page.getByLabel('Imię').fill(TEST_FIRST_NAME)
    await page.getByLabel('Nazwisko').fill(TEST_LAST_NAME)
    await page.getByLabel('Email').fill(TEST_EMAIL)

    // Force-submit the contact form first so addressSubmitted=true before final submit
    await page.evaluate(() => {
      const form = document.getElementById('address-form') as HTMLFormElement | null
      if (form) form.requestSubmit()
    })
    // Give react-hook-form time to validate and call onSubmit
    await page.waitForTimeout(300)

    // Select "Płatność przy odbiorze" (Pay on Pickup)
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

    // Capture console logs for debugging
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))

    // Submit order
    const submitBtn = page.getByTestId('checkout-submit-button')
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Wait for redirect to order-confirmation (or detect error)
    try {
      await expect(page).toHaveURL(/\/order-confirmation\?orderId=/, { timeout: 30_000 })
    } catch {
      // Dump debug info if redirect didn't happen
      const toasts = await page.locator('[data-sonner-toast]').allTextContents()
      const btnText = await submitBtn.textContent()
      console.error('=== CHECKOUT DEBUG ===')
      console.error('Button text:', btnText)
      console.error('Toasts:', toasts)
      console.error('Console logs:', consoleLogs.filter(l => l.includes('error') || l.includes('Error') || l.includes('fail')).slice(-10))
      console.error('All console:', consoleLogs.slice(-20))
      throw new Error(`Checkout redirect failed. Button: "${btnText}", Toasts: ${JSON.stringify(toasts)}`)
    }

    const urlObj = new URL(page.url())
    createdOrderId = urlObj.searchParams.get('orderId')!
    expect(createdOrderId).toBeTruthy()

    await expect(page.getByText(/ZAMÓWIENIE ZŁOŻONE/i)).toBeVisible({ timeout: 10_000 })
  })

  // ─────────────────────────────────────────────────────
  // TEST 4: Verify order in Supabase DB
  // ─────────────────────────────────────────────────────
  test('4. Verify order in database', async () => {
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
    expect(order!.payment_method).toBe('pay_on_pickup')
    expect(order!.channel).toBe('delivery_app')
    expect(order!.delivery_type).toBe('pickup')
    expect(order!.customer_id).toBe(testUserId)
    expect(order!.order_number).toMatch(/^WEB-/)

    orderNumber = order!.order_number
  })

  // ─────────────────────────────────────────────────────
  // TEST 5: POS API status transitions (KDS operator flow)
  //   confirmed → accepted → preparing → ready
  // ─────────────────────────────────────────────────────
  test('5. POS API: transition order through KDS statuses', async () => {
    expect(createdOrderId).toBeTruthy()

    // Verify initial state via POS API
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
  // TEST 6: Invalid status transition is rejected
  // ─────────────────────────────────────────────────────
  test('6. POS API: reject invalid transition (ready → confirmed)', async () => {
    const res = await posApi(`/orders/${createdOrderId}/status`, 'PATCH', {
      status: 'confirmed',
    })
    expect(res.success).toBe(false)
    expect(res.error.code).toBe('INVALID_STATUS_TRANSITION')
  })

  // ─────────────────────────────────────────────────────
  // TEST 7: Customer sees realtime status updates
  // ─────────────────────────────────────────────────────
  test('7. Customer sees status changes in realtime on order-confirmation', async ({ page }) => {
    // Reset order to confirmed for the realtime test
    await admin
      .from('orders_orders')
      .update({ status: 'confirmed' })
      .eq('id', createdOrderId)

    // Login and open the confirmation page
    await loginViaUI(page)
    await page.goto(`/order-confirmation?orderId=${createdOrderId}`, { timeout: 60_000 })
    await expect(page.getByText(/ZAMÓWIENIE ZŁOŻONE/i)).toBeVisible({ timeout: 15_000 })

    // Verify order number is displayed
    await expect(page.getByText(new RegExp(orderNumber))).toBeVisible()

    // ── Update 1: confirmed → accepted → preparing ──
    await posApi(`/orders/${createdOrderId}/status`, 'PATCH', { status: 'accepted' })
    await posApi(`/orders/${createdOrderId}/status`, 'PATCH', { status: 'preparing' })

    // The page has 10s polling + realtime — wait for "W przygotowaniu" step to appear active
    await page.waitForFunction(
      () => document.body.innerText.includes('W przygotowaniu'),
      { timeout: 20_000 },
    )

    // ── Update 2: preparing → ready ──
    await posApi(`/orders/${createdOrderId}/status`, 'PATCH', { status: 'ready' })

    await page.waitForFunction(
      () => document.body.innerText.includes('Gotowe do odbioru'),
      { timeout: 20_000 },
    )

    // ── Final: ready → delivered ──
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
