/**
 * Shared helpers for sandbox E2E tests.
 *
 * Extracted from sandbox-cross-app-p24.spec.ts to enable reuse
 * across the P24 flow test and the lightweight smoke test.
 */
import { Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const SANDBOX_CONFIG = {
  deliveryBaseUrl: (
    process.env.E2E_DELIVERY_BASE_URL || 'https://order.mesofood.pl'
  ).replace(/\/+$/, ''),

  posBaseUrl: (
    process.env.E2E_POS_BASE_URL || 'https://pos.mesofood.pl'
  ).replace(/\/api\/v1\/?$/, '').replace(/\/+$/, ''),

  gatePassword: process.env.E2E_GATE_PASSWORD || 'TuJestMeso2026',

  p24Automate: process.env.E2E_P24_AUTOMATE !== '0',
  p24RedirectTimeoutMs: Number(process.env.E2E_P24_REDIRECT_TIMEOUT_MS || 300_000),

  deliveryEmail: process.env.E2E_DELIVERY_EMAIL || 'e2e-order-supabase@meso.dev',
  deliveryPassword: process.env.E2E_DELIVERY_PASSWORD || 'SandboxP24-test-123!',

  posTestEmail: process.env.E2E_POS_TEST_EMAIL || 'e2e-pos@meso.dev',
  posTestPassword: process.env.E2E_POS_TEST_PASSWORD || 'e2e-pos-password-123!',

  get posApiBaseUrl() {
    return (
      process.env.E2E_POS_API_URL || `${this.posBaseUrl}/api/v1`
    ).replace(/\/+$/, '')
  },

  posApiKey: process.env.POS_API_KEY || '',

  deliveryFirstName: 'E2E',
  deliveryLastName: 'Sandbox',
  deliveryPhone: '+48500777111',
} as const

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function readNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function roundCurrency(value: number): number {
  return Number(value.toFixed(2))
}

export function parsePln(valueText: string): number {
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

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ---------------------------------------------------------------------------
// Supabase admin client
// ---------------------------------------------------------------------------

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Page scraping
// ---------------------------------------------------------------------------

export async function readSummaryValueByLabel(page: Page, label: string): Promise<string | null> {
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

export async function readSummaryValueByLabels(page: Page, labels: string[]): Promise<string | null> {
  for (const label of labels) {
    const value = await readSummaryValueByLabel(page, label)
    if (value) return value
  }
  return null
}

// ---------------------------------------------------------------------------
// DB queries
// ---------------------------------------------------------------------------

export async function getOrderTotals(admin: SupabaseClient, orderId: string) {
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

  return { subtotal, tax, discount, deliveryFee, tip, total, expectedGrossTotal, expectedNet }
}

export type OrderDisplayItem = {
  productName: string
  variantName?: string
  modifierNames: string[]
}

export async function getOrderDisplayItems(admin: SupabaseClient, orderId: string): Promise<OrderDisplayItem[]> {
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

export async function waitForOrderState(
  admin: SupabaseClient,
  orderId: string,
  expected: { paymentStatus?: string; orderStatus?: string },
  timeoutMs: number,
) {
  const startedAt = Date.now()
  let lastPaymentStatus = '(unknown)'
  let lastOrderStatus = '(unknown)'

  while (true) {
    const { data, error } = await admin
      .from('orders_orders')
      .select('status, payment_status, order_number')
      .eq('id', orderId)
      .single()

    if (!error && data) {
      lastPaymentStatus = String(data.payment_status ?? '(null)')
      lastOrderStatus = String(data.status ?? '(null)')

      const paymentOk = expected.paymentStatus ? data.payment_status === expected.paymentStatus : true
      const orderOk = expected.orderStatus ? data.status === expected.orderStatus : true
      if (paymentOk && orderOk) {
        return data
      }
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timeout waiting for order ${orderId} -> ` +
        `payment_status=${expected.paymentStatus ?? '*'} (last: ${lastPaymentStatus}), ` +
        `status=${expected.orderStatus ?? '*'} (last: ${lastOrderStatus})`
      )
    }

    await new Promise(resolve => setTimeout(resolve, 5_000))
  }
}

export async function waitForKitchenTicket(admin: SupabaseClient, orderId: string, timeoutMs = 60_000) {
  const startedAt = Date.now()
  let lastError: string | null = null

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

    lastError = error?.message ?? (data ? null : 'no rows returned')

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timeout waiting for kitchen ticket for order ${orderId} ` +
        `(last: ${lastError ?? 'query returned no data'})`
      )
    }

    await new Promise(resolve => setTimeout(resolve, 3_000))
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function setGateCookie(page: Page, appUrl: string) {
  const parsed = new URL(appUrl)
  await page.context().addCookies([{
    name: 'meso_access',
    value: SANDBOX_CONFIG.gatePassword,
    domain: parsed.hostname,
    path: '/',
    secure: parsed.protocol === 'https:',
    httpOnly: false,
    sameSite: 'Lax',
  }])
}

export type DeliveryAuthUser = {
  id: string
  email: string
  createdForTest: boolean
}

export async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
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

export async function findReusableE2EUser(admin: SupabaseClient) {
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

export async function ensureDeliveryAuthUser(admin: SupabaseClient): Promise<DeliveryAuthUser> {
  const UNIQUE = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const FALLBACK_DELIVERY_EMAIL = `e2e-sandbox-${UNIQUE}@meso.dev`

  const existingPreferred = await findAuthUserByEmail(admin, SANDBOX_CONFIG.deliveryEmail)
  if (existingPreferred?.id && existingPreferred.email) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingPreferred.id, {
      password: SANDBOX_CONFIG.deliveryPassword,
      email_confirm: true,
      user_metadata: {
        ...(existingPreferred.user_metadata || {}),
        app_role: 'customer',
        first_name: SANDBOX_CONFIG.deliveryFirstName,
        last_name: SANDBOX_CONFIG.deliveryLastName,
      },
    })
    if (updateError) {
      throw new Error(`Failed to update shared delivery user: ${updateError.message}`)
    }
    return { id: existingPreferred.id, email: existingPreferred.email, createdForTest: false }
  }

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: FALLBACK_DELIVERY_EMAIL,
    password: SANDBOX_CONFIG.deliveryPassword,
    email_confirm: true,
    user_metadata: {
      app_role: 'customer',
      first_name: SANDBOX_CONFIG.deliveryFirstName,
      last_name: SANDBOX_CONFIG.deliveryLastName,
    },
  })
  if (!createError && createdUser.user?.id && createdUser.user.email) {
    return { id: createdUser.user.id, email: createdUser.user.email, createdForTest: true }
  }

  const reusable = await findReusableE2EUser(admin)
  if (reusable?.id && reusable.email) {
    const { error: updateError } = await admin.auth.admin.updateUserById(reusable.id, {
      password: SANDBOX_CONFIG.deliveryPassword,
      email_confirm: true,
      user_metadata: {
        ...(reusable.user_metadata || {}),
        app_role: 'customer',
        first_name: SANDBOX_CONFIG.deliveryFirstName,
        last_name: SANDBOX_CONFIG.deliveryLastName,
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

export async function ensureCustomerProfile(admin: SupabaseClient, user: DeliveryAuthUser) {
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
    first_name: SANDBOX_CONFIG.deliveryFirstName,
    last_name: SANDBOX_CONFIG.deliveryLastName,
    phone: SANDBOX_CONFIG.deliveryPhone,
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

export async function ensurePosAuthUser(admin: SupabaseClient) {
  for (let pg = 1; pg <= 10; pg++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 })
    if (error) throw new Error(`Failed to list POS auth users: ${error.message}`)
    const users = data?.users || []
    const existing = users.find((user) => (user.email || '').toLowerCase() === SANDBOX_CONFIG.posTestEmail.toLowerCase())
    if (existing?.id) {
      const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
        password: SANDBOX_CONFIG.posTestPassword,
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
    email: SANDBOX_CONFIG.posTestEmail,
    password: SANDBOX_CONFIG.posTestPassword,
    email_confirm: true,
    user_metadata: {
      app_role: 'cashier',
      first_name: 'E2E',
      last_name: 'POS',
    },
  })
  if (createError) throw new Error(`Failed to create POS auth user: ${createError.message}`)
}

export async function loginDeliveryUser(page: Page, email: string, password: string) {
  await setGateCookie(page, SANDBOX_CONFIG.deliveryBaseUrl)
  await page.goto(`${SANDBOX_CONFIG.deliveryBaseUrl}/login`, { timeout: 60_000 })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })
}

export async function loginPosUser(page: Page) {
  await setGateCookie(page, SANDBOX_CONFIG.posBaseUrl)
  await page.goto(`${SANDBOX_CONFIG.posBaseUrl}/login`, { timeout: 60_000 })

  const emailField = page.locator('[data-field="email"]').first()
  const passwordField = page.locator('[data-field="password"]').first()
  const loginButton = page.locator('[data-action="login-email"]').first()

  const hasCustomLoginFields = await emailField.isVisible().catch(() => false)
  if (hasCustomLoginFields) {
    await emailField.fill(SANDBOX_CONFIG.posTestEmail)
    await passwordField.fill(SANDBOX_CONFIG.posTestPassword)
    await loginButton.click()
  } else {
    await page.locator('input[type="email"]').first().fill(SANDBOX_CONFIG.posTestEmail)
    await page.locator('input[type="password"]').first().fill(SANDBOX_CONFIG.posTestPassword)
    await page.locator('button[type="submit"]').first().click()
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

export async function clickFirstVisible(page: Page, selectors: string[]) {
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

export async function clickFirstVisibleLocator(page: Page, locators: Array<ReturnType<Page['locator']>>) {
  for (const locator of locators) {
    const visible = await locator.first().isVisible().catch(() => false)
    if (visible) {
      await locator.first().click({ timeout: 5_000 })
      return true
    }
  }
  return false
}

export async function ensurePosLocationSelected(page: Page) {
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

// ---------------------------------------------------------------------------
// P24 sandbox payment
// ---------------------------------------------------------------------------

async function runP24BlikSandboxFlow(page: Page) {
  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /Rozumiem/i }),
    page.locator('button:has-text("Rozumiem")'),
  ])

  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /BLIK/i }),
    page.getByRole('tab', { name: /BLIK/i }),
    page.locator('button:has-text("BLIK")'),
  ])

  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /BLIK:\s*BLIK/i }),
    page.locator('button:has-text("BLIK: BLIK")'),
  ])

  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /Płacąc akceptujesz Regulamin/i }),
    page.locator('button:has-text("Płacąc akceptujesz Regulamin")'),
    page.getByRole('button', { name: /Zapłać|Zaplac|Płacę|Place/i }),
    page.locator('button:has-text("Zapłać"), button:has-text("Zaplac"), button:has-text("Płacę"), button:has-text("Place")'),
    page.locator('[type="submit"]'),
  ])

  await clickFirstVisibleLocator(page, [
    page.getByRole('button', { name: /Zapłacono|Zaplacono/i }),
    page.locator('button:has-text("Zapłacono"), button:has-text("Zaplacono")'),
    page.getByRole('button', { name: /Powrót do sklepu|Wróć do sklepu|Wroc do sklepu/i }),
    page.locator('button:has-text("Powrót do sklepu"), button:has-text("Wróć do sklepu"), button:has-text("Wroc do sklepu")'),
    page.getByRole('button', { name: /Potwierdź|Potwierdz|OK/i }),
    page.locator('button:has-text("Potwierdź"), button:has-text("Potwierdz"), button:has-text("OK")'),
  ])
}

