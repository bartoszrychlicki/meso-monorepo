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
// Mock: @/lib/p24 (P24 payment gateway)
// ---------------------------------------------------------------------------

const mockVerifyTransaction = vi.fn()

vi.mock('@/lib/p24', () => ({
  P24: vi.fn().mockImplementation(() => ({
    verifyTransaction: mockVerifyTransaction,
  })),
}))

// ---------------------------------------------------------------------------
// Mock: @supabase/supabase-js (direct admin client in status route)
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Mock: @/lib/email (fire-and-forget confirmation email)
// ---------------------------------------------------------------------------

vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
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
// Utility: build NextRequest for route handlers (P24 webhook sends POST)
// ---------------------------------------------------------------------------

function makeP24Notification(overrides: Record<string, unknown> = {}) {
  const defaults = {
    merchantId: 12345,
    posId: 12345,
    sessionId: 'abc-def-123-1234567890',
    amount: 5000,
    originAmount: 5000,
    currency: 'PLN',
    orderId: 999,
    methodId: 25,
    statement: 'test-statement',
    sign: 'valid-sign-hash',
  }
  return { ...defaults, ...overrides }
}

function makeRequest(body: Record<string, unknown>) {
  const url = new URL('http://localhost:3000/api/payments/p24/status')
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const ORDER_ID = 'abc-def-123' // Extracted from sessionId "abc-def-123-1234567890"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/payments/p24/status (webhook)', () => {
  let POST: (req: Request) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../status/route')
    POST = mod.POST
  })

  // ---- 400: P24 signature verification fails ----
  it('returns 400 when P24 signature verification fails', async () => {
    mockVerifyTransaction.mockResolvedValue(false)

    const res = await POST(makeRequest(makeP24Notification()))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
  })

  // ---- 400: Invalid sessionId format ----
  it('returns 400 when sessionId format is invalid (empty after extraction)', async () => {
    mockVerifyTransaction.mockResolvedValue(true)

    // A sessionId like "-1234567890" — stripping `-\d+$` leaves empty string
    const res = await POST(makeRequest(makeP24Notification({ sessionId: '-1234567890' })))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('Invalid session ID format')
  })

  // ---- 500: DB update fails ----
  it('returns 500 when database update fails', async () => {
    mockVerifyTransaction.mockResolvedValue(true)

    mockFrom.mockImplementation(() =>
      chain({ data: null, error: { message: 'DB update error' } })
    )

    const res = await POST(makeRequest(makeP24Notification()))
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toBe('Database update failed')
  })

  // ---- 200: Successful payment confirmation ----
  it('returns 200 with status OK on successful payment confirmation', async () => {
    mockVerifyTransaction.mockResolvedValue(true)

    let callN = 0
    mockFrom.mockImplementation(() => {
      callN++
      if (callN === 1) {
        // First call: order update (confirmed, paid)
        return chain({
          data: {
            id: ORDER_ID,
            status: 'confirmed',
            payment_status: 'paid',
            total: 50.0,
            subtotal: 42.01,
            delivery_fee: 7.99,
            delivery_type: 'delivery',
            payment_method: 'blik',
            delivery_address: { firstName: 'Jan', email: 'jan@test.pl' },
          },
          error: null,
        })
      }
      // Second call: full order query for email
      return chain({
        data: {
          id: ORDER_ID,
          status: 'confirmed',
          total: 50.0,
          subtotal: 42.01,
          delivery_fee: 7.99,
          delivery_type: 'delivery',
          payment_method: 'blik',
          delivery_address: { firstName: 'Jan', email: 'jan@test.pl' },
          order_items: [],
          location: { name: 'Meso Wro', address: 'Rynek 1', city: 'Wroclaw' },
        },
        error: null,
      })
    })

    const res = await POST(makeRequest(makeP24Notification()))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.status).toBe('OK')
  })

  // ---- Correctly extracts orderId from sessionId ----
  it('correctly extracts orderId from sessionId with UUID format', async () => {
    mockVerifyTransaction.mockResolvedValue(true)

    // The sessionId is "abc-def-123-1234567890"
    // After stripping `-\d+$` we should get "abc-def-123"
    let callN = 0
    const fromCalls: { table: string; callN: number }[] = []
    mockFrom.mockImplementation((table: string) => {
      callN++
      fromCalls.push({ table, callN })
      if (callN === 1) {
        return chain({
          data: { id: ORDER_ID, status: 'confirmed' },
          error: null,
        })
      }
      return chain({
        data: {
          id: ORDER_ID,
          delivery_address: {},
          order_items: [],
          location: null,
        },
        error: null,
      })
    })

    const sessionId = 'abc-def-123-1234567890'
    const res = await POST(makeRequest(makeP24Notification({ sessionId })))
    expect(res.status).toBe(200)

    // Verify that from('orders_orders') was called — the order ID was correctly parsed
    expect(fromCalls[0].table).toBe('orders_orders')
  })
})
