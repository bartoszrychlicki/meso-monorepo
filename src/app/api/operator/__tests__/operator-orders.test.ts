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
// Mock: @/lib/supabase/admin
// ---------------------------------------------------------------------------

const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Env vars
// ---------------------------------------------------------------------------

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPERATOR_PIN = '1234'

// ---------------------------------------------------------------------------
// Utility: build NextRequest for route handlers
// ---------------------------------------------------------------------------

function makeRequest(
  method: 'PATCH',
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  const url = new URL('http://localhost:3000/api/operator/orders')
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const ORDER_ID = 'order-op-789'
const VALID_PIN = '1234'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/operator/orders', () => {
  let PATCH: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../orders/route')
    PATCH = mod.PATCH
  })

  // ---- 401: PIN missing ----
  it('returns 401 when operator PIN is missing', async () => {
    const res = await PATCH(makeRequest('PATCH', { orderId: ORDER_ID, status: 'preparing' }))
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  // ---- 401: Wrong PIN ----
  it('returns 401 when operator PIN is wrong', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { orderId: ORDER_ID, status: 'preparing' }, { 'x-operator-pin': '9999' })
    )
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  // ---- 400: Missing orderId or status ----
  it('returns 400 when orderId is missing', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { status: 'preparing' }, { 'x-operator-pin': VALID_PIN })
    )
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('Missing orderId or status')
  })

  it('returns 400 when status is missing', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { orderId: ORDER_ID }, { 'x-operator-pin': VALID_PIN })
    )
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('Missing orderId or status')
  })

  // ---- 400: Invalid status value ----
  it('returns 400 when status is invalid', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { orderId: ORDER_ID, status: 'bogus_status' }, { 'x-operator-pin': VALID_PIN })
    )
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('Invalid status')
  })

  // ---- 200: Successful status update ----
  it('returns 200 on successful status update', async () => {
    mockAdminFrom.mockImplementation(() =>
      chain({ data: null, error: null })
    )

    const res = await PATCH(
      makeRequest('PATCH', { orderId: ORDER_ID, status: 'preparing' }, { 'x-operator-pin': VALID_PIN })
    )
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
  })

  // ---- 200: Sets timestamp field when provided ----
  it('returns 200 and sets timestamp field when provided', async () => {
    mockAdminFrom.mockImplementation(() =>
      chain({ data: null, error: null })
    )

    const res = await PATCH(
      makeRequest(
        'PATCH',
        { orderId: ORDER_ID, status: 'ready', timestampField: 'ready_at' },
        { 'x-operator-pin': VALID_PIN },
      )
    )
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)

    // Verify from('orders_orders') was called
    expect(mockAdminFrom).toHaveBeenCalledWith('orders_orders')
  })

  // ---- 500: DB update failure ----
  it('returns 500 when database update fails', async () => {
    mockAdminFrom.mockImplementation(() =>
      chain({ data: null, error: { message: 'DB write error' } })
    )

    const res = await PATCH(
      makeRequest('PATCH', { orderId: ORDER_ID, status: 'delivered' }, { 'x-operator-pin': VALID_PIN })
    )
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toBe('DB write error')
  })
})
