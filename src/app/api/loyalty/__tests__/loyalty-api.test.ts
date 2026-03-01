import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Helpers: chainable Supabase mock builder
// ---------------------------------------------------------------------------

type MockChainResult = {
  data: unknown
  error: unknown
  count?: number | null
}

/**
 * Creates a proxy that supports arbitrary chaining of Supabase query methods
 * (.from().select().eq().gt()...) and resolves to `result` at the terminal
 * call (.single(), .maybeSingle(), or when awaited directly).
 */
function chain(result: MockChainResult = { data: null, error: null, count: null }): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      // Terminal methods -- return the result promise-like
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(result)
      }
      // When awaited (thenable)
      if (prop === 'then') {
        return (resolve: (v: MockChainResult) => void) => resolve(result)
      }
      // Everything else returns the same proxy so chaining continues
      return (..._args: unknown[]) => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

// ---------------------------------------------------------------------------
// Mock: nanoid
// ---------------------------------------------------------------------------
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'ABCDE'),
}))

// ---------------------------------------------------------------------------
// Mock: next/headers (needed by createClient -> cookies())
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

// ---------------------------------------------------------------------------
// Mock: Supabase clients
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>()

// For the auth (server) client we also need .from() for the history route
// which uses the auth client directly for querying.
const mockAuthFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockAuthFrom,
  })),
}))

const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Utility: build NextRequest for route handlers
// ---------------------------------------------------------------------------
function makeRequest(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>,
) {
  const url = new URL('http://localhost:3000/api/loyalty/test')
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  if (method === 'GET') {
    return new NextRequest(url)
  }
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------
const USER_ID = 'user-123'

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// activate-coupon
// ===========================================================================

describe('POST /api/loyalty/activate-coupon', () => {
  // Lazily import the route so mocks are in place
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    // Re-import for every test so module-level state is fresh
    const mod = await import('../activate-coupon/route')
    POST = mod.POST
  })

  // ---- 401 ----
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(makeRequest('POST', { reward_id: 'r1' }))
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  // ---- 400: missing reward_id ----
  it('returns 400 when reward_id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    const res = await POST(makeRequest('POST', {}))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain('reward_id')
  })

  // ---- 409: active coupon exists ----
  it('returns 409 when user already has an active coupon', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    // callN tracks admin.from() invocations
    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN === 1) {
        // expire stale -- just chain through
        return chain({ data: null, error: null })
      }
      if (callN === 2) {
        // check active coupon -- return one
        return chain({ data: { id: 'coupon-existing' }, error: null })
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { reward_id: 'r1' }))
    expect(res.status).toBe(409)
  })

  // ---- 404: reward not found ----
  it('returns 404 when reward does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN <= 1) return chain({ data: null, error: null }) // expire stale
      if (callN === 2) return chain({ data: null, error: null }) // no active coupon
      if (callN === 3) return chain({ data: null, error: { message: 'not found' } }) // reward lookup
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { reward_id: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  // ---- 400: insufficient points ----
  it('returns 400 when user has insufficient points', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN <= 1) return chain({ data: null, error: null })
      if (callN === 2) return chain({ data: null, error: null }) // no active coupon
      if (callN === 3) {
        // reward found
        return chain({
          data: { id: 'r1', points_cost: 200, min_tier: 'bronze', reward_type: 'discount', discount_value: 10, name: 'Rabat 10 PLN' },
          error: null,
        })
      }
      if (callN === 4) {
        // customer -- only 50 points
        return chain({
          data: { loyalty_points: 50, loyalty_tier: 'gold' },
          error: null,
        })
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { reward_id: 'r1' }))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain('200')
    expect(json.error).toContain('50')
  })

  // ---- 403: tier too low ----
  it('returns 403 when user tier is too low', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN <= 1) return chain({ data: null, error: null })
      if (callN === 2) return chain({ data: null, error: null })
      if (callN === 3) {
        return chain({
          data: { id: 'r1', points_cost: 100, min_tier: 'gold', reward_type: 'discount', discount_value: 10, name: 'Premium reward' },
          error: null,
        })
      }
      if (callN === 4) {
        return chain({
          data: { loyalty_points: 999, loyalty_tier: 'bronze' },
          error: null,
        })
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { reward_id: 'r1' }))
    expect(res.status).toBe(403)

    const json = await res.json()
    expect(json.error).toContain('gold')
  })

  // ---- 200: success (free_product with dynamic price lookup) ----
  it('returns 200 and creates coupon on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation((table: string) => {
      callN++
      if (callN <= 1) return chain({ data: null, error: null }) // expire stale
      if (callN === 2) return chain({ data: null, error: null }) // no active coupon
      if (callN === 3) {
        // reward
        return chain({
          data: { id: 'r1', points_cost: 100, min_tier: 'bronze', reward_type: 'free_product', discount_value: null, name: 'Gyoza (6 szt)' },
          error: null,
        })
      }
      if (callN === 4) {
        // customer
        return chain({
          data: { loyalty_points: 300, loyalty_tier: 'silver' },
          error: null,
        })
      }
      if (callN === 5) {
        // code uniqueness check
        return chain({ data: null, error: null })
      }
      // free_product with null discount_value triggers category + product lookup
      if (callN === 6 && table === 'menu_categories') {
        return chain({ data: [{ id: 'cat-gyoza', slug: 'gyoza' }], error: null })
      }
      if (callN === 7 && table === 'menu_products') {
        return chain({ data: { price: 22.90 }, error: null })
      }
      if (callN === 8) {
        // deduct points
        return chain({ data: null, error: null })
      }
      if (callN === 9) {
        // insert coupon
        return chain({
          data: {
            id: 'coupon-new',
            code: 'MESO-ABCDE',
            coupon_type: 'free_product',
            discount_value: 22.90,
            free_product_name: 'Gyoza (6 szt)',
            expires_at: '2026-02-26T00:00:00.000Z',
          },
          error: null,
        })
      }
      // loyalty_history insert
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { reward_id: 'r1' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.coupon).toBeDefined()
    expect(json.coupon.code).toBe('MESO-ABCDE')
    expect(json.coupon.coupon_type).toBe('free_product')
    expect(json.coupon.discount_value).toBe(22.90)
    expect(json.coupon.free_product_name).toBe('Gyoza (6 szt)')
  })

  // ---- 500 + rollback: coupon creation failure ----
  it('rolls back points on coupon creation failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    const updateCalls: Array<{ table: string }> = []
    let callN = 0
    mockAdminFrom.mockImplementation((table: string) => {
      callN++
      if (callN <= 1) return chain({ data: null, error: null }) // expire stale
      if (callN === 2) return chain({ data: null, error: null }) // no active coupon
      if (callN === 3) {
        return chain({
          data: { id: 'r1', points_cost: 100, min_tier: 'bronze', reward_type: 'discount', discount_value: 10, name: '10 PLN rabat' },
          error: null,
        })
      }
      if (callN === 4) {
        return chain({
          data: { loyalty_points: 200, loyalty_tier: 'bronze' },
          error: null,
        })
      }
      if (callN === 5) return chain({ data: null, error: null }) // code uniqueness
      if (callN === 6) return chain({ data: null, error: null }) // deduct points
      if (callN === 7) {
        // insert coupon FAILS
        return chain({ data: null, error: { message: 'DB error' } })
      }
      // callN === 8: rollback (points restore)
      updateCalls.push({ table })
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { reward_id: 'r1' }))
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toContain('kupon')

    // Verify rollback call was made to customers table
    expect(updateCalls.length).toBeGreaterThanOrEqual(1)
    expect(updateCalls[0].table).toBe('crm_customers')
  })
})

