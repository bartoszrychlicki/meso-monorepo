import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}))

vi.mock('@/modules/orders/server-loyalty', () => ({
  awardOrderLoyaltyPoints: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ mocked: true })),
}))

const mockServerRepo = {
  findById: vi.fn(),
  update: vi.fn(),
}
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: () => mockServerRepo,
}))

const { mockDispatchWebhook } = vi.hoisted(() => ({
  mockDispatchWebhook: vi.fn(),
}))
vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhook: mockDispatchWebhook,
}))

const {
  mockBuildPosbistroConfirmBaseUrl,
  mockEnsureCustomerForOrder,
  mockSubmitPosbistroOrder,
} = vi.hoisted(() => ({
  mockBuildPosbistroConfirmBaseUrl: vi.fn((origin?: string) =>
    `${origin || 'http://localhost:3000'}/api/integrations/posbistro/confirm`
  ),
  mockEnsureCustomerForOrder: vi.fn(),
  mockSubmitPosbistroOrder: vi.fn(),
}))
vi.mock('@/lib/integrations/posbistro/service', () => ({
  buildPosbistroConfirmBaseUrl: mockBuildPosbistroConfirmBaseUrl,
  ensureCustomerForOrder: mockEnsureCustomerForOrder,
  submitPosbistroOrder: mockSubmitPosbistroOrder,
}))

import { authorizeRequest, isApiKey } from '@/lib/api/auth'
import { awardOrderLoyaltyPoints } from '@/modules/orders/server-loyalty'
import { PATCH } from '../orders/[id]/status/route'

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>
const mockFindById = mockServerRepo.findById as ReturnType<typeof vi.fn>
const mockAwardOrderLoyaltyPoints = awardOrderLoyaltyPoints as ReturnType<typeof vi.fn>

const validApiKey = {
  id: 'key-1',
  permissions: ['orders:status'],
}

const baseOrder = {
  id: 'order-1',
  status: 'confirmed',
  payment_status: 'pending',
  status_history: [{ status: 'confirmed', timestamp: '2026-03-03T10:00:00.000Z' }],
  customer_phone: '+48500100100',
  channel: 'delivery_app',
  external_order_id: 'ext-1',
}

function makeRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'PATCH',
    body: JSON.stringify(body),
  } as never)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/v1/orders/:id/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(validApiKey)
    mockIsApiKey.mockReturnValue(true)
    mockDispatchWebhook.mockResolvedValue([])
    mockEnsureCustomerForOrder.mockImplementation(async (order) => order)
    mockSubmitPosbistroOrder.mockResolvedValue(null)
  })

  it('returns 200 without writes when status is repeated (idempotent no-op)', async () => {
    mockFindById.mockResolvedValue(baseOrder)

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'confirmed',
      }),
      makeParams('order-1')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.status).toBe('confirmed')
    expect(mockServerRepo.update).not.toHaveBeenCalled()
    expect(mockDispatchWebhook).not.toHaveBeenCalled()
  })

  it('updates payment status when status is repeated but payment changes', async () => {
    mockFindById.mockResolvedValue(baseOrder)
    mockServerRepo.update.mockResolvedValue({
      ...baseOrder,
      payment_status: 'paid',
      paid_at: '2026-03-03T10:05:00.000Z',
    })

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'confirmed',
        payment_status: 'paid',
      }),
      makeParams('order-1')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.payment_status).toBe('paid')
    expect(mockServerRepo.update).toHaveBeenCalledTimes(1)
    expect(mockServerRepo.update).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        payment_status: 'paid',
      })
    )
  })

  it('awards loyalty points through the server helper when order is delivered', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: 'ready',
      customer_id: 'customer-1',
    })
    mockServerRepo.update.mockResolvedValue({
      ...baseOrder,
      status: 'delivered',
      customer_id: 'customer-1',
      payment_status: 'paid',
      status_history: [
        ...baseOrder.status_history,
        { status: 'delivered', timestamp: '2026-03-03T10:10:00.000Z' },
      ],
    })
    mockAwardOrderLoyaltyPoints.mockResolvedValue(120)

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'delivered',
        payment_status: 'paid',
      }),
      makeParams('order-1')
    )

    expect(res.status).toBe(200)
    expect(mockAwardOrderLoyaltyPoints).toHaveBeenCalledTimes(1)
  })

  it('ensures customer and submits to POSBistro when order becomes confirmed', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: 'pending',
    })
    mockServerRepo.update.mockResolvedValue({
      ...baseOrder,
      status: 'confirmed',
      customer_id: 'customer-1',
      status_history: [
        { status: 'pending', timestamp: '2026-03-03T09:55:00.000Z' },
        { status: 'confirmed', timestamp: '2026-03-03T10:00:00.000Z' },
      ],
    })
    mockEnsureCustomerForOrder.mockResolvedValue({
      ...baseOrder,
      status: 'confirmed',
      customer_id: 'customer-1',
    })

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'confirmed',
      }),
      makeParams('order-1')
    )

    expect(res.status).toBe(200)
    expect(mockEnsureCustomerForOrder).toHaveBeenCalledTimes(1)
    expect(mockSubmitPosbistroOrder).toHaveBeenCalledTimes(1)
    expect(mockSubmitPosbistroOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'customer-1',
        status: 'confirmed',
      }),
      expect.objectContaining({
        confirmBaseUrl: 'http://localhost:3000/api/integrations/posbistro/confirm',
      })
    )
  })
})
