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
 * (.from().select().eq().update()...) and resolves to `result` at the terminal
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
// Mock: @/lib/supabase/server (auth client)
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    })
  ),
}))

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/admin (admin client for order lookup)
// ---------------------------------------------------------------------------

const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Mock: @/lib/p24 (P24 payment gateway)
// ---------------------------------------------------------------------------

const mockRegisterTransaction = vi.fn()
const mockGetPaymentLink = vi.fn()

vi.mock('@/lib/p24', () => ({
  P24: vi.fn().mockImplementation(() => ({
    registerTransaction: mockRegisterTransaction,
    getPaymentLink: mockGetPaymentLink,
  })),
}))

// ---------------------------------------------------------------------------
// Env vars
// ---------------------------------------------------------------------------

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.P24_MERCHANT_ID = '12345'
process.env.P24_POS_ID = '12345'
process.env.P24_CRC_KEY = 'test-crc-key'
process.env.P24_API_KEY = 'test-api-key'
process.env.P24_MODE = 'sandbox'

// ---------------------------------------------------------------------------
// Utility: build NextRequest for route handlers
// ---------------------------------------------------------------------------

function makeRequest(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
) {
  const url = new URL('http://localhost:3000/api/payments/p24/register')
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
// Shared constants
// ---------------------------------------------------------------------------

const USER_ID = 'user-abc-123'
const ORDER_ID = 'order-abc-456'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/payments/p24/register', () => {
  let POST: (req: Request) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../register/route')
    POST = mod.POST
  })

  // ---- 401: Unauthenticated ----
  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(makeRequest('POST', { orderId: ORDER_ID }))
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  // ---- 400: Missing orderId ----
  it('returns 400 when orderId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: 'test@meso.pl' } } })

    const res = await POST(makeRequest('POST', {}))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  // ---- 400: Order not found in DB ----
  it('returns 400 when order is not found in the database', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: 'test@meso.pl' } } })
    mockAdminFrom.mockImplementation(() =>
      chain({ data: null, error: { message: 'Not found' } })
    )

    const res = await POST(makeRequest('POST', { orderId: ORDER_ID }))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  // ---- 403: Order belongs to different user ----
  it('returns 403 when order belongs to a different user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: 'test@meso.pl' } } })
    mockAdminFrom.mockImplementation(() =>
      chain({
        data: {
          id: ORDER_ID,
          customer_id: 'different-user-999',
          total: 50.0,
          delivery_address: { email: 'other@meso.pl' },
        },
        error: null,
      })
    )

    const res = await POST(makeRequest('POST', { orderId: ORDER_ID }))
    expect(res.status).toBe(403)

    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  // ---- 200: Success ----
  it('returns 200 with token and URL on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: 'test@meso.pl' } } })
    mockAdminFrom.mockImplementation(() =>
      chain({
        data: {
          id: ORDER_ID,
          customer_id: USER_ID,
          total: 75.5,
          delivery_address: { email: 'test@meso.pl' },
        },
        error: null,
      })
    )

    mockRegisterTransaction.mockResolvedValue('test-token-abc')
    mockGetPaymentLink.mockReturnValue('https://sandbox.przelewy24.pl/trnRequest/test-token-abc')

    const res = await POST(makeRequest('POST', { orderId: ORDER_ID }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.token).toBe('test-token-abc')
    expect(json.url).toBe('https://sandbox.przelewy24.pl/trnRequest/test-token-abc')

    // Verify P24 registerTransaction was called with correct amount in grosze
    expect(mockRegisterTransaction).toHaveBeenCalledWith(
      expect.stringContaining(ORDER_ID),
      7550, // 75.5 * 100
      expect.stringContaining(ORDER_ID),
      'test@meso.pl',
      expect.stringContaining('order-confirmation'),
      expect.stringContaining('/api/payments/p24/status'),
    )
  })

  // ---- 500: P24 registration failure ----
  it('returns 500 on P24 registration failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: 'test@meso.pl' } } })
    mockAdminFrom.mockImplementation(() =>
      chain({
        data: {
          id: ORDER_ID,
          customer_id: USER_ID,
          total: 50.0,
          delivery_address: { email: 'test@meso.pl' },
        },
        error: null,
      })
    )

    mockRegisterTransaction.mockRejectedValue(new Error('P24 API connection failed'))

    const res = await POST(makeRequest('POST', { orderId: ORDER_ID }))
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toBe('P24 API connection failed')
  })
})
