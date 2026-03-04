/**
 * Sandbox Cross-App E2E (Delivery -> P24 Sandbox -> POS KDS)
 *
 * This scenario is designed for deployed environments (staging/live-like):
 * 1) Provisions a delivery customer account (create or reuse)
 * 2) Places an online order in Delivery
 * 3) Redirects to P24 sandbox and completes payment
 * 4) Verifies payment/order status in DB
 * 5) Starts preparation in POS KDS and verifies status sync
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
import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DELIVERY_BASE_URL = (
  process.env.E2E_DELIVERY_BASE_URL || 'https://order.mesofood.pl'
).replace(/\/+$/, '')

const POS_BASE_URL = (
  process.env.E2E_POS_BASE_URL || 'https://pos.mesofood.pl'
).replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')

const GATE_PASSWORD = process.env.E2E_GATE_PASSWORD || 'TuJestMeso2026'
const P24_AUTOMATE = process.env.E2E_P24_AUTOMATE !== '0'
const P24_REDIRECT_TIMEOUT_MS = Number(process.env.E2E_P24_REDIRECT_TIMEOUT_MS || 300_000)
const SHARED_DELIVERY_EMAIL = process.env.E2E_DELIVERY_EMAIL || 'e2e-order-supabase@meso.dev'
const SHARED_DELIVERY_PASSWORD = process.env.E2E_DELIVERY_PASSWORD || 'SandboxP24-test-123!'
const POS_TEST_EMAIL = process.env.E2E_POS_TEST_EMAIL || 'e2e-pos@meso.dev'
const POS_TEST_PASSWORD = process.env.E2E_POS_TEST_PASSWORD || 'e2e-pos-password-123!'
const POS_API_BASE_URL = (
  process.env.E2E_POS_API_URL || `${POS_BASE_URL}/api/v1`
).replace(/\/+$/, '')
const POS_API_KEY = process.env.POS_API_KEY || ''

const UNIQUE = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const FALLBACK_DELIVERY_EMAIL = `e2e-sandbox-${UNIQUE}@meso.dev`
const DELIVERY_FIRST_NAME = 'E2E'
const DELIVERY_LAST_NAME = 'Sandbox'
const DELIVERY_PHONE = '+48500777111'

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function readNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2))
}

function parsePln(valueText: string): number {
  const normalized = valueText
    .replace(/\s/g, '')
    .replace(/zł/gi, '')
    .replace(',', '.')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) {
    throw new Error(`Cannot parse PLN value from: "${valueText}"`)
  }
  return Number(match[0])
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function readSummaryValueByLabel(page: Page, label: string): Promise<string | null> {
  return page.evaluate((targetLabel) => {
    const allSpans = Array.from(document.querySelectorAll('span'))
    const labelSpan = allSpans.find(
      (span) => (span.textContent || '').trim() === targetLabel
    )
    if (!labelSpan) return null
    const row = labelSpan.closest('div')
    if (!row) return null
    const rowSpans = Array.from(row.querySelectorAll('span'))
    const valueSpan = rowSpans[rowSpans.length - 1]
    return (valueSpan?.textContent || '').trim() || null
  }, label)
}

async function readSummaryValueByLabels(page: Page, labels: string[]): Promise<string | null> {
  for (const label of labels) {
    const value = await readSummaryValueByLabel(page, label)
    if (value) return value
  }
  return null
}

async function getOrderTotals(admin: SupabaseClient, orderId: string) {
  const { data, error } = await admin
    .from('orders_orders')
    .select('subtotal, tax, discount, promo_discount, delivery_fee, tip, total')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch order totals for ${orderId}: ${error?.message}`)
  }

  const subtotal = readNumber(data.subtotal)
  const tax = readNumber(data.tax)
  const discount = readNumber(data.discount ?? data.promo_discount)
  const deliveryFee = readNumber(data.delivery_fee)
  const tip = readNumber(data.tip)
  const total = readNumber(data.total)
  const expectedGrossTotal = roundCurrency(subtotal - discount + deliveryFee + tip)
  const expectedNet = roundCurrency(total - tax)

  return {
    subtotal,
    tax,
    discount,
    deliveryFee,
    tip,
    total,
    expectedGrossTotal,
    expectedNet,
  }
}

type OrderDisplayItem = {
  productName: string
  variantName?: string
  modifierNames: string[]
}

async function getOrderDisplayItems(admin: SupabaseClient, orderId: string): Promise<OrderDisplayItem[]> {
  const { data, error } = await admin
    .from('orders_orders')
    .select('items')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch order items for ${orderId}: ${error?.message}`)
  }

  const rawItems = Array.isArray(data.items) ? data.items : []
  return rawItems
    .map((item) => {
      const rawModifiers = Array.isArray((item as Record<string, unknown>)?.modifiers)
        ? (item as Record<string, unknown>).modifiers as Array<Record<string, unknown>>
        : []

      return {
        productName: String((item as Record<string, unknown>)?.product_name || ''),
        variantName: ((item as Record<string, unknown>)?.variant_name || undefined) as string | undefined,
        modifierNames: rawModifiers
          .map((modifier) => String(modifier?.name || '').trim())
          .filter(Boolean),
      }
    })
    .filter((item) => item.productName.length > 0)
}

async function setGateCookie(page: Page, appUrl: string) {
  const parsed = new URL(appUrl)
  await page.context().addCookies([{
    name: 'meso_access',
    value: GATE_PASSWORD,
    domain: parsed.hostname,
    path: '/',
    secure: parsed.protocol === 'https:',
    httpOnly: false,
    sameSite: 'Lax',
  }])
}

async function ensurePosAuthUser(admin: SupabaseClient) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Failed to list POS auth users: ${error.message}`)
    const users = data?.users || []
    const existing = users.find((user) => (user.email || '').toLowerCase() === POS_TEST_EMAIL.toLowerCase())
    if (existing?.id) {
      const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
        password: POS_TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata || {}),
          app_role: 'cashier',
          first_name: 'E2E',
          last_name: 'POS',
        },
      })
      if (updateError) throw new Error(`Failed to update POS auth user: ${updateError.message}`)
      return
    }
    if (users.length < 200) break
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: POS_TEST_EMAIL,
    password: POS_TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      app_role: 'cashier',
      first_name: 'E2E',
      last_name: 'POS',
    },
  })
  if (createError) throw new Error(`Failed to create POS auth user: ${createError.message}`)
}

async function loginPosUser(page: Page) {
  await setGateCookie(page, POS_BASE_URL)
  await page.goto(`${POS_BASE_URL}/login`, { timeout: 60_000 })

  const emailField = page.locator('[data-field="email"]').first()
  const passwordField = page.locator('[data-field="password"]').first()
  const loginButton = page.locator('[data-action="login-email"]').first()

  const hasCustomLoginFields = await emailField.isVisible().catch(() => false)
  if (hasCustomLoginFields) {
    await emailField.fill(POS_TEST_EMAIL)
    await passwordField.fill(POS_TEST_PASSWORD)
    await loginButton.click()
  } else {
    await page.locator('input[type="email"]').first().fill(POS_TEST_EMAIL)
    await page.locator('input[type="password"]').first().fill(POS_TEST_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}

async function getPosOrderViaApi(orderId: string): Promise<Record<string, unknown> | null> {
  if (!POS_API_KEY) {
    console.warn('[E2E] POS_API_KEY missing, cannot verify POS totals via API fallback.')
    return null
  }

  let response: Response
  try {
    response = await fetch(`${POS_API_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': POS_API_KEY,
      },
    })
  } catch (error) {
    console.warn(`[E2E] POS API request failed: ${String(error)}`)
    return null
  }

  if (!response.ok) {
    console.warn(`[E2E] POS API GET /orders/${orderId} returned ${response.status}`)
    return null
  }

  const body = await response.json() as { data?: Record<string, unknown> }
  return body?.data || null
}

type DeliveryAuthUser = {
  id: string
  email: string
  createdForTest: boolean
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const targetEmail = email.toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Failed to list auth users: ${error.message}`)
    const users = data?.users || []
    const matched = users.find(user => (user.email || '').toLowerCase() === targetEmail)
    if (matched) return matched
    if (users.length < 200) break
  }
  return null
}

async function findReusableE2EUser(admin: SupabaseClient) {
  const pattern = /^e2e-.*@meso\.dev$/i
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Failed to list auth users: ${error.message}`)
    const users = data?.users || []
    const matched = users.find(user => pattern.test(user.email || ''))
    if (matched) return matched
    if (users.length < 200) break
  }
  return null
}

async function ensureDeliveryAuthUser(admin: SupabaseClient): Promise<DeliveryAuthUser> {
  // 1) Prefer shared reusable account (stable and cleanup-safe)
  const existingPreferred = await findAuthUserByEmail(admin, SHARED_DELIVERY_EMAIL)
  if (existingPreferred?.id && existingPreferred.email) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingPreferred.id, {
      password: SHARED_DELIVERY_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existingPreferred.user_metadata || {}),
        app_role: 'customer',
        first_name: DELIVERY_FIRST_NAME,
        last_name: DELIVERY_LAST_NAME,
      },
    })
    if (updateError) {
      throw new Error(`Failed to update shared delivery user: ${updateError.message}`)
    }
    return { id: existingPreferred.id, email: existingPreferred.email, createdForTest: false }
  }

  // 2) Try creating fallback unique user (may fail on some live DB states)
  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: FALLBACK_DELIVERY_EMAIL,
    password: SHARED_DELIVERY_PASSWORD,
    email_confirm: true,
    user_metadata: {
      app_role: 'customer',
      first_name: DELIVERY_FIRST_NAME,
      last_name: DELIVERY_LAST_NAME,
    },
  })
  if (!createError && createdUser.user?.id && createdUser.user.email) {
    return { id: createdUser.user.id, email: createdUser.user.email, createdForTest: true }
  }

  // 3) Final fallback: reuse any existing E2E account and reset its password
  const reusable = await findReusableE2EUser(admin)
  if (reusable?.id && reusable.email) {
    const { error: updateError } = await admin.auth.admin.updateUserById(reusable.id, {
      password: SHARED_DELIVERY_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(reusable.user_metadata || {}),
        app_role: 'customer',
        first_name: DELIVERY_FIRST_NAME,
        last_name: DELIVERY_LAST_NAME,
      },
    })
    if (updateError) {
      throw new Error(`Failed to update fallback E2E user: ${updateError.message}`)
    }
    return { id: reusable.id, email: reusable.email, createdForTest: false }
  }

  const createMessage = createError ? `createUser failed: ${createError.message}` : 'createUser returned no user'
  throw new Error(
    `Unable to provision delivery auth user (${createMessage}). ` +
    'Set E2E_DELIVERY_EMAIL/E2E_DELIVERY_PASSWORD to an existing account.'
  )
}

async function ensureCustomerProfile(admin: SupabaseClient, user: DeliveryAuthUser) {
  const { data: existing, error: existingError } = await admin
    .from('crm_customers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed checking customer profile: ${existingError.message}`)
  }
  if (existing?.id) return

  const { error: insertError } = await admin.from('crm_customers').insert({
    id: user.id,
    auth_id: user.id,
    email: user.email,
    first_name: DELIVERY_FIRST_NAME,
    last_name: DELIVERY_LAST_NAME,
    phone: DELIVERY_PHONE,
    registration_date: new Date().toISOString().slice(0, 10),
    source: 'delivery_app',
    marketing_consent: false,
    sms_consent: false,
    loyalty_points: 0,
    lifetime_points: 0,
    loyalty_tier: 'bronze',
    is_active: true,
  })
  if (insertError) {
    throw new Error(`Failed creating missing customer profile: ${insertError.message}`)
  }
}

async function loginDeliveryUser(page: Page, email: string, password: string) {
  await setGateCookie(page, DELIVERY_BASE_URL)
  await page.goto(`${DELIVERY_BASE_URL}/login`, { timeout: 60_000 })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })
}

async function waitForOrderState(
  admin: SupabaseClient,
  orderId: string,
  expected: { paymentStatus?: string; orderStatus?: string },
  timeoutMs: number,
) {
  const startedAt = Date.now()
  while (true) {
    const { data, error } = await admin
      .from('orders_orders')
      .select('status, payment_status, order_number')
      .eq('id', orderId)
      .single()

    if (!error && data) {
      const paymentOk = expected.paymentStatus ? data.payment_status === expected.paymentStatus : true
      const orderOk = expected.orderStatus ? data.status === expected.orderStatus : true
      if (paymentOk && orderOk) {
        return data
      }
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timeout waiting for order ${orderId} -> payment_status=${expected.paymentStatus ?? '*'}, status=${expected.orderStatus ?? '*'}`
      )
    }

    await new Promise(resolve => setTimeout(resolve, 5_000))
  }
}

async function waitForKitchenTicket(admin: SupabaseClient, orderId: string, timeoutMs = 60_000) {
  const startedAt = Date.now()
  while (true) {
    const { data, error } = await admin
      .from('orders_kitchen_tickets')
      .select('id, status, items')
      .eq('order_id', orderId)
      .limit(1)
      .maybeSingle()

    if (!error && data?.id) {
      return data
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timeout waiting for kitchen ticket for order ${orderId}`)
    }

    await new Promise(resolve => setTimeout(resolve, 3_000))
  }
}

async function clickFirstVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const target = page.locator(selector).first()
    const visible = await target.isVisible().catch(() => false)
    if (visible) {
      await target.click({ timeout: 5_000 })
      return true
    }
  }
  return false
}

async function clickFirstVisibleLocator(page: Page, locators: Array<ReturnType<Page['locator']>>) {
  for (const locator of locators) {
    const visible = await locator.first().isVisible().catch(() => false)
    if (visible) {
      await locator.first().click({ timeout: 5_000 })
      return true
    }
  }
  return false
}

async function ensurePosLocationSelected(page: Page) {
  const locationButton = page.getByRole('button', { name: /Wybierz lokalizacj/i }).first()
  const isVisible = await locationButton.isVisible().catch(() => false)
  if (!isVisible) return

  await locationButton.click({ timeout: 5_000 })
  const selected = await clickFirstVisibleLocator(page, [
    page.locator('[role="option"]'),
    page.locator('[cmdk-item]'),
    page.locator('[data-slot="command-item"]'),
    page.locator('[data-radix-collection-item]'),
    page.locator('button').filter({ hasText: /Kuchnia|Lokalizacja|Centralna|MESO/i }),
  ])

  if (!selected) {
    await page.keyboard.press('ArrowDown').catch(() => {})
    await page.keyboard.press('Enter').catch(() => {})
  }

  await page.waitForTimeout(1_200)
}

async function runP24BlikSandboxFlow(page: Page) {
  // Dismiss cookie banner if present
  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /Rozumiem/i }),
    page.locator('button:has-text("Rozumiem")'),
  ])

  // Select BLIK method
  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /BLIK/i }),
    page.getByRole('tab', { name: /BLIK/i }),
    page.locator('button:has-text("BLIK")'),
  ])

  // Select concrete BLIK option on sandbox list (if present)
  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /BLIK:\s*BLIK/i }),
    page.locator('button:has-text("BLIK: BLIK")'),
  ])

  // Confirm payment on method screen
  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /Płacąc akceptujesz Regulamin/i }),
    page.locator('button:has-text("Płacąc akceptujesz Regulamin")'),
    page.getByRole('button', { name: /Zapłać|Zaplac|Płacę|Place/i }),
    page.locator('button:has-text("Zapłać"), button:has-text("Zaplac"), button:has-text("Płacę"), button:has-text("Place")'),
    page.locator('[type="submit"]'),
  ])

  // In sandbox confirmation screens this label is often present.
  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /Zapłacono|Zaplacono/i }),
    page.locator('button:has-text("Zapłacono"), button:has-text("Zaplacono")'),
    page.getByRole('button', { name: /Powrót do sklepu|Wróć do sklepu|Wroc do sklepu/i }),
    page.locator('button:has-text("Powrót do sklepu"), button:has-text("Wróć do sklepu"), button:has-text("Wroc do sklepu")'),
    page.getByRole('button', { name: /Potwierdź|Potwierdz|OK/i }),
    page.locator('button:has-text("Potwierdź"), button:has-text("Potwierdz"), button:has-text("OK")'),
  ])
}

async function completeP24SandboxPayment(page: Page) {
  await page.waitForURL(url => /(^|\.)przelewy24\.pl$/i.test(url.hostname), { timeout: 60_000 })
  const returnUrlPredicate = (url: URL) => url.href.startsWith(`${DELIVERY_BASE_URL}/order-confirmation?orderId=`)
  const deadline = Date.now() + P24_REDIRECT_TIMEOUT_MS

  if (P24_AUTOMATE) {
    // Keep driving the flow until redirect or timeout.
    while (Date.now() < deadline) {
      if (returnUrlPredicate(new URL(page.url()))) return
      await runP24BlikSandboxFlow(page)
      await clickFirstVisible(page, [
        'a:has-text("Zapłać"), a:has-text("Zaplac"), a:has-text("Płacę"), a:has-text("Place")',
      ])
      const redirected = await page.waitForURL(returnUrlPredicate, { timeout: 2_500 })
        .then(() => true)
        .catch(() => false)
      if (redirected) return
      await page.waitForTimeout(900)
    }
  }

  // Manual fallback (default mode): keep browser on sandbox page, operator may complete payment by hand.
  const remaining = Math.max(1, deadline - Date.now())
  await page.waitForURL(returnUrlPredicate, { timeout: remaining })
}

test.describe.serial('Sandbox Cross-App Flow: Delivery -> P24 -> POS KDS', () => {
  let admin: SupabaseClient
  let deliveryUserId = ''
  let deliveryUserEmail = ''
  let deliveryUserCreatedForTest = false
  let createdOrderId = ''
  let orderNumber = ''

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

  test('places online order, pays in P24 sandbox, and starts preparing in POS KDS', async ({ page, browser }) => {
    test.setTimeout(10 * 60_000)

    // 1) Provision delivery auth user (reuse if createUser is currently unavailable)
    const deliveryUser = await ensureDeliveryAuthUser(admin)
    deliveryUserId = deliveryUser.id
    deliveryUserEmail = deliveryUser.email
    deliveryUserCreatedForTest = deliveryUser.createdForTest
    await ensureCustomerProfile(admin, deliveryUser)

    // 2) Login in delivery and add product via UI (more robust than localStorage injection on hosted env)
    await loginDeliveryUser(page, deliveryUserEmail, SHARED_DELIVERY_PASSWORD)

    // Validate live menu endpoint/rendering first — prevents false green when menu is broken.
    await page.goto(`${DELIVERY_BASE_URL}/menu`, { timeout: 60_000 })
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({ timeout: 20_000 })

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

    // Add selected product through product page
    await page.goto(`${DELIVERY_BASE_URL}/product/${product!.id}`, { timeout: 60_000 })
    const addToCartButton = page.getByTestId('product-detail-add-to-cart')
    await expect(addToCartButton).toBeVisible({ timeout: 20_000 })
    await addToCartButton.click()
    await page.waitForURL(url => !url.pathname.includes('/product/'), { timeout: 20_000 })

    // Ensure checkout is reachable from cart (min order constraint safety-net)
    await page.goto(`${DELIVERY_BASE_URL}/cart`, { timeout: 60_000 })
    const checkoutLink = page.getByTestId('cart-checkout-link')
    await expect(checkoutLink).toBeVisible({ timeout: 15_000 })
    const checkoutHref = await checkoutLink.getAttribute('href')

    if (checkoutHref !== '/checkout') {
      await page.goto(`${DELIVERY_BASE_URL}/product/${product!.id}`, { timeout: 60_000 })
      await expect(addToCartButton).toBeVisible({ timeout: 20_000 })
      await addToCartButton.click()
      await page.waitForURL(url => !url.pathname.includes('/product/'), { timeout: 20_000 })
      await page.goto(`${DELIVERY_BASE_URL}/cart`, { timeout: 60_000 })
      await expect(checkoutLink).toHaveAttribute('href', '/checkout', { timeout: 15_000 })
    }

    // 3) Go through checkout with online payment
    await checkoutLink.click()
    await expect(page).toHaveURL(/\/checkout/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /PODSUMOWANIE/i })).toBeVisible({ timeout: 20_000 })

    await page.waitForFunction(() => {
      const input = document.getElementById('firstName') as HTMLInputElement | null
      return !!input && input.value.length > 0
    }, { timeout: 15_000 })

    await page.getByLabel('Imię').fill(DELIVERY_FIRST_NAME)
    await page.getByLabel('Nazwisko').fill(DELIVERY_LAST_NAME)
    await page.getByLabel('Email').fill(deliveryUserEmail)
    await page.getByLabel(/Numer telefonu|Telefon/i).fill('+48500777111')

    // Force online payment path to guarantee /api/payments/p24/register call.
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

    // First click may only submit contact form (requestSubmit), second click places order.
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

    // 4) Pay on P24 sandbox and return to order confirmation
    await completeP24SandboxPayment(page)

    await expect(page).toHaveURL(new RegExp(`/order-confirmation\\?orderId=${createdOrderId}`), { timeout: 60_000 })
    await expect(
      page.getByText('ZAMÓWIENIE ZŁOŻONE').or(page.getByText('OCZEKIWANIE NA PŁATNOŚĆ'))
    ).toBeVisible({ timeout: 20_000 })

    // 5) Verify webhook result in DB (paid + confirmed)
    const paidOrder = await waitForOrderState(
      admin,
      createdOrderId,
      { paymentStatus: 'paid', orderStatus: 'confirmed' },
      3 * 60_000
    )
    orderNumber = paidOrder.order_number as string
    expect(orderNumber).toMatch(/^WEB-/)
    const orderTotals = await getOrderTotals(admin, createdOrderId)
    const orderDisplayItems = await getOrderDisplayItems(admin, createdOrderId)
    expect(Math.abs(orderTotals.total - orderTotals.expectedGrossTotal)).toBeLessThan(0.01)

    // Customer-facing confirmation must reflect gross pricing contract.
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

    // 6) Wait for kitchen ticket
    const kitchenTicket = await waitForKitchenTicket(admin, createdOrderId, 90_000)
    expect(kitchenTicket.status).toBe('pending')

    // 7) Open POS KDS and start preparing from UI
    const posContext = await browser.newContext()
    const posPage = await posContext.newPage()

    await setGateCookie(posPage, POS_BASE_URL)
    await posPage.goto(`${POS_BASE_URL}/kitchen`, { timeout: 60_000 })
    await expect(posPage.locator('[data-page="kitchen-kds"]')).toBeVisible({ timeout: 15_000 })
    await expect(posPage.locator('[data-component="kds-board"]')).toBeVisible({ timeout: 15_000 })

    const ticketCards = posPage.locator(`[data-ticket-id="${kitchenTicket.id}"][data-status="pending"]`)
    await expect(ticketCards.first()).toBeVisible({ timeout: 30_000 })

    const ticketCard = ticketCards
      .filter({ has: posPage.locator('[data-action="start-preparing"]') })
      .first()

    const kitchenItems = Array.isArray(kitchenTicket.items)
      ? kitchenTicket.items as Array<Record<string, unknown>>
      : []
    for (const kitchenItem of kitchenItems) {
      const variantName = String(kitchenItem.variant_name || '').trim()
      const modifierNames = Array.isArray(kitchenItem.modifiers)
        ? kitchenItem.modifiers.map((name) => String(name || '').trim()).filter(Boolean)
        : []

      if (variantName) {
        await expect(ticketCard.getByText(`(${variantName})`).first()).toBeVisible({ timeout: 10_000 })
      }
      if (modifierNames.length > 0) {
        await expect(ticketCard.getByText(modifierNames.join(', ')).first()).toBeVisible({ timeout: 10_000 })
      }
    }

    await ticketCard.locator('[data-action="start-preparing"]').click()

    await expect(
      posPage.locator(`[data-ticket-id="${kitchenTicket.id}"][data-status="preparing"]`).first()
    ).toBeVisible({ timeout: 20_000 })

    // 7b) Verify POS totals from UI (with login fallback) or POS API.
    await posPage.goto(`${POS_BASE_URL}/orders/${createdOrderId}`, { timeout: 60_000 })

    if (new URL(posPage.url()).pathname.includes('/login')) {
      await ensurePosAuthUser(admin)
      await loginPosUser(posPage)
      await posPage.goto(`${POS_BASE_URL}/orders/${createdOrderId}`, { timeout: 60_000 })
    }

    const posDetailVisible = await posPage
      .locator('[data-page="order-detail"]')
      .first()
      .isVisible({ timeout: 20_000 })
      .catch(() => false)

    if (posDetailVisible) {
      for (const orderItem of orderDisplayItems) {
        await expect(posPage.getByText(orderItem.productName).first()).toBeVisible({ timeout: 10_000 })
        if (orderItem.variantName) {
          await expect(posPage.getByText(`(${orderItem.variantName})`).first()).toBeVisible({ timeout: 10_000 })
        }
        for (const modifierName of orderItem.modifierNames) {
          await expect(
            posPage.getByText(new RegExp(escapeRegExp(modifierName), 'i')).first()
          ).toBeVisible({ timeout: 10_000 })
        }
      }

      const readHasSummaryRows = async () => posPage
        .locator('span')
        .filter({ hasText: /^Suma czesciowa$|^VAT$|^Podatek VAT$|^Razem$|^Kwota brutto$|^Kwota netto$/ })
        .count()
        .then((count) => count >= 3)
        .catch(() => false)

      let hasSummaryRows = await readHasSummaryRows()
      if (!hasSummaryRows) {
        await ensurePosLocationSelected(posPage)
        hasSummaryRows = await readHasSummaryRows()
      }

      if (!hasSummaryRows) {
        const posOrder = await getPosOrderViaApi(createdOrderId)
        expect(posOrder).toBeTruthy()
        const posSubtotal = readNumber(posOrder?.subtotal)
        const posVat = readNumber(posOrder?.tax)
        const posTotal = readNumber(posOrder?.total)
        expect(Math.abs(posSubtotal - orderTotals.subtotal)).toBeLessThan(0.01)
        expect(Math.abs(posVat - orderTotals.tax)).toBeLessThan(0.01)
        expect(Math.abs(posTotal - orderTotals.total)).toBeLessThan(0.01)
        console.warn('[E2E] POS order detail opened but summary rows are unavailable (likely location context). Verified totals via POS API.')
      } else {
        const posSubtotalText = await readSummaryValueByLabels(posPage, ['Suma czesciowa'])
        const posVatText = await readSummaryValueByLabels(posPage, ['Podatek VAT', 'VAT'])
        const posTotalText = await readSummaryValueByLabels(posPage, ['Kwota brutto', 'Razem'])
        const posNetText = await readSummaryValueByLabels(posPage, ['Kwota netto', 'Netto'])

        expect(posSubtotalText).toBeTruthy()
        expect(posVatText).toBeTruthy()
        expect(posTotalText).toBeTruthy()
        expect(posNetText).toBeTruthy()

        const posSubtotalValue = parsePln(posSubtotalText!)
        const posVatValue = parsePln(posVatText!)
        const posTotalValue = parsePln(posTotalText!)
        const posNetValue = parsePln(posNetText!)
        expect(Math.abs(posSubtotalValue - orderTotals.subtotal)).toBeLessThan(0.01)
        expect(Math.abs(posVatValue - orderTotals.tax)).toBeLessThan(0.01)
        expect(Math.abs(posTotalValue - orderTotals.total)).toBeLessThan(0.01)
        expect(Math.abs(posNetValue - orderTotals.expectedNet)).toBeLessThan(0.01)
      }
    } else {
      const posOrder = await getPosOrderViaApi(createdOrderId)
      expect(posOrder).toBeTruthy()
      const posSubtotal = readNumber(posOrder?.subtotal)
      const posVat = readNumber(posOrder?.tax)
      const posTotal = readNumber(posOrder?.total)
      expect(Math.abs(posSubtotal - orderTotals.subtotal)).toBeLessThan(0.01)
      expect(Math.abs(posVat - orderTotals.tax)).toBeLessThan(0.01)
      expect(Math.abs(posTotal - orderTotals.total)).toBeLessThan(0.01)
      console.warn('[E2E] POS order detail UI unavailable; totals verified through POS API fallback.')
    }

    await posContext.close()

    // 8) Verify order status synced back to delivery order
    await waitForOrderState(
      admin,
      createdOrderId,
      { orderStatus: 'preparing' },
      90_000
    )

    // Optional UI assertion on confirmation step label becoming active
    await expect(page.locator('span', { hasText: 'W przygotowaniu' }).first()).toHaveClass(/text-primary/, {
      timeout: 30_000,
    })
  })
})
