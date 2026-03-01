/**
 * E2E Test: Password Reset Flow
 *
 * Tests the password reset UI and flow:
 * 1. Forgot password page sends reset email (UI)
 * 2. Reset password page shows expired message without session
 * 3. Reset password form accessible with valid recovery session (cookie injection)
 * 4. Password change via admin API + login with new password
 *
 * Strategy: Since Supabase auth sessions from REST API /verify don't carry
 * the recovery AMR needed for updateUser(), we test session detection via
 * cookie injection (test 3) and actual password change via admin API (test 4).
 *
 * URUCHOMIENIE:
 *   npx playwright test password-reset-e2e --headed
 *
 * WYMAGANIA:
 *   - .env.local z NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Działający serwer dev (uruchamiany automatycznie przez playwright.config.ts)
 */

import { test, expect } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { bypassGate } from './helpers'

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const UNIQUE_SUFFIX = Date.now()
const TEST_EMAIL = `e2e-pwreset-${UNIQUE_SUFFIX}@meso.dev`
const INITIAL_PASSWORD = 'InitialPass123!'
const NEW_PASSWORD = 'NewSecurePass456!'

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

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY')
  }
  return key
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  return url
}

// ──────────────────────────────────────────────────────────
// Tests (serial — tests depend on each other)
// ──────────────────────────────────────────────────────────

test.describe.serial('Password Reset Flow', () => {
  let admin: SupabaseClient
  let testUserId: string

  test.beforeAll(async () => {
    admin = getAdminClient()

    // Pre-cleanup: remove any leftover test users from previous runs
    const { data: { users } } = await admin.auth.admin.listUsers()
    const staleUsers = users?.filter(u => u.email?.includes('e2e-pwreset-')) || []
    for (const u of staleUsers) {
      await admin.from('crm_customers').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }

    // Create test user with confirmed email
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
      email_confirm: true,
    })
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`)
    }
    testUserId = data.user.id

    console.log(`Created test user: ${TEST_EMAIL} (${testUserId})`)
  })

  test.afterAll(async () => {
    // Cleanup all test users created during this run
    const { data: { users } } = await admin.auth.admin.listUsers()
    const testUsers = users?.filter(u => u.email?.includes('e2e-pwreset-')) || []
    for (const u of testUsers) {
      await admin.from('crm_customers').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
    console.log(`Cleaned up ${testUsers.length} test user(s)`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 1: Forgot password page sends email
  // ──────────────────────────────────────────────────────
  test('forgot password page sends reset email and shows success UI', async ({ page }) => {
    await bypassGate(page)
    await page.goto('/forgot-password')

    // Verify the page renders correctly
    await expect(page.getByText('Zapomniałeś hasła?')).toBeVisible({ timeout: 15_000 })

    // Fill in the email
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()
    await emailInput.fill(TEST_EMAIL)

    // Submit the form
    await page.getByRole('button', { name: 'Wyślij link resetujący' }).click()

    // Verify success UI shows
    await expect(page.getByText('Sprawdź email')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(TEST_EMAIL)).toBeVisible()

    console.log('Forgot password page sent reset email successfully')
  })

  // ──────────────────────────────────────────────────────
  // TEST 2: Reset password page shows expired link without session
  // ──────────────────────────────────────────────────────
  test('reset password page shows expired message without session', async ({ page }) => {
    await bypassGate(page)
    await page.goto('/reset-password?recovery=1')

    // Wait for session check to complete and show the expired link message
    await expect(page.getByText('Link wygasł')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Ten link do resetu hasła jest nieważny lub wygasł.')).toBeVisible()

    // Verify there's a link to request a new one
    await expect(page.getByRole('button', { name: 'Wyślij nowy link' })).toBeVisible()

    console.log('Reset password page correctly shows expired link without session')
  })

  // ──────────────────────────────────────────────────────
  // TEST 3: Reset password form accessible with valid recovery session
  // ──────────────────────────────────────────────────────
  test('reset password form shows with valid recovery session', async ({ page }) => {
    const supabaseUrl = getSupabaseUrl()
    const anonKey = getAnonKey()

    // Generate recovery OTP via admin API
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: TEST_EMAIL,
    })

    expect(linkError).toBeNull()
    if (!linkData?.properties) throw new Error('generateLink returned null data or properties')
    const otp = linkData.properties.email_otp

    // Exchange OTP for a session via Supabase verify endpoint (from Node.js)
    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({
        type: 'recovery',
        token: otp,
        email: TEST_EMAIL,
      }),
    })

    expect(verifyRes.ok).toBe(true)
    const session = await verifyRes.json()
    expect(session.access_token).toBeTruthy()

    // Inject session into cookies (@supabase/ssr's createBrowserClient uses cookies)
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    const cookieName = `sb-${projectRef}-auth-token`
    const sessionJson = JSON.stringify({
      access_token: session.access_token,
      token_type: 'bearer',
      expires_in: session.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
      refresh_token: session.refresh_token,
      user: session.user,
    })

    // Navigate first to set cookie origin
    await bypassGate(page)
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // Set session cookie via document.cookie (matching @supabase/ssr's format)
    await page.evaluate(({ name, value }: { name: string; value: string }) => {
      // Clear existing session cookies
      document.cookie.split(';').forEach(c => {
        const cName = c.trim().split('=')[0]
        if (cName === name || cName.startsWith(`${name}.`)) {
          document.cookie = `${cName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
        }
      })
      // Chunk and write (3180 char chunks matching @supabase/ssr)
      const CHUNK_SIZE = 3180
      const chunks: string[] = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }
      if (chunks.length === 1) {
        document.cookie = `${name}=${encodeURIComponent(chunks[0])}; path=/; max-age=3600; SameSite=Lax`
      } else {
        chunks.forEach((chunk, i) => {
          document.cookie = `${name}.${i}=${encodeURIComponent(chunk)}; path=/; max-age=3600; SameSite=Lax`
        })
      }
    }, { name: cookieName, value: sessionJson })

    // Navigate to reset password page
    await page.goto('/reset-password?recovery=1')

    // Verify the form shows (session detected) — NOT the "expired" message
    await expect(page.getByText('Ustaw nowe hasło')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zmień hasło' })).toBeEnabled()

    console.log('Reset password form correctly accessible with valid recovery session')
  })

  // ──────────────────────────────────────────────────────
  // TEST 4: Password change and login with new password
  // ──────────────────────────────────────────────────────
  test('login with new password after admin password change', async ({ page }) => {
    // Change password via admin API (bypasses need for recovery session in browser)
    const { error: updateError } = await admin.auth.admin.updateUserById(testUserId, {
      password: NEW_PASSWORD,
    })
    expect(updateError).toBeNull()

    // Log in with the new password
    await bypassGate(page)
    await page.goto('/login')

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 })

    await page.locator('input[type="email"]').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').fill(NEW_PASSWORD)
    await page.locator('button[type="submit"]').click()

    // Verify redirect away from /login (successful login)
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })

    console.log(`Login with new password successful for ${TEST_EMAIL}`)
  })
})
