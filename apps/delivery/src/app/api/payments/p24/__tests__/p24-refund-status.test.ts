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

const mockVerifyRefundNotificationSign = vi.fn()
vi.mock('@/lib/p24', () => ({
  P24: vi.fn().mockImplementation(() => ({
    verifyRefundNotificationSign: mockVerifyRefundNotificationSign,
  })),
}))

const mockUpdateStatus = vi.fn()
vi.mock('@/lib/pos-api', () => ({
  getPosApi: vi.fn(() => ({
    orders: {
      updateStatus: mockUpdateStatus,
    },
  })),
}))

const mockFrom = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
process.env.P24_MERCHANT_ID = '12345'
process.env.P24_POS_ID = '12345'
process.env.P24_CRC_KEY = 'crc'
process.env.P24_API_KEY = 'api'
process.env.P24_MODE = 'sandbox'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL('http://localhost:3001/api/payments/p24/refund/status'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  } as never)
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 777,
    sessionId: 'order-1-1234567890',
    merchantId: 12345,
    requestId: 'req-1',
    refundsUuid: 'rf-1',
    amount: 4200,
    currency: 'PLN',
    timestamp: 123456789,
    status: 0,
    sign: 'valid-sign',
    ...overrides,
  }
}

describe('POST /api/payments/p24/refund/status', () => {
  let POST: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../refund/status/route')
    POST = mod.POST
  })

  it('returns 400 when refund notification signature is invalid', async () => {
    mockVerifyRefundNotificationSign.mockReturnValue(false)

    const response = await POST(makeRequest(makeNotification()))
    expect(response.status).toBe(400)
  })

  it('marks payment as refunded when callback says refund completed', async () => {
    mockVerifyRefundNotificationSign.mockReturnValue(true)
    mockFrom
      .mockImplementationOnce(() =>
        chain({
          data: {
            id: 'order-1',
            status: 'cancelled',
            payment_status: 'paid',
            metadata: {
              p24: {
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
      .mockImplementationOnce(() =>
        chain({
          data: null,
          error: null,
        })
      )

    mockUpdateStatus.mockResolvedValue({
      success: true,
      data: { id: 'order-1', payment_status: 'refunded' },
    })

    const response = await POST(makeRequest(makeNotification()))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('OK')
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        payment_status: 'refunded',
      })
    )
  })

  it('does not change payment status when refund was rejected', async () => {
    mockVerifyRefundNotificationSign.mockReturnValue(true)
    mockFrom
      .mockImplementationOnce(() =>
        chain({
          data: {
            id: 'order-1',
            status: 'cancelled',
            payment_status: 'paid',
            metadata: {
              p24: {
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
      .mockImplementationOnce(() =>
        chain({
          data: null,
          error: null,
        })
      )

    const response = await POST(makeRequest(makeNotification({ status: 1 })))
    expect(response.status).toBe(200)
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })
})
