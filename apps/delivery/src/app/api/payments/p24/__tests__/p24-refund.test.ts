import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type MockChainResult = {
  data: unknown
  error: unknown
}

function chain(result: MockChainResult = { data: null, error: null }): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(result)
      }
      if (prop === 'then') {
        return (resolve: (value: MockChainResult) => void) => resolve(result)
      }
      return () => new Proxy({}, handler)
    },
  }

  return new Proxy({}, handler)
}

const mockRefundTransaction = vi.fn()
vi.mock('@/lib/p24', () => ({
  P24: vi.fn().mockImplementation(() => ({
    refundTransaction: mockRefundTransaction,
  })),
  P24RefundError: class extends Error {
    statusCode?: number
    details?: unknown
  },
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

process.env.P24_MERCHANT_ID = '12345'
process.env.P24_POS_ID = '12345'
process.env.P24_CRC_KEY = 'crc'
process.env.P24_API_KEY = 'api'
process.env.P24_MODE = 'sandbox'
process.env.DELIVERY_INTERNAL_API_KEY = 'secret'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3001'

function makeRequest(body: Record<string, unknown>, withAuth = true) {
  return new NextRequest(new URL('http://localhost:3001/api/payments/p24/refund'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth ? { 'X-Internal-API-Key': 'secret' } : {}),
    },
    body: JSON.stringify(body),
  } as never)
}

describe('POST /api/payments/p24/refund', () => {
  let POST: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../refund/route')
    POST = mod.POST
  })

  it('returns 401 without internal auth header', async () => {
    const response = await POST(makeRequest({ orderId: 'order-1' }, false))
    expect(response.status).toBe(401)
  })

  it('requests refund for paid order with verified P24 session', async () => {
    mockFrom
      .mockImplementationOnce(() =>
        chain({
          data: {
            id: 'order-1',
            order_number: 'WEB-20260315-001',
            total: 42,
            payment_status: 'paid',
            metadata: {
              p24: {
                sessions: [
                  {
                    sessionId: 'order-1-1234567890',
                    status: 'verified',
                    createdAt: '2026-03-15T10:00:00.000Z',
                    verifiedAt: '2026-03-15T10:01:00.000Z',
                    p24OrderId: '777',
                  },
                ],
                refunds: [],
              },
            },
          },
          error: null,
        })
      )
      .mockImplementationOnce(() =>
        chain({
          data: null,
          error: null,
        })
      )

    mockRefundTransaction.mockResolvedValue([
      {
        orderId: 777,
        sessionId: 'order-1-1234567890',
        amount: 4200,
        description: 'Zwrot WEB-20260315-001',
        status: true,
        message: 'success',
      },
    ])

    const response = await POST(
      makeRequest({
        orderId: 'order-1',
        requestedFrom: 'pos',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('requested')
    expect(mockRefundTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        refunds: [
          expect.objectContaining({
            orderId: 777,
            sessionId: 'order-1-1234567890',
            amount: 4200,
          }),
        ],
      })
    )
  })

  it('returns 409 when refund is already tracked', async () => {
    mockFrom.mockImplementationOnce(() =>
      chain({
        data: {
          id: 'order-1',
          order_number: 'WEB-20260315-001',
          total: 42,
          payment_status: 'paid',
          metadata: {
            p24: {
              sessions: [],
              refunds: [
                {
                  requestId: 'req-1',
                  refundsUuid: 'rf-1',
                  sessionId: 'order-1-1234567890',
                  p24OrderId: '777',
                  amount: 4200,
                  description: 'Zwrot',
                  status: 'requested',
                  requestedAt: '2026-03-15T10:05:00.000Z',
                },
              ],
            },
          },
        },
        error: null,
      })
    )

    const response = await POST(makeRequest({ orderId: 'order-1' }))
    expect(response.status).toBe(409)
  })
})
