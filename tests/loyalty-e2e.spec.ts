/**
 * E2E Test: Loyalty Program
 *
 * Tests the MESO Club loyalty program features:
 * - Rewards page display and coupon activation
 * - Active coupon blocking further activations
 * - Loyalty coupon display in cart
 * - Loyalty history tab
 * - Registration referral field
 * - Coupon sync on cart page load
 * - Used coupon lazy cleanup (full lifecycle)
 * - Points cost visibility on reward cards
 * - Tier emblem rendering
 *
 * URUCHOMIENIE:
 *   npx playwright test loyalty-e2e --headed
 *
 * WYMAGANIA:
 *   - .env.local z NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Działający serwer dev (uruchamiany automatycznie przez playwright.config.ts)
 *   - Przynajmniej jedna aktywna nagroda w loyalty_rewards
 */

import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { bypassGate } from './helpers'

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const TEST_EMAIL = 'e2e-loyalty@meso.dev'
const TEST_PASSWORD = 'e2e-loyalty-test-123!'

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

async function ensureLoyaltyTestUser(admin: SupabaseClient): Promise<string> {
  let userId: string

  // Try to create user first; if already exists, look it up
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })

  if (created?.user) {
    userId = created.user.id
  } else if (createError?.message?.includes('already been registered')) {
    // User exists — find by email (paginate through all users if needed)
    let page = 1
    let found: string | null = null
    while (!found) {
      const { data: { users } } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      const match = users?.find(u => u.email === TEST_EMAIL)
      if (match) { found = match.id; break }
      if (!users || users.length < 1000) break
      page++
    }
    if (!found) throw new Error('User exists but could not be found via listUsers')
    userId = found
  } else {
    throw new Error(`Failed to create test user: ${createError?.message}`)
  }

  // Set up customer with loyalty points
  await admin.from('crm_customers').upsert({
    id: userId,
    auth_id: userId,
    email: TEST_EMAIL,
    first_name: 'E2E',
    last_name: 'Loyalty',
    phone: '+48500200300',
    registration_date: new Date().toISOString(),
    source: 'web',
    loyalty_points: 500,
    loyalty_tier: 'silver',
    lifetime_points: 500,
    is_active: true,
  }, { onConflict: 'id' })

  // Clean up any existing coupons
  await admin.from('crm_customer_coupons').delete().eq('customer_id', userId)

  return userId
}

/**
 * Ensure at least one active loyalty reward exists in the DB.
 * Returns the reward row (id, name, points_cost, reward_type).
 */
async function ensureActiveReward(admin: SupabaseClient) {
  const { data: rewards } = await admin
    .from('crm_loyalty_rewards')
    .select('id, name, points_cost, reward_type, min_tier')
    .eq('is_active', true)
    .order('points_cost', { ascending: true })
    .limit(5)

  if (rewards && rewards.length > 0) {
    return rewards
  }

  // Create a test reward if none exist
  const { data: created, error } = await admin
    .from('crm_loyalty_rewards')
    .insert({
      name: 'Darmowa dostawa (test)',
      description: 'Kupon na darmową dostawę',
      points_cost: 100,
      reward_type: 'free_delivery',
      icon: '🚚',
      sort_order: 0,
      is_active: true,
      min_tier: 'bronze',
    })
    .select()

  if (error) throw new Error(`Failed to create test reward: ${error.message}`)
  return created!
}

async function loginLoyaltyUser(page: Page) {
  await bypassGate(page)
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 })
}

// ──────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────

