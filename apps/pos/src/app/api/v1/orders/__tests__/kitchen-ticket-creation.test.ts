import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}))

const mockServerRepo = {
  findMany: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
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

const mockRpc = vi.fn()
const mockServiceFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: mockServiceFrom,
    rpc: mockRpc,
  }),
}))

import { authorizeRequest, isApiKey } from '@/lib/api/auth'
import { POST } from '../route'

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>

const validApiKey = {
  id: 'key-1',
  permissions: ['orders:read', 'orders:write'],
}

const mockProduct = {
  id: 'prod-1',
  name: 'Ramen',
  is_available: true,
  variants: [],
}

const validOrderInput = {
  channel: 'delivery_app',
  source: 'delivery',
  location_id: 'loc-1',
  customer_id: 'cust-1',
  customer_name: 'Test Customer',
  customer_phone: '+48500100100',
  payment_method: 'pay_on_pickup',
  payment_status: 'pay_on_pickup',
  delivery_type: 'pickup' as const,
  metadata: {
    payment_fee: 2,
  },
  items: [
    {
      product_id: 'prod-1',
      product_name: 'Ramen',
      quantity: 2,
      unit_price: 35,
      modifiers: [
        { modifier_id: 'mod-1', name: 'Extra Chashu', price: 8, quantity: 1, modifier_action: 'add' },
        { modifier_id: 'mod-1b', name: 'Extra Chashu', price: 8, quantity: 1, modifier_action: 'add' },
        { modifier_id: 'mod-2', name: 'Cebula', price: 0, quantity: 1, modifier_action: 'remove' },
      ],
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

describe('POST /api/v1/orders — transactional create payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockAuth.mockResolvedValue(validApiKey)
    mockIsApiKey.mockReturnValue(true)
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
        return Promise.resolve({ data: 'WEB-20260303-001', error: null })
      }
      if (fn === 'create_order_with_items') {
        return Promise.resolve({
          data: {
            id: 'order-1',
            order_number: 'WEB-20260303-001',
            status: 'confirmed',
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  it('sends kitchen ticket and relational items to create_order_with_items RPC', async () => {
    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderInput),
      })
    )

    expect(res.status).toBe(201)
    const createCall = mockRpc.mock.calls.find((call) => call[0] === 'create_order_with_items')
    const payload = createCall?.[1]

    expect(payload).toBeDefined()
    expect(payload.p_order.order_number).toBe('WEB-20260303-001')
    expect(payload.p_order.total).toBe(104)
    expect(payload.p_order.loyalty_points_earned).toBe(154)
    expect(payload.p_order_items).toHaveLength(1)
    expect(payload.p_order_items[0]).toMatchObject({
      product_id: 'prod-1',
      quantity: 2,
      unit_price: 35,
      total_price: 102,
    })
    expect(payload.p_order_items[0].addons).toEqual([
      {
        id: 'mod-1',
        name: 'Extra Chashu',
        price: 8,
        quantity: 1,
        modifier_action: 'add',
      },
      {
        id: 'mod-1b',
        name: 'Extra Chashu',
        price: 8,
        quantity: 1,
        modifier_action: 'add',
      },
      {
        id: 'mod-2',
        name: 'Cebula',
        price: 0,
        quantity: 1,
        modifier_action: 'remove',
      },
    ])
    expect(payload.p_kitchen_ticket).toMatchObject({
      order_number: 'WEB-20260303-001',
      location_id: 'loc-1',
      status: 'pending',
      priority: 0,
    })
    expect(payload.p_kitchen_ticket.items).toHaveLength(1)
    expect(payload.p_kitchen_ticket.items[0]).toMatchObject({
      product_name: 'Ramen',
      quantity: 2,
      modifiers: ['Extra Chashu', 'Extra Chashu', '- Cebula'],
      is_done: false,
    })
  })

  it('returns 500 when transactional RPC fails', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'next_order_number') {
        return Promise.resolve({ data: 'WEB-20260303-001', error: null })
      }
      if (fn === 'create_order_with_items') {
        return Promise.resolve({
          data: null,
          error: { code: 'XX000', message: 'transaction failed' },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderInput),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('ORDER_CREATE_FAILED')
  })
})
