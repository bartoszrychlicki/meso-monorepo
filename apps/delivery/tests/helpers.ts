import { expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Test user credentials ───────────────────────────────
const TEST_EMAIL = 'e2e-test@meso.dev'
const TEST_PASSWORD = 'e2e-test-password-123!'
const GATE_PASSWORD = 'TuJestMeso2026'

/**
 * Bypass the password gate by setting the meso_access cookie.
 * Must be called before navigating to any app page.
 */
export async function bypassGate(page: Page) {
  await page.context().addCookies([{
    name: 'meso_access',
    value: GATE_PASSWORD,
    domain: 'localhost',
    path: '/',
  }])
}

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Ensure a permanent test user exists and log them in via the UI.
 * Idempotent — creates the user only if it doesn't already exist.
 */
export async function loginTestUser(page: Page) {
  const admin = getAdminClient()

  // Ensure user exists
  const { data: { users } } = await admin.auth.admin.listUsers()
  const existing = users?.find(u => u.email === TEST_EMAIL)

  let userId: string

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })

    if (error) {
      // User may exist but wasn't in the first page of listUsers() (paginated).
      // If "already registered", that's fine — we just need to log in.
      if (!error.message.includes('already been registered')) {
        throw new Error(`Failed to create test user: ${error.message}`)
      }
    } else {
      userId = data.user.id
    }
  } else {
    userId = existing.id
  }

  // Always ensure crm_customers record exists (trigger may not have fired for admin-created users)
  if (userId!) {
    await admin.from('crm_customers').upsert({
      id: userId,
      auth_id: userId,
      email: TEST_EMAIL,
      first_name: 'E2E',
      last_name: 'Test',
      phone: '+48500100200',
      registration_date: new Date().toISOString(),
      source: 'web',
      loyalty_points: 0,
      loyalty_tier: 'bronze',
      is_active: true,
    }, { onConflict: 'id' })
  }

  // Bypass gate and log in via the login page
  await bypassGate(page)
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })
}

export async function gotoMenu(page: Page) {
  await bypassGate(page)
  await page.goto('/menu')
  await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({
    timeout: 20_000,
  })
}

export async function addFirstProductToCart(page: Page) {
  await gotoMenu(page)

  const firstProductLink = page.locator('a[href^="/product/"]').first()
  await expect(firstProductLink).toBeVisible()
  await firstProductLink.click()

  await expect(page).toHaveURL(/\/product\/[^/?#]+/)
  const addToCartButton = page.getByTestId('product-detail-add-to-cart')
  await expect(addToCartButton).toBeVisible()
  await addToCartButton.click()

  await page.waitForURL((url) => !url.pathname.includes('/product/'), {
    timeout: 15_000,
  })
}

export async function ensureCheckoutIsAvailable(page: Page, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.goto('/cart')

    const checkoutLink = page.getByTestId('cart-checkout-link')
    if ((await checkoutLink.count()) > 0) {
      const href = await checkoutLink.getAttribute('href')
      if (href === '/checkout') {
        return
      }
    }

    await addFirstProductToCart(page)
  }

  await page.goto('/cart')
  const checkoutLink = page.getByTestId('cart-checkout-link')
  await expect(checkoutLink).toBeVisible()
  await expect(checkoutLink).toHaveAttribute('href', '/checkout')
}

export async function fillCheckoutContactForm(page: Page) {
  await expect(page.getByRole('heading', { name: /PODSUMOWANIE/i })).toBeVisible()

  // Wait for profile data to load and populate the form (ContactForm re-mounts on profileLoaded)
  await page.waitForFunction(() => {
    const el = document.getElementById('firstName') as HTMLInputElement
    return el && el.value.length > 0
  }, { timeout: 10_000 })

  await page.getByLabel('Imię').fill('Test')
  await page.getByLabel('Nazwisko').fill('Playwright')
  await page.getByLabel('Email').fill('e2e-test@meso.dev')
  await page.getByLabel(/Numer telefonu|Telefon/).fill('500100100')
}

export async function acceptTerms(page: Page) {
  const termsCheckbox = page.getByTestId('terms-acceptance')
  await expect(termsCheckbox).toBeVisible()
  if (!(await termsCheckbox.isChecked())) {
    await termsCheckbox.click()
  }
  await expect(termsCheckbox).toBeChecked()
}

// ─── POS test user credentials ──────────────────────────
const POS_TEST_EMAIL = 'e2e-pos@meso.dev'
const POS_TEST_PASSWORD = 'e2e-pos-password-123!'

/**
 * Ensure a POS operator test user exists and log them in via the POS UI.
 * Idempotent — creates the user only if it doesn't already exist.
 * The page's baseURL must be set to POS (http://localhost:3000).
 */
export async function loginPosUser(page: Page) {
  const admin = getAdminClient()

  const { data: { users } } = await admin.auth.admin.listUsers()
  const existing = users?.find(u => u.email === POS_TEST_EMAIL)

  let userId: string | undefined

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: POS_TEST_EMAIL,
      password: POS_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        app_role: 'cashier',
        first_name: 'E2E',
        last_name: 'POS',
      },
    })
    if (error && !error.message.includes('already been registered')) {
      throw new Error(`Failed to create POS test user: ${error.message}`)
    }
    userId = data?.user?.id
  } else {
    userId = existing.id
  }

  // Ensure users_users record exists so RLS is_staff() check passes
  if (userId) {
    await admin.from('users_users').upsert({
      id: userId,
      email: POS_TEST_EMAIL,
      name: 'E2E POS',
      role: 'cashier',
      is_active: true,
    }, { onConflict: 'id' })
  }

  await page.goto('http://localhost:3000/login', { timeout: 60_000 })
  await page.locator('[data-field="email"]').fill(POS_TEST_EMAIL)
  await page.locator('[data-field="password"]').fill(POS_TEST_PASSWORD)
  await page.locator('[data-action="login-email"]').click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })
}

/**
 * Call the POS REST API with an API key.
 */
export async function posApi(path: string, method: string, body?: Record<string, unknown>) {
  const POS_BASE_URL = process.env.POS_API_URL || 'http://localhost:3000'
  const POS_API_URL = `${POS_BASE_URL.replace(/\/api\/v1\/?$/, '')}/api/v1`
  const POS_API_KEY = process.env.POS_API_KEY || 'meso_k1_iKFzaJkxfHEwTnK4e19fOqh4sbRyN2_gjcpn8YrRGwE'

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
