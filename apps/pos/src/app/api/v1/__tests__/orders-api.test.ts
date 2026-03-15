import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}))

const mockServerRepo = {
  findAll: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
}
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: () => mockServerRepo,
}))

const {
  mockBuildPosbistroConfirmBaseUrl,
  mockEnsureCustomerForOrderDraft,
  mockSubmitPosbistroOrder,
} = vi.hoisted(() => ({
  mockBuildPosbistroConfirmBaseUrl: vi.fn((origin?: string) =>
    `${origin || 'http://localhost:3000'}/api/integrations/posbistro/confirm`
  ),
  mockEnsureCustomerForOrderDraft: vi.fn(),
  mockSubmitPosbistroOrder: vi.fn(),
}))
vi.mock('@/lib/integrations/posbistro/service', () => ({
  buildPosbistroConfirmBaseUrl: mockBuildPosbistroConfirmBaseUrl,
  ensureCustomerForOrderDraft: mockEnsureCustomerForOrderDraft,
  submitPosbistroOrder: mockSubmitPosbistroOrder,
}))

const { mockScheduleWebhookDispatch } = vi.hoisted(() => ({
  mockScheduleWebhookDispatch: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/webhooks/schedule', () => ({
  scheduleWebhookDispatch: mockScheduleWebhookDispatch,
}))

const mockRpc = vi.fn()
const mockServiceFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: mockServiceFrom,
    rpc: mockRpc,
  }),
}))

import { authorizeRequest, isApiKey } from '@/lib/api/auth'
import { GET, POST } from '../orders/route'

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>

const validApiKey = {
  id: 'key-1',
  permissions: ['orders:read', 'orders:write'],
}

const mockProduct = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Burger Classic',
  is_available: true,
  variants: [],
}

const validOrderBody = {
  channel: 'online',
  source: 'delivery',
  location_id: '550e8400-e29b-41d4-a716-446655440000',
  customer_name: 'Jan Kowalski',
  customer_phone: '+48123456789',
  payment_method: 'card',
  items: [
    {
      product_id: '550e8400-e29b-41d4-a716-446655440001',
      product_name: 'Burger Classic',
      quantity: 2,
      unit_price: 29.9,
      modifiers: [],
    },
  ],
}

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never)
}

function chain(result: { data: unknown; error: unknown }) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve(result),
      }),
    }),
  }
}

describe('GET /api/v1/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(validApiKey)
    mockIsApiKey.mockReturnValue(true)
  })

  it('returns 401 when no API key provided', async () => {
    const unauthorizedResponse = new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }),
      { status: 401 }
    )
    mockAuth.mockResolvedValue(unauthorizedResponse)
    mockIsApiKey.mockReturnValue(false)

    const res = await GET(makeRequest('http://localhost:3000/api/v1/orders'))
    expect(res.status).toBe(401)
  })

  it('lists orders with default pagination', async () => {
    const mockOrders = [
      { id: 'order-1', order_number: 'ZAM-001', status: 'pending' },
      { id: 'order-2', order_number: 'ZAM-002', status: 'preparing' },
    ]
    mockServerRepo.findAll.mockResolvedValue({
      data: mockOrders,
      total: 2,
      page: 1,
      per_page: 50,
    })

    const res = await GET(makeRequest('http://localhost:3000/api/v1/orders'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.meta.total).toBe(2)
  })
})

