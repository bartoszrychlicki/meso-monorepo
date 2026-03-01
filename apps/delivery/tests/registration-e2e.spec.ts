/**
 * E2E Test: Registration Flow
 *
 * Tests:
 * - DB trigger creates crm_customers + 50pt bonus on new user signup
 * - Registration page renders all expected fields
 * - Duplicate user does not get extra bonus points
 *
 * URUCHOMIENIE:
 *   npx playwright test registration-e2e --headed
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
const TEST_EMAIL = `e2e-register-${UNIQUE_SUFFIX}@meso.dev`

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
// Tests (serial — Test 3 depends on Test 1 having registered)
// ──────────────────────────────────────────────────────────

test.describe.serial('Registration Flow', () => {
  let admin: SupabaseClient
  let testUserId: string

  test.beforeAll(async () => {
    admin = getAdminClient()

    // Pre-cleanup: remove any leftover test users from previous runs
    const { data: { users } } = await admin.auth.admin.listUsers()
    const staleUsers = users?.filter(u => u.email?.includes('e2e-register-')) || []
    for (const u of staleUsers) {
      await admin.from('crm_loyalty_transactions').delete().eq('customer_id', u.id)
      await admin.from('crm_customers').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  })

  test.afterAll(async () => {
    // Cleanup all test users created during this run
    const { data: { users } } = await admin.auth.admin.listUsers()
    const testUsers = users?.filter(u => u.email?.includes('e2e-register-')) || []
    for (const u of testUsers) {
      await admin.from('crm_loyalty_transactions').delete().eq('customer_id', u.id)
      await admin.from('crm_customers').delete().eq('id', u.id)
      await admin.auth.admin.deleteUser(u.id)
    }
  })

  // ──────────────────────────────────────────────────────
  // TEST 1: Registration trigger awards 50 points
  // Uses admin API to bypass email rate limits while still
  // testing the DB trigger (handle_new_delivery_customer)
  // ──────────────────────────────────────────────────────
  test('registration awards 50 loyalty points', async () => {
    // Create user via admin API with customer metadata — this triggers
    // handle_new_delivery_customer just like a real signUp would
    const { data, error: createError } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: 'TestRegister123!',
      email_confirm: true,
      user_metadata: {
        app_role: 'customer',
        first_name: 'E2ERegister',
        last_name: 'TestSurname',
        marketing_consent: false,
      },
    })

    expect(createError, `User creation failed: ${createError?.message}`).toBeNull()
    testUserId = data.user!.id

    // Wait for trigger to complete
    await new Promise(r => setTimeout(r, 1000))

    // Verify the customer record was created with 50 bonus points
    const { data: customer, error: custError } = await admin
      .from('crm_customers')
      .select('id, email, loyalty_points, lifetime_points')
      .eq('id', testUserId)
      .single()

    expect(custError, `Customer query failed: ${custError?.message}`).toBeNull()
    expect(customer).not.toBeNull()
    expect(customer!.email).toBe(TEST_EMAIL)
    expect(customer!.loyalty_points).toBe(50)
    expect(customer!.lifetime_points).toBe(50)

    // Verify loyalty_history has the registration bonus entry
    const { data: history, error: histError } = await admin
      .from('crm_loyalty_transactions')
      .select('description, amount, reason')
      .eq('customer_id', customer!.id)
      .eq('reason', 'bonus')

    expect(histError, `Transaction query failed: ${histError?.message}`).toBeNull()
    expect(history).not.toBeNull()
    expect(history!.length).toBeGreaterThanOrEqual(1)

    const bonusEntry = history!.find(h => h.description === 'Bonus rejestracyjny')
    expect(bonusEntry).toBeTruthy()
    expect(bonusEntry!.amount).toBe(50)
    expect(bonusEntry!.reason).toBe('bonus')

    console.log(`Registration successful: ${TEST_EMAIL}, points: ${customer!.loyalty_points}`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 2: Registration page renders correctly
  // ──────────────────────────────────────────────────────
  test('registration page renders all expected fields', async ({ page }) => {
    await bypassGate(page)
    await page.goto('/register')

    // Name inputs
    await expect(page.locator('input[placeholder="Imię"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input[placeholder="Nazwisko"]')).toBeVisible()

    // Email input
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible()

    // Password inputs
    await expect(page.locator('input[placeholder="Hasło (min. 8 znaków)"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Powtórz hasło"]')).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: 'ZAREJESTRUJ' })).toBeVisible()

    // Referral phone field
    await expect(page.locator('input[placeholder*="polecając"]')).toBeVisible()

    // Marketing consent checkbox
    await expect(page.locator('#marketingConsent')).toBeVisible()

    // Login link ("Zaloguj się")
    await expect(page.getByRole('link', { name: 'Zaloguj się' })).toBeVisible()

    console.log('Registration page renders all expected fields correctly')
  })

  // ──────────────────────────────────────────────────────
  // TEST 3: Duplicate user does not get extra bonus
  // (depends on Test 1 having created the user)
  // ──────────────────────────────────────────────────────
  test('duplicate user creation does not grant extra bonus points', async () => {
    // Try to create the same user again via admin API
    const { error: dupeError } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: 'TestRegister123!',
      email_confirm: true,
      user_metadata: {
        app_role: 'customer',
        first_name: 'Duplicate',
        last_name: 'Attempt',
      },
    })

    // Should fail with "already registered" error
    expect(dupeError).not.toBeNull()

    // The key assertion: the original customer should still have exactly 50 points
    const { data: customer } = await admin
      .from('crm_customers')
      .select('loyalty_points')
      .eq('email', TEST_EMAIL)
      .single()

    expect(customer).not.toBeNull()
    expect(customer!.loyalty_points).toBe(50)

    console.log('Duplicate user correctly did not grant extra bonus points')
  })
})
