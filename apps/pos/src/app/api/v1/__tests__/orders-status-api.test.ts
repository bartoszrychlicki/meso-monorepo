import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}))

const { mockKitchenTicketsIn, mockKitchenTicketsEq, mockKitchenTicketsUpdate } = vi.hoisted(() => ({
  mockKitchenTicketsIn: vi.fn(),
  mockKitchenTicketsEq: vi.fn(),
  mockKitchenTicketsUpdate: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'orders_kitchen_tickets') {
        throw new Error(`Unexpected table access in test: ${table}`)
      }

      return {
        update: mockKitchenTicketsUpdate,
      }
    }),
  })),
}))

const mockServerRepo = {
  findById: vi.fn(),
  update: vi.fn(),
}
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: () => mockServerRepo,
}))

const { mockScheduleWebhookDispatch } = vi.hoisted(() => ({
  mockScheduleWebhookDispatch: vi.fn(),
}))
vi.mock('@/lib/webhooks/schedule', () => ({
  scheduleWebhookDispatch: mockScheduleWebhookDispatch,
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
import { PATCH } from '../orders/[id]/status/route'

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>
const mockFindById = mockServerRepo.findById as ReturnType<typeof vi.fn>

const validApiKey = {
  id: 'key-1',
  permissions: ['orders:status'],
}

const baseOrder = {
  id: 'order-1',
  order_number: 'WEB-20260303-001',
  status: 'confirmed',
  payment_status: 'pending',
  status_history: [{ status: 'confirmed', timestamp: '2026-03-03T10:00:00.000Z' }],
  customer_phone: '+48500100100',
  customer_name: 'Jan Kowalski',
  channel: 'delivery_app',
  source: 'delivery',
  external_order_id: 'ext-1',
  external_channel: 'glovo',
  items: [
    {
      id: 'item-1',
      product_id: 'prod-1',
      product_name: 'Tonkotsu Ramen',
      quantity: 2,
      unit_price: 32,
      modifiers: [],
      subtotal: 64,
      notes: 'bez szczypiorku',
    },
  ],
  total: 89,
  estimated_ready_at: '2026-03-03T10:30:00.000Z',
  created_at: '2026-03-03T10:00:00.000Z',
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
    mockScheduleWebhookDispatch.mockReset()
    mockEnsureCustomerForOrder.mockImplementation(async (order) => order)
    mockSubmitPosbistroOrder.mockResolvedValue(null)
    mockKitchenTicketsUpdate.mockReturnValue({ eq: mockKitchenTicketsEq })
    mockKitchenTicketsEq.mockReturnValue({ in: mockKitchenTicketsIn })
    mockKitchenTicketsIn.mockResolvedValue({ error: null })
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
    expect(mockScheduleWebhookDispatch).not.toHaveBeenCalled()
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

  it.each([
    {
      from: 'accepted',
      to: 'preparing',
      field: 'preparing_at',
    },
    {
      from: 'preparing',
      to: 'ready',
      field: 'ready_at',
    },
    {
      from: 'ready',
      to: 'out_for_delivery',
      field: 'picked_up_at',
    },
    {
      from: 'confirmed',
      to: 'cancelled',
      field: 'cancelled_at',
    },
  ])('sets $field when transitioning from $from to $to', async ({ from, to, field }) => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: from,
    })
    mockServerRepo.update.mockResolvedValue({
      ...baseOrder,
      status: to,
      [field]: '2026-03-03T10:05:00.000Z',
    })

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: to,
      }),
      makeParams('order-1')
    )

    expect(res.status).toBe(200)
    expect(mockServerRepo.update).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        status: to,
        [field]: expect.any(String),
      })
    )
  })

  it('cancels active kitchen tickets when order is cancelled', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: 'confirmed',
    })
    mockServerRepo.update.mockResolvedValue({
      ...baseOrder,
      status: 'cancelled',
      cancelled_at: '2026-03-03T10:05:00.000Z',
      status_history: [
        ...baseOrder.status_history,
        { status: 'cancelled', timestamp: '2026-03-03T10:05:00.000Z', note: 'Klient anulował' },
      ],
    })

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'cancelled',
        note: 'Klient anulował',
      }),
      makeParams('order-1')
    )

    expect(res.status).toBe(200)
    expect(mockKitchenTicketsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        completed_at: expect.any(String),
        updated_at: expect.any(String),
      })
    )
    expect(mockKitchenTicketsEq).toHaveBeenCalledWith('order_id', 'order-1')
    expect(mockKitchenTicketsIn).toHaveBeenCalledWith('status', ['pending', 'preparing', 'ready'])
  })

  it('still returns 200 when kitchen ticket cancellation fails', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: 'confirmed',
    })
    mockServerRepo.update.mockResolvedValue({
      ...baseOrder,
      status: 'cancelled',
      cancelled_at: '2026-03-03T10:05:00.000Z',
      status_history: [
        ...baseOrder.status_history,
        { status: 'cancelled', timestamp: '2026-03-03T10:05:00.000Z' },
      ],
    })
    mockKitchenTicketsIn.mockResolvedValueOnce({
      error: { message: 'temporary database error' },
    })

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'cancelled',
      }),
      makeParams('order-1')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.status).toBe('cancelled')
    expect(mockKitchenTicketsIn).toHaveBeenCalledWith('status', ['pending', 'preparing', 'ready'])
  })
  it('updates delivered orders without invoking app-side loyalty awarding', async () => {
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
    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'delivered',
        payment_status: 'paid',
      }),
      makeParams('order-1')
    )

    expect(res.status).toBe(200)
    expect(mockServerRepo.update).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        status: 'delivered',
        delivered_at: expect.any(String),
        payment_status: 'paid',
        paid_at: expect.any(String),
      })
    )
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
    expect(mockServerRepo.update).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        status: 'confirmed',
        confirmed_at: expect.any(String),
      })
    )
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

  it('dispatches enriched webhook payloads for non-delivery-app orders too', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      channel: 'pos',
      external_channel: undefined,
      source: 'takeaway',
      status: 'accepted',
    })
    mockServerRepo.update.mockResolvedValue({
      ...baseOrder,
      channel: 'pos',
      external_channel: undefined,
      source: 'takeaway',
      status: 'preparing',
    })

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/v1/orders/order-1/status', {
        status: 'preparing',
        note: 'Do odbioru za 15 min',
      }),
      makeParams('order-1')
    )

    expect(res.status).toBe(200)
    expect(mockScheduleWebhookDispatch).toHaveBeenCalledTimes(1)
    expect(mockScheduleWebhookDispatch).toHaveBeenCalledWith(
      'order.status_changed',
      expect.objectContaining({
        pos_order_id: 'order-1',
        order_number: 'WEB-20260303-001',
        status: 'preparing',
        previous_status: 'accepted',
        channel: 'pos',
        order_type: 'takeaway',
        source: 'pos',
        total: 8900,
        currency: 'PLN',
        customer_name: 'Jan Kowalski',
        customer_phone: '+48500100100',
        estimated_ready_at: '2026-03-03T10:30:00.000Z',
        created_at: '2026-03-03T10:00:00.000Z',
        items: [
          {
            name: 'Tonkotsu Ramen',
            quantity: 2,
            unit_price: 3200,
            notes: 'bez szczypiorku',
          },
        ],
      })
    )
  })
})