// ===========================================================================
// active-coupon (GET)
// ===========================================================================

describe('GET /api/loyalty/active-coupon', () => {
  let GET: () => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../active-coupon/route')
    GET = mod.GET
  })

  it('returns null coupon when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()
    const json = await res.json()
    expect(json.coupon).toBeNull()
    // Should NOT be a 401 -- the route returns 200 with null
    expect(res.status).toBe(200)
  })

  it('returns active coupon when one exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation((table: string) => {
      callN++
      if (callN === 1) return chain({ data: null, error: null }) // expire stale
      if (callN === 2) {
        // Select active coupons for used-order cleanup
        return chain({ data: [{ id: 'c1', code: 'MESO-XYZ' }], error: null })
      }
      if (callN === 3 && table === 'orders_orders') {
        // Check if coupon code was used in an order — not used
        return chain({ data: null, error: null })
      }
      if (callN === 4) {
        // Final fetch of active coupon
        return chain({
          data: {
            id: 'c1',
            code: 'MESO-XYZ',
            coupon_type: 'discount',
            discount_value: 10,
            free_product_name: null,
            expires_at: '2026-03-01T00:00:00.000Z',
            source: 'reward',
          },
          error: null,
        })
      }
      return chain({ data: null, error: null })
    })

    const res = await GET()
    const json = await res.json()

    expect(json.coupon).toBeDefined()
    expect(json.coupon.code).toBe('MESO-XYZ')
    expect(json.coupon.discount_value).toBe(10)
  })

  it('returns null when no active coupon exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN === 1) return chain({ data: null, error: null }) // expire stale
      if (callN === 2) return chain({ data: null, error: null }) // select active for cleanup — none found
      if (callN === 3) return chain({ data: null, error: null }) // final fetch — no active coupon
      return chain({ data: null, error: null })
    })

    const res = await GET()
    const json = await res.json()
    expect(json.coupon).toBeNull()
  })

  it('expires stale coupons and runs used-order cleanup before fetching', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    const fromCalls: string[] = []
    mockAdminFrom.mockImplementation((table: string) => {
      fromCalls.push(table)
      return chain({ data: null, error: null })
    })

    await GET()

    // Call 1: expire stale coupons (crm_customer_coupons)
    expect(fromCalls[0]).toBe('crm_customer_coupons')
    // Call 2: select active coupons for used-order cleanup (crm_customer_coupons)
    expect(fromCalls[1]).toBe('crm_customer_coupons')
    // Call 3: final fetch of active coupon (crm_customer_coupons)
    expect(fromCalls[2]).toBe('crm_customer_coupons')
    // No active coupons found → no orders check → 3 calls total
    expect(fromCalls.length).toBe(3)
  })

  it('marks coupon as used when matching paid order found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    const fromCalls: string[] = []
    let callN = 0
    mockAdminFrom.mockImplementation((table: string) => {
      fromCalls.push(table)
      callN++
      if (callN === 1) return chain({ data: null, error: null }) // expire stale
      if (callN === 2) {
        // Select active coupons — one found
        return chain({ data: [{ id: 'c1', code: 'MESO-USED1' }], error: null })
      }
      if (callN === 3 && table === 'orders_orders') {
        // Order found that used this coupon code
        return chain({ data: { id: 999 }, error: null })
      }
      if (callN === 4 && table === 'crm_customer_coupons') {
        // Update coupon to 'used'
        return chain({ data: null, error: null })
      }
      if (callN === 5) {
        // Final fetch — no more active coupons (it was marked used)
        return chain({ data: null, error: null })
      }
      return chain({ data: null, error: null })
    })

    const res = await GET()
    const json = await res.json()

    // Coupon was used, so none returned
    expect(json.coupon).toBeNull()
    // Verify the sequence: expire, select-active, check-orders, update-used, final-fetch
    expect(fromCalls).toEqual([
      'crm_customer_coupons', // expire stale
      'crm_customer_coupons', // select active for cleanup
      'orders_orders',         // check if coupon code used in order
      'crm_customer_coupons', // mark as used
      'crm_customer_coupons', // final fetch
    ])
  })
})