describe('POST /api/v1/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockAuth.mockResolvedValue(validApiKey)
    mockIsApiKey.mockReturnValue(true)
    mockScheduleWebhookDispatch.mockReset()
    mockEnsureCustomerForOrderDraft.mockImplementation(async (input) => input)
    mockSubmitPosbistroOrder.mockResolvedValue(null)
    mockServerRepo.findById.mockResolvedValue(mockProduct)
    mockServerRepo.findMany.mockResolvedValue([])
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'crm_customers') {
        return chain({
          data: {
            order_history: {
              total_orders: 0,
            },
          },
          error: null,
        })
      }
      return chain({ data: null, error: null })
    })
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'next_order_number') {
        return Promise.resolve({
          data: 'ZAM-20260226-001',
          error: null,
        })
      }
      if (fn === 'create_order_with_items') {
        return Promise.resolve({
          data: {
            id: 'new-order-id',
            order_number: 'ZAM-20260226-001',
            status: 'pending',
            channel: 'online',
            source: 'delivery',
            customer_name: 'Jan Kowalski',
            customer_phone: '+48123456789',
            items: [
              {
                id: 'item-1',
                product_id: '550e8400-e29b-41d4-a716-446655440001',
                product_name: 'Burger Classic',
                quantity: 2,
                unit_price: 29.9,
                modifiers: [],
                subtotal: 59.8,
              },
            ],
            total: 59.8,
            created_at: '2026-02-26T12:00:00.000Z',
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  it('rejects ASAP orders when temporary ordering pause is active', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-19T12:00:00.000Z'))

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'crm_customers') {
        return chain({
          data: {
            order_history: {
              total_orders: 0,
            },
          },
          error: null,
        })
      }

      if (table === 'orders_delivery_config') {
        return chain({
          data: {
            opening_time: '11:00:00',
            is_pickup_active: true,
            ordering_paused_until_date: '2026-03-20',
          },
          error: null,
        })
      }

      return chain({ data: null, error: null })
    })

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual([
      expect.objectContaining({
        field: 'scheduled_time',
      }),
    ])
  })

  it('rejects scheduled orders earlier than reopen opening time', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-19T12:00:00.000Z'))

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'crm_customers') {
        return chain({
          data: {
            order_history: {
              total_orders: 0,
            },
          },
          error: null,
        })
      }

      if (table === 'orders_delivery_config') {
        return chain({
          data: {
            opening_time: '11:00:00',
            is_pickup_active: true,
            ordering_paused_until_date: '2026-03-20',
          },
          error: null,
        })
      }

      return chain({ data: null, error: null })
    })

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          scheduled_time: '2026-03-20T09:30:00.000Z',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual([
      expect.objectContaining({
        field: 'scheduled_time',
      }),
    ])
  })

  it('creates an order successfully', async () => {
    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.order_number).toBe('ZAM-20260226-001')
    expect(mockRpc).toHaveBeenCalledWith('next_order_number', { p_channel: 'online' })
    expect(mockRpc).toHaveBeenCalledWith(
      'create_order_with_items',
      expect.objectContaining({
        p_order: expect.objectContaining({ order_number: 'ZAM-20260226-001' }),
        p_order_items: expect.any(Array),
        p_kitchen_ticket: expect.any(Object),
      })
    )
    expect(mockScheduleWebhookDispatch).toHaveBeenCalledWith(
      'order.status_changed',
      expect.objectContaining({
        pos_order_id: 'new-order-id',
        order_number: 'ZAM-20260226-001',
        status: 'pending',
        previous_status: '',
        channel: 'online',
        order_type: 'delivery',
        source: 'online',
        total: 5980,
        currency: 'PLN',
        customer_name: 'Jan Kowalski',
        customer_phone: '+48123456789',
        created_at: '2026-02-26T12:00:00.000Z',
        items: [
          {
            name: 'Burger Classic',
            quantity: 2,
            unit_price: 2990,
            notes: undefined,
          },
        ],
      })
    )
    expect(mockSubmitPosbistroOrder).not.toHaveBeenCalled()
  })

  it('rejects pickup orders when pickup is disabled for the location', async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'crm_customers') {
        return chain({
          data: {
            order_history: {
              total_orders: 0,
            },
          },
          error: null,
        })
      }

      if (table === 'orders_delivery_config') {
        return chain({
          data: {
            opening_time: '11:00:00',
            is_pickup_active: false,
            ordering_paused_until_date: null,
          },
          error: null,
        })
      }

      return chain({ data: null, error: null })
    })

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          delivery_type: 'pickup',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual([
      expect.objectContaining({
        field: 'delivery_type',
      }),
    ])
  })

  it('awaits POSBistro submit for delivery_app orders already confirmed on create', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'next_order_number') {
        return Promise.resolve({
          data: 'WEB-20260310-100',
          error: null,
        })
      }
      if (fn === 'create_order_with_items') {
        return Promise.resolve({
          data: {
            id: 'new-order-id',
            order_number: 'WEB-20260310-100',
            status: 'confirmed',
            channel: 'delivery_app',
            source: 'delivery',
            customer_name: 'Jan Kowalski',
            customer_phone: '+48123456789',
            items: [
              {
                id: 'item-1',
                product_id: '550e8400-e29b-41d4-a716-446655440001',
                product_name: 'Burger Classic',
                quantity: 2,
                unit_price: 29.9,
                modifiers: [],
                subtotal: 59.8,
              },
            ],
            total: 59.8,
            created_at: '2026-03-10T12:00:00.000Z',
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const res = await POST(
      makeRequest('https://preview.example.com/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          channel: 'delivery_app',
          payment_status: 'paid',
          delivery_type: 'delivery',
        }),
      })
    )

    expect(res.status).toBe(201)
    expect(mockSubmitPosbistroOrder).toHaveBeenCalledTimes(1)
    expect(mockSubmitPosbistroOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-order-id',
        status: 'confirmed',
      }),
      expect.objectContaining({
        confirmBaseUrl: 'https://preview.example.com/api/integrations/posbistro/confirm',
      })
    )
  })

  it('returns existing order for duplicate external_order_id (idempotency fast path)', async () => {
    mockServerRepo.findMany.mockResolvedValue([
      {
        id: 'existing-order-id',
        external_order_id: 'EXT-001',
        status: 'pending',
      },
    ])

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          external_order_id: 'EXT-001',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.id).toBe('existing-order-id')
  })

  it('returns existing order when create hits unique violation (race idempotency)', async () => {
    const existingOrder = {
      id: 'existing-order-id',
      external_order_id: 'EXT-RACE',
      status: 'pending',
    }
    mockServerRepo.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([existingOrder])

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'next_order_number') {
        return Promise.resolve({ data: 'WEB-20260303-001', error: null })
      }
      if (fn === 'create_order_with_items') {
        return Promise.resolve({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "idx_orders_orders_external_order_id_unique"',
          },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          channel: 'delivery_app',
          external_order_id: 'EXT-RACE',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.id).toBe('existing-order-id')
  })

  it('returns 422 for invalid body', async () => {
    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({ items: [] }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for invalid JSON', async () => {
    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_JSON')
  })

  it('returns 422 for unavailable product', async () => {
    mockServerRepo.findById.mockResolvedValue({
      ...mockProduct,
      is_available: false,
    })

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.error.details[0].message).toContain('nie jest dostępny')
  })

  it('calculates gross totals and forwards base loyalty points when customer_id is missing', async () => {
    const orderWithModifiers = {
      ...validOrderBody,
      items: [
        {
          product_id: '550e8400-e29b-41d4-a716-446655440001',
          product_name: 'Burger Classic',
          quantity: 2,
          unit_price: 29.9,
          modifiers: [
            {
              modifier_id: 'mod-1',
              name: 'Extra ser',
              price: 4.0,
              quantity: 1,
              modifier_action: 'add',
            },
          ],
        },
      ],
      discount: 5.0,
    }

    await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(orderWithModifiers),
      })
    )

    const createCall = mockRpc.mock.calls.find((call) => call[0] === 'create_order_with_items')
    const payload = createCall?.[1]?.p_order

    expect(payload.subtotal).toBe(67.8)
    // Gross prices: VAT is included in subtotal and must not be added to total.
    expect(payload.tax).toBe(5.02)
    expect(payload.total).toBe(62.8)
    expect(payload.loyalty_points_earned).toBe(62)
  })

  it('adds first-order bonus to estimated loyalty points when customer_id is present', async () => {
    const orderWithKnownCustomer = {
      ...validOrderBody,
      customer_id: 'customer-1',
      items: [
        {
          product_id: '550e8400-e29b-41d4-a716-446655440001',
          product_name: 'Burger Classic',
          quantity: 2,
          unit_price: 29.9,
          modifiers: [
            {
              modifier_id: 'mod-1',
              name: 'Extra ser',
              price: 4.0,
              quantity: 1,
              modifier_action: 'add',
            },
          ],
        },
      ],
      discount: 5.0,
    }

    await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(orderWithKnownCustomer),
      })
    )

    const createCall = mockRpc.mock.calls.find((call) => call[0] === 'create_order_with_items')
    const payload = createCall?.[1]?.p_order

    expect(payload.total).toBe(62.8)
    expect(payload.loyalty_points_earned).toBe(112)
  })

  it('ensures customer and schedules POSBistro submit for confirmed delivery_app orders', async () => {
    mockEnsureCustomerForOrderDraft.mockResolvedValue({
      ...validOrderBody,
      channel: 'delivery_app',
      customer_id: 'customer-1',
      payment_status: 'paid',
    })
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'next_order_number') {
        return Promise.resolve({
          data: 'WEB-20260310-001',
          error: null,
        })
      }
      if (fn === 'create_order_with_items') {
        return Promise.resolve({
          data: {
            id: 'new-order-id',
            order_number: 'WEB-20260310-001',
            status: 'confirmed',
            channel: 'delivery_app',
            customer_id: 'customer-1',
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          channel: 'delivery_app',
          payment_status: 'paid',
        }),
      })
    )

    expect(res.status).toBe(201)
    expect(mockEnsureCustomerForOrderDraft).toHaveBeenCalledTimes(1)
    expect(mockSubmitPosbistroOrder).toHaveBeenCalledTimes(1)
    expect(mockSubmitPosbistroOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-order-id',
        status: 'confirmed',
        customer_id: 'customer-1',
      }),
      expect.objectContaining({
        confirmBaseUrl: 'http://localhost:3000/api/integrations/posbistro/confirm',
      })
    )
  })
})