test.describe('Loyalty Program', () => {
  // Loyalty tests need longer timeouts for login + API calls
  test.setTimeout(90_000)
  // Run serially: tests share DB state (same user, coupons, points)
  test.describe.configure({ mode: 'serial' })

  let admin: SupabaseClient
  let testUserId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let availableRewards: any[]

  test.beforeAll(async () => {
    admin = getAdminClient()
    testUserId = await ensureLoyaltyTestUser(admin)
    availableRewards = await ensureActiveReward(admin)
  })

  test.afterAll(async () => {
    // Cleanup test data
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    await admin.from('crm_loyalty_transactions').delete().eq('customer_id', testUserId)

    // Restore points to original state for re-runs
    await admin.from('crm_customers').update({
      loyalty_points: 500,
      loyalty_tier: 'silver',
      lifetime_points: 500,
    }).eq('id', testUserId)
  })

  // ──────────────────────────────────────────────────────
  // TEST 1: MESO Club page shows rewards and allows coupon activation
  // ──────────────────────────────────────────────────────
  test('MESO Club page shows rewards and allows coupon activation', async ({ page }) => {
    // Ensure clean state: 500 points, no active coupons
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    await admin.from('crm_customers').update({
      loyalty_points: 500,
      loyalty_tier: 'silver',
    }).eq('id', testUserId)

    await loginLoyaltyUser(page)
    await page.goto('/loyalty')

    // Verify rewards tab is visible (wait for data to load)
    await expect(page.getByRole('button', { name: 'Nagrody' })).toBeVisible({ timeout: 15_000 })

    // Should show at least one reward
    const rewardCards = page.locator('.space-y-3 > div')
    await expect(rewardCards.first()).toBeVisible({ timeout: 10_000 })

    // Find an affordable reward and click "Aktywuj"
    const activateButton = page.getByRole('button', { name: 'Aktywuj' }).first()
    await expect(activateButton).toBeVisible({ timeout: 10_000 })
    await activateButton.click()

    // Verify confirmation modal appears
    await expect(page.getByText('Aktywujesz kupon')).toBeVisible({ timeout: 5_000 })
    // Verify point cost is shown in the confirmation modal
    await expect(page.getByText(/\d+ pkt/).first()).toBeVisible()
    // Verify warning about non-refundable points
    await expect(page.getByText(/Punkty nie podlegają zwrotowi/)).toBeVisible()

    // Click "Potwierdzam" to activate and wait for API response
    const [activateResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/loyalty/activate-coupon'), { timeout: 30_000 }),
      page.getByRole('button', { name: 'Potwierdzam' }).click(),
    ])
    const activateData = await activateResp.json()
    console.log('Activate coupon API response:', activateResp.status(), JSON.stringify(activateData))

    // Verify success toast appears (API call creates coupon, deducts points, logs transaction)
    await expect(page.getByText(/Aktywowano kupon/).first()).toBeVisible({ timeout: 20_000 })

    // Verify the active coupon banner now shows
    await expect(page.getByText('Masz aktywny kupon')).toBeVisible({ timeout: 15_000 })

    // Verify points decreased in DB
    const { data: customer } = await admin
      .from('crm_customers')
      .select('loyalty_points')
      .eq('id', testUserId)
      .single()
    expect(customer!.loyalty_points).toBeLessThan(500)

    console.log(`Points after activation: ${customer!.loyalty_points}`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 2: Active coupon blocks further activation
  // ──────────────────────────────────────────────────────
  test('active coupon blocks further activation', async ({ page }) => {
    // Ensure user has an active coupon via admin client
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    await admin.from('crm_customer_coupons').insert({
      customer_id: testUserId,

      code: 'MESO-TEST1',
      coupon_type: availableRewards[0].reward_type,
      discount_value: availableRewards[0].reward_type === 'discount' ? 10 : null,
      status: 'active',
      points_spent: availableRewards[0].points_cost,
      source: 'reward',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    await loginLoyaltyUser(page)

    // Navigate to /loyalty and wait for the active-coupon API to respond
    const [couponResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/loyalty/active-coupon'), { timeout: 30_000 }),
      page.goto('/loyalty'),
    ])
    const couponData = await couponResponse.json()
    console.log('Active coupon API response:', JSON.stringify(couponData))

    // Wait for page to load
    await expect(page.getByRole('button', { name: 'Nagrody' })).toBeVisible({ timeout: 15_000 })

    // Verify info banner about active coupon is shown
    await expect(page.getByText('Masz aktywny kupon')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Użyj go lub poczekaj/)).toBeVisible()

    // Verify "Aktywuj" buttons are NOT visible (replaced by point cost text)
    const activateButtons = page.getByRole('button', { name: 'Aktywuj' })
    await expect(activateButtons).toHaveCount(0)

    console.log('Active coupon correctly blocks further activation')
  })

  // ──────────────────────────────────────────────────────
  // TEST 3: Loyalty coupon appears in cart
  // ──────────────────────────────────────────────────────
  test('loyalty coupon appears in cart', async ({ page }) => {
    // Create active coupon for user via admin client
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    const { data: coupon } = await admin.from('crm_customer_coupons').insert({
      customer_id: testUserId,

      code: 'MESO-CART1',
      coupon_type: 'free_delivery',
      status: 'active',
      points_spent: 100,
      source: 'reward',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()

    await loginLoyaltyUser(page)

    // Set the coupon in cart store via page.evaluate
    await page.goto('/')
    await page.evaluate((couponData) => {
      // Access Zustand store from window
      const cartKey = 'meso-cart'
      const stored = localStorage.getItem(cartKey)
      const parsed = stored ? JSON.parse(stored) : { state: {}, version: 0 }
      parsed.state = {
        ...parsed.state,
        loyaltyCoupon: couponData,
      }
      localStorage.setItem(cartKey, JSON.stringify(parsed))
    }, {
      id: coupon!.id,
      code: coupon!.code,
      coupon_type: coupon!.coupon_type,
      discount_value: coupon!.discount_value,
      free_product_name: coupon!.free_product_name,
      expires_at: coupon!.expires_at,
    })

    // Add a product to cart so the cart page is not empty
    await page.goto('/menu')
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({ timeout: 20_000 })
    await page.locator('a[href^="/product/"]').first().click()
    await expect(page).toHaveURL(/\/product\/[^/?#]+/)
    const addBtn = page.getByTestId('product-detail-add-to-cart')
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await page.waitForURL(url => !url.pathname.includes('/product/'), { timeout: 15_000 })

    // Navigate to cart
    await page.goto('/cart')

    // Verify coupon display shows with gold border (loyalty coupon style)
    const couponDisplay = page.getByText(`Kupon: ${coupon!.code}`)
    await expect(couponDisplay).toBeVisible({ timeout: 10_000 })

    // Verify coupon type description
    await expect(page.getByText('Darmowa dostawa')).toBeVisible()

    // Verify the promo code input is replaced by coupon display
    // (when loyaltyCoupon is set, PromoCodeInput renders the coupon display instead)
    const promoInput = page.locator('input[placeholder="Kod promocyjny"]')
    await expect(promoInput).toHaveCount(0)

    console.log(`Coupon ${coupon!.code} correctly displayed in cart`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 4: Loyalty history page shows entries
  // ──────────────────────────────────────────────────────
  test('loyalty history page shows entries', async ({ page }) => {
    // Insert some crm_loyalty_transactions entries for user via admin client
    await admin.from('crm_loyalty_transactions').delete().eq('customer_id', testUserId)
    await admin.from('crm_loyalty_transactions').insert([
      {
        customer_id: testUserId,
        description: 'Bonus rejestracyjny',
        amount: 50,
        reason: 'bonus',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        customer_id: testUserId,
        description: 'Zamowienie #1234',
        amount: 45,
        reason: 'earned',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        customer_id: testUserId,
        description: 'Kupon: Darmowa dostawa',
        amount: -100,
        reason: 'spent',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])

    await loginLoyaltyUser(page)
    await page.goto('/loyalty')

    // Wait for page to load
    await expect(page.getByText('Aktualnie dostępne punkty')).toBeVisible({ timeout: 15_000 })

    // Verify loyalty summary is visible on the points page (regression: tiers disappeared / confusing labels)
    await expect(page.getByText(/Poziom:\s*Srebrny/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Aktualnie dostępne punkty')).toBeVisible()
    await expect(page.getByText(/Do poziomu liczymy łącznie zdobyte punkty:\s*500 pkt/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Informacja o poziomach MESO Club' })).toBeVisible()

    // Rewards CTA on /loyalty must have direct "Aktywuj" button (consolidated from /account/club)
    const activateButton = page.getByRole('button', { name: 'Aktywuj' }).first()
    await expect(activateButton).toBeVisible()

    // Switch to history tab
    const historyTab = page.getByRole('button', { name: 'Historia' })
    await expect(historyTab).toBeVisible()
    await historyTab.click()

    // Verify history entries are visible (allow more time for API response)
    await expect(page.getByText('Bonus rejestracyjny')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Zamowienie #1234')).toBeVisible()
    await expect(page.getByText('Kupon: Darmowa dostawa')).toBeVisible()

    // Verify points values are shown
    await expect(page.getByText('+50 pkt')).toBeVisible()
    await expect(page.getByText('+45 pkt')).toBeVisible()
    await expect(page.getByText('-100 pkt')).toBeVisible()

    // Verify dates are shown (Polish date format)
    const datePattern = /\d{1,2}\.\d{1,2}\.\d{4}/
    const historyEntries = page.locator('.border-b.border-white\\/5')
    const firstEntry = historyEntries.first()
    await expect(firstEntry).toBeVisible()
    await expect(firstEntry.locator('p').last()).toHaveText(datePattern)

    console.log('Loyalty history entries correctly displayed')
  })

  // ──────────────────────────────────────────────────────
  // TEST 5: Registration page has referral phone field
  // ──────────────────────────────────────────────────────
  test('registration page has referral phone field', async ({ page }) => {
    await bypassGate(page)
    await page.goto('/register')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /ZAREJESTRUJ/i })).toBeVisible({ timeout: 15_000 })

    // Verify referral phone input is visible
    const referralInput = page.locator('input[placeholder*="polecając"]')
    await expect(referralInput).toBeVisible()

    // Verify helper text about Gyoza coupon
    await expect(page.getByText(/kupon powitalny.*Gyoza|darmowe Gyoza/i)).toBeVisible()

    console.log('Referral phone field correctly displayed on registration page')
  })

  // ──────────────────────────────────────────────────────
  // TEST 6: Coupon syncs on cart page load
  // ──────────────────────────────────────────────────────
  test('coupon syncs from DB on cart page load', async ({ page }) => {
    // Create active coupon via admin client
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    const { data: coupon } = await admin.from('crm_customer_coupons').insert({
      customer_id: testUserId,

      code: 'MESO-SYNC1',
      coupon_type: 'free_delivery',
      status: 'active',
      points_spent: 100,
      source: 'reward',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()

    await loginLoyaltyUser(page)

    // Ensure the cart store does NOT have the coupon (clear localStorage coupon data)
    await page.goto('/')
    await page.evaluate(() => {
      const cartKey = 'meso-cart'
      const stored = localStorage.getItem(cartKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.state) {
          delete parsed.state.loyaltyCoupon
        }
        localStorage.setItem(cartKey, JSON.stringify(parsed))
      }
    })

    // Add a product to cart so the cart page is not empty
    await page.goto('/menu')
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({ timeout: 20_000 })
    await page.locator('a[href^="/product/"]').first().click()
    await expect(page).toHaveURL(/\/product\/[^/?#]+/)
    const addBtn = page.getByTestId('product-detail-add-to-cart')
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await page.waitForURL(url => !url.pathname.includes('/product/'), { timeout: 15_000 })

    // Navigate to cart (without manually setting coupon in store)
    await page.goto('/cart')

    // Wait for the sync effect to run and the coupon to appear
    // The cart page calls /api/loyalty/active-coupon on mount and syncs
    const couponDisplay = page.getByText(`Kupon: ${coupon!.code}`)
    await expect(couponDisplay).toBeVisible({ timeout: 15_000 })

    console.log(`Coupon ${coupon!.code} correctly synced from DB to cart`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 7: Used coupon is cleared — activation unblocked after order uses coupon
  // Covers: full coupon lifecycle (active → used via order → lazy cleanup)
  // ──────────────────────────────────────────────────────
  test('used coupon is cleared and new activation is unblocked', async ({ page }) => {
    const couponCode = 'MESO-LIFECYCLE1'

    // 1. Set up: user has an "active" coupon, but a paid order already used its code
    //    This simulates the RLS bug where checkout couldn't update coupon status
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    await admin.from('crm_customers').update({
      loyalty_points: 500,
      loyalty_tier: 'silver',
    }).eq('id', testUserId)

    // Create coupon with status still 'active' (mimicking the RLS failure)
    await admin.from('crm_customer_coupons').insert({
      customer_id: testUserId,

      code: couponCode,
      coupon_type: availableRewards[0].reward_type,
      discount_value: availableRewards[0].reward_type === 'discount' ? 10 : null,
      status: 'active',
      points_spent: availableRewards[0].points_cost,
      source: 'reward',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Get a location for the order
    const { data: location } = await admin
      .from('users_locations')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()

    // Create an order that used this coupon code (paid, delivered)
    const orderNum = `TEST-${Date.now()}`
    await admin.from('orders_orders').insert({
      order_number: orderNum,
      channel: 'web',
      customer_id: testUserId,
      location_id: location!.id,
      status: 'delivered',
      delivery_type: 'delivery',
      delivery_address: { street: 'Test', building_number: '1', city: 'Gdańsk', postal_code: '80-001' },
      payment_method: 'blik',
      payment_status: 'paid',
      subtotal: 50,
      delivery_fee: 0,
      promo_discount: 0,
      tip: 0,
      total: 50,
      promo_code: couponCode,
      loyalty_points_earned: 50,
      loyalty_points_used: 0,
      paid_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      delivered_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    })

    // 2. Go to loyalty page — the lazy cleanup should detect the used coupon
    await loginLoyaltyUser(page)

    // Navigate and wait for the active-coupon API (which runs lazy cleanup)
    const [cleanupResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/loyalty/active-coupon'), { timeout: 30_000 }),
      page.goto('/loyalty'),
    ])
    const cleanupData = await cleanupResp.json()
    console.log('Cleanup API response:', JSON.stringify(cleanupData))

    // Wait for rewards tab to load
    await expect(page.getByRole('button', { name: 'Nagrody' })).toBeVisible({ timeout: 15_000 })

    // 3. Verify the "active coupon" banner is NOT shown (lazy cleanup marked it as used)
    await expect(page.getByText('Masz aktywny kupon')).not.toBeVisible({ timeout: 5_000 })

    // 4. Verify "Aktywuj" buttons are available again
    const activateButton = page.getByRole('button', { name: 'Aktywuj' }).first()
    await expect(activateButton).toBeVisible({ timeout: 10_000 })

    // 5. Verify the coupon in DB was updated to 'used'
    const { data: updatedCoupon } = await admin
      .from('crm_customer_coupons')
      .select('status')
      .eq('customer_id', testUserId)
      .eq('code', couponCode)
      .single()
    expect(updatedCoupon!.status).toBe('used')

    // Cleanup: delete the test order
    await admin.from('orders_orders').delete().eq('customer_id', testUserId).eq('promo_code', couponCode)

    console.log('Used coupon correctly cleared, activation unblocked')
  })

  // ──────────────────────────────────────────────────────
  // TEST 8: Reward cards show points cost alongside action buttons
  // Covers: every reward state shows its cost in points
  // ──────────────────────────────────────────────────────
  test('reward cards always show points cost', async ({ page }) => {
    // Set up: enough points to afford at least some rewards, no active coupon
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    await admin.from('crm_customers').update({
      loyalty_points: 500,
      loyalty_tier: 'silver',
    }).eq('id', testUserId)

    await loginLoyaltyUser(page)
    await page.goto('/loyalty')

    // Wait for rewards to load
    await expect(page.getByRole('button', { name: 'Nagrody' })).toBeVisible({ timeout: 15_000 })
    const firstReward = page.locator('.space-y-3 > div').first()
    await expect(firstReward).toBeVisible({ timeout: 10_000 })

    // Every reward card should display its cost in "X pkt" format
    // Check that each reward card's right side shows points cost
    const rewardCards = page.locator('.space-y-3 > div')
    const cardCount = await rewardCards.count()
    expect(cardCount).toBeGreaterThan(0)

    for (let i = 0; i < cardCount; i++) {
      const card = rewardCards.nth(i)
      // The points cost text should be visible in the flex-shrink-0 column (right side)
      const costText = card.locator('.flex-shrink-0 .font-bold')
      await expect(costText).toBeVisible()
      await expect(costText).toHaveText(/\d+ pkt/)
    }

    // Specifically: a card with "Aktywuj" button should ALSO show points cost
    const activateButton = page.getByRole('button', { name: 'Aktywuj' }).first()
    if (await activateButton.isVisible()) {
      // The button's parent container (.flex-shrink-0) should also have a cost label
      const buttonParent = activateButton.locator('..')
      const costInSameContainer = buttonParent.locator('.font-bold')
      await expect(costInSameContainer).toBeVisible()
      await expect(costInSameContainer).toHaveText(/\d+ pkt/)
    }

    console.log(`Verified ${cardCount} reward cards all show points cost`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 9: Tier emblem renders for current tier
  // Covers: cyberpunk SVG emblem is visible on the loyalty card
  // ──────────────────────────────────────────────────────
  test('tier emblem is visible on loyalty card', async ({ page }) => {
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    await admin.from('crm_customers').update({
      loyalty_points: 500,
      loyalty_tier: 'silver',
      lifetime_points: 500,
    }).eq('id', testUserId)

    await loginLoyaltyUser(page)
    await page.goto('/loyalty')

    // Wait for card to render
    await expect(page.getByText('Aktualnie dostępne punkty')).toBeVisible({ timeout: 15_000 })

    // Verify the SVG emblem is present in the points card (the neon-glow card)
    const pointsCard = page.locator('.neon-glow').first()
    await expect(pointsCard).toBeVisible()

    // The tier emblem SVG is in an absolutely-positioned container
    const emblemSvg = pointsCard.locator('svg[viewBox="0 0 120 120"]')
    await expect(emblemSvg).toBeVisible()

    // The SVG should have tier-specific content (silver uses octagon = 10-point polygon)
    // Verify it's not empty — has child elements
    const svgChildren = emblemSvg.locator('polygon, circle, ellipse, path, line')
    const childCount = await svgChildren.count()
    expect(childCount).toBeGreaterThan(5)

    console.log(`Tier emblem rendered with ${childCount} SVG elements`)
  })

  // ──────────────────────────────────────────────────────
  // TEST 10: Active coupon from DB is synced to cart on loyalty page visit
  // Covers: bug where loyalty page shows "Masz aktywny kupon" but cart is empty
  // ──────────────────────────────────────────────────────
  test('active coupon from DB is synced to cart on loyalty page visit', async ({ page }) => {
    // Setup: active coupon in DB
    await admin.from('crm_customer_coupons').delete().eq('customer_id', testUserId)
    const { data: coupon } = await admin.from('crm_customer_coupons').insert({
      customer_id: testUserId,

      code: 'MESO-RESYNC',
      coupon_type: 'free_delivery',
      status: 'active',
      points_spent: 100,
      source: 'reward',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()

    await loginLoyaltyUser(page)

    // Clear cart store to simulate lost coupon (browser refresh, cart cleared, etc.)
    await page.goto('/')
    await page.evaluate(() => {
      const cartKey = 'meso-cart'
      const stored = localStorage.getItem(cartKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.state) {
          parsed.state.loyaltyCoupon = null
        }
        localStorage.setItem(cartKey, JSON.stringify(parsed))
      }
    })

    // Visit loyalty page and wait for active-coupon API to respond
    const [couponResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/loyalty/active-coupon'), { timeout: 30_000 }),
      page.goto('/loyalty'),
    ])
    const couponData = await couponResp.json()
    console.log('Active coupon response:', JSON.stringify(couponData))
    await expect(page.getByRole('button', { name: 'Nagrody' })).toBeVisible({ timeout: 15_000 })

    // The active coupon banner should show (DB has active coupon)
    await expect(page.getByText('Masz aktywny kupon')).toBeVisible({ timeout: 20_000 })

    // KEY ASSERTION: The coupon should be synced back to the cart store
    // Poll localStorage until the coupon appears (sync is async)
    const cartCoupon = await page.evaluate(async () => {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 500))
        const stored = localStorage.getItem('meso-cart')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.state?.loyaltyCoupon) return parsed.state.loyaltyCoupon
        }
      }
      return null
    })

    expect(cartCoupon).not.toBeNull()
    expect(cartCoupon.code).toBe('MESO-RESYNC')

    console.log('Active coupon correctly synced from DB to cart on loyalty page visit')
  })
})