// ===========================================================================
// history (GET)
// ===========================================================================

describe('GET /api/loyalty/history', () => {
  let GET: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../history/route')
    GET = mod.GET
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns paginated history', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    // The history route uses the auth supabase client (not admin) for querying
    mockAuthFrom.mockImplementation(() => {
      return chain({
        data: [
          { id: 'h1', label: 'Zamowienie #1001', amount: 42, reason: 'earned', created_at: '2026-02-20T12:00:00Z' },
          { id: 'h2', label: 'Kupon: Gyoza', amount: -150, reason: 'spent', created_at: '2026-02-19T12:00:00Z' },
        ],
        error: null,
        count: 55,
      })
    })

    const res = await GET(makeRequest('GET', undefined, { page: '1' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.history).toHaveLength(2)
    expect(json.total).toBe(55)
    expect(json.page).toBe(1)
    // page=1, offset=20, limit=20 -> hasMore = 55 > 40 = true
    expect(json.hasMore).toBe(true)
  })

  it('returns empty history when no records', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    mockAuthFrom.mockImplementation(() => {
      return chain({
        data: [],
        error: null,
        count: 0,
      })
    })

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.history).toEqual([])
    expect(json.total).toBe(0)
    expect(json.hasMore).toBe(false)
    expect(json.page).toBe(0)
  })

  it('prepends temporary pending points for paid but not delivered orders on page 0', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    mockAuthFrom.mockImplementation((table: string) => {
      if (table === 'crm_loyalty_transactions') {
        return chain({
          data: [
            {
              id: 'h1',
              label: 'Zamowienie #1001',
              amount: 42,
              reason: 'earned',
              created_at: '2026-02-20T12:00:00Z',
              related_order_id: 1001,
            },
          ],
          error: null,
          count: 1,
        })
      }

      if (table === 'orders_orders') {
        return chain({
          data: [
            {
              id: 2002,
              status: 'confirmed',
              payment_status: 'paid',
              loyalty_points_earned: 67,
              created_at: '2026-02-21T12:00:00Z',
              paid_at: '2026-02-21T12:05:00Z',
              confirmed_at: '2026-02-21T12:06:00Z',
            },
          ],
          error: null,
        })
      }

      return chain({ data: null, error: null })
    })

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.history).toHaveLength(2)
    expect(json.history[0].id).toBe('pending-order-2002')
    expect(json.history[0].points).toBe(67)
    expect(json.history[0].is_pending_confirmation).toBe(true)
    expect(json.history[0].pending_message).toContain('Punkty w trakcie potwierdzania')
    expect(json.history[1].id).toBe('h1')
  })

  it('does not add temporary entry when order is already delivered', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    mockAuthFrom.mockImplementation((table: string) => {
      if (table === 'crm_loyalty_transactions') {
        return chain({
          data: [
            {
              id: 'h-delivered',
              label: 'Zamowienie #3003',
              amount: 80,
              reason: 'earned',
              created_at: '2026-02-22T12:00:00Z',
              related_order_id: 3003,
            },
          ],
          error: null,
          count: 1,
        })
      }

      if (table === 'orders_orders') {
        return chain({
          data: [
            {
              id: 3003,
              status: 'delivered',
              payment_status: 'paid',
              loyalty_points_earned: 80,
              created_at: '2026-02-22T11:00:00Z',
              paid_at: '2026-02-22T11:05:00Z',
              confirmed_at: '2026-02-22T11:06:00Z',
            },
          ],
          error: null,
        })
      }

      return chain({ data: null, error: null })
    })

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.history).toHaveLength(1)
    expect(json.history[0].id).toBe('h-delivered')
    expect(json.history.find((row: { id: string }) => row.id.startsWith('pending-order-'))).toBeUndefined()
  })
})