export async function completeP24SandboxPayment(page: Page) {
  const { deliveryBaseUrl, p24Automate, p24RedirectTimeoutMs } = SANDBOX_CONFIG

  await page.waitForURL(url => /(^|\.)przelewy24\.pl$/i.test(url.hostname), { timeout: 60_000 })
  const returnUrlPredicate = (url: URL) => url.href.startsWith(`${deliveryBaseUrl}/order-confirmation?orderId=`)
  const deadline = Date.now() + p24RedirectTimeoutMs

  if (p24Automate) {
    while (Date.now() < deadline) {
      if (returnUrlPredicate(new URL(page.url()))) return
      try {
        await runP24BlikSandboxFlow(page)
        await clickFirstVisible(page, [
          'a:has-text("Zapłać"), a:has-text("Zaplac"), a:has-text("Płacę"), a:has-text("Place")',
        ])
        const redirected = await page.waitForURL(returnUrlPredicate, { timeout: 2_500 })
          .then(() => true)
          .catch(() => false)
        if (redirected) return
        await page.waitForTimeout(900)
      } catch (flowError) {
        await page.screenshot({ path: `test-results/p24-flow-error-${Date.now()}.png` }).catch(() => {})
        throw flowError
      }
    }
  }

  const remaining = Math.max(1, deadline - Date.now())
  await page.waitForURL(returnUrlPredicate, { timeout: remaining })
}

// ---------------------------------------------------------------------------
// POS API
// ---------------------------------------------------------------------------

export async function getPosOrderViaApi(orderId: string): Promise<Record<string, unknown> | null> {
  if (!SANDBOX_CONFIG.posApiKey) {
    console.warn('[E2E] POS_API_KEY missing, cannot verify POS totals via API fallback.')
    return null
  }

  let response: Response
  try {
    response = await fetch(`${SANDBOX_CONFIG.posApiBaseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SANDBOX_CONFIG.posApiKey,
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
