import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}))

vi.mock('@/modules/orders/repository', () => ({
  ordersRepository: {
    findAll: vi.fn(),
    findMany: vi.fn(),
    findByStatus: vi.fn(),
    findByDateRange: vi.fn(),
    findByCustomer: vi.fn(),
  },
}))

vi.mock('@/modules/menu/repository', () => ({
  productsRepository: {
    findById: vi.fn(),
  },
}))

const mockRpc = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    rpc: mockRpc,
  }),
}))

import { authorizeRequest, isApiKey } from '@/lib/api/auth'
import { ordersRepository } from '@/modules/orders/repository'
import { productsRepository } from '@/modules/menu/repository'
import { GET, POST } from '../orders/route'

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>
const mockFindMany = ordersRepository.findMany as ReturnType<typeof vi.fn>
const mockFindById = productsRepository.findById as ReturnType<typeof vi.fn>

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
    ;(ordersRepository.findAll as ReturnType<typeof vi.fn>).mockResolvedValue({
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
    mockAuth.mockResolvedValue(validApiKey)
    mockIsApiKey.mockReturnValue(true)
    mockFindById.mockResolvedValue(mockProduct)
    mockFindMany.mockResolvedValue([])
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
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
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
  })

  it('returns existing order for duplicate external_order_id (idempotency fast path)', async () => {
    mockFindMany.mockResolvedValue([
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
    mockFindMany
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
    mockFindById.mockResolvedValue({
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

  it('calculates totals and forwards them to transactional RPC payload', async () => {
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
    expect(payload.tax).toBe(5.42)
    expect(payload.total).toBe(68.22)
  })
})