// ===========================================================================
// apply-referral (POST)
// ===========================================================================

describe('POST /api/loyalty/apply-referral', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../apply-referral/route')
    POST = mod.POST
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(makeRequest('POST', { referral_phone: '500100200' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when phone is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    const res = await POST(makeRequest('POST', {}))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain('telefon')
  })

  it('returns 409 when user already has a referrer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN === 1) {
        // current customer -- already has referred_by
        return chain({
          data: { id: USER_ID, referred_by: 'someone-else', phone: '500000001' },
          error: null,
        })
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { referral_phone: '500100200' }))
    expect(res.status).toBe(409)
  })

  it('returns 404 when referrer phone not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN === 1) {
        return chain({
          data: { id: USER_ID, referred_by: null, phone: '500000001' },
          error: null,
        })
      }
      if (callN === 2) {
        // referrer lookup -- not found
        return chain({ data: null, error: null })
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { referral_phone: '999999999' }))
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json.error).toContain('telefon')
  })

  it('returns 400 when referrer has no delivered orders', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN === 1) {
        return chain({
          data: { id: USER_ID, referred_by: null, phone: '500000001' },
          error: null,
        })
      }
      if (callN === 2) {
        // referrer found
        return chain({
          data: { id: 'referrer-1', phone: '500100200' },
          error: null,
        })
      }
      if (callN === 3) {
        // delivered orders count = 0
        return chain({ data: null, error: null, count: 0 })
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { referral_phone: '500100200' }))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain('zamówienie')
  })

  it('returns 429 when referrer exceeds monthly limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    let callN = 0
    mockAdminFrom.mockImplementation(() => {
      callN++
      if (callN === 1) {
        return chain({
          data: { id: USER_ID, referred_by: null, phone: '500000001' },
          error: null,
        })
      }
      if (callN === 2) {
        return chain({
          data: { id: 'referrer-1', phone: '500100200' },
          error: null,
        })
      }
      if (callN === 3) {
        // 1 delivered order
        return chain({ data: null, error: null, count: 1 })
      }
      if (callN === 4) {
        // monthly referrals = 10 (at limit)
        return chain({ data: null, error: null, count: 10 })
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { referral_phone: '500100200' }))
    expect(res.status).toBe(429)

    const json = await res.json()
    expect(json.error).toContain('limit')
  })

  it('returns 200 and creates welcome coupon on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })

    const insertedTables: string[] = []
    let callN = 0
    mockAdminFrom.mockImplementation((table: string) => {
      callN++
      if (callN === 1) {
        return chain({
          data: { id: USER_ID, referred_by: null, phone: '500000001' },
          error: null,
        })
      }
      if (callN === 2) {
        return chain({
          data: { id: 'referrer-1', phone: '500100200' },
          error: null,
        })
      }
      if (callN === 3) {
        // delivered orders
        return chain({ data: null, error: null, count: 3 })
      }
      if (callN === 4) {
        // monthly referrals = 2 (under limit)
        return chain({ data: null, error: null, count: 2 })
      }
      // callN 5: update referred_by
      // callN 6: insert coupon
      if (callN >= 5) {
        insertedTables.push(table)
      }
      return chain({ data: null, error: null })
    })

    const res = await POST(makeRequest('POST', { referral_phone: '500100200' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.coupon_code).toBe('WELCOME-ABCDE')
    expect(json.message).toContain('Gyoza')

    // Verify that customers table was updated and loyalty_coupons was inserted
    expect(insertedTables).toContain('crm_customers')
    expect(insertedTables).toContain('crm_customer_coupons')
  })
})
