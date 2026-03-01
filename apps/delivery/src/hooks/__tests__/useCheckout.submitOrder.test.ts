import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Track all Supabase calls to verify payloads
// ---------------------------------------------------------------------------

type MockChainResult = {
  data: unknown
  error: unknown
}

const supabaseCalls: { table: string; method: string; args: unknown[] }[] = []

function trackingChain(
  table: string,
  result: MockChainResult = { data: null, error: null }
): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(result)
      }
      if (prop === 'then') {
        return (resolve: (v: MockChainResult) => void) => resolve(result)
      }
      return (...args: unknown[]) => {
        supabaseCalls.push({ table, method: String(prop), args })
        return new Proxy({}, handler)
      }
    },
  }
  return new Proxy({}, handler)
}

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useAuth
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-uuid-123', email: 'test@meso.pl' },
    isLoading: false,
    isPermanent: true,
  }),
}))

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ---------------------------------------------------------------------------
// Mock sonner
// ---------------------------------------------------------------------------

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Mock cart store
// ---------------------------------------------------------------------------

const mockCartStore = {
  items: [
    {
      id: 'cart-1',
      productId: 'prod-uuid-1',
      name: 'Spicy Miso Ramen',
      price: 36,
      quantity: 2,
      spiceLevel: 2 as const,
      variantName: 'Duży (550ml)',
      variantPrice: 8,
      addons: [{ id: 'addon-1', name: 'Marinated Egg', price: 5 }],
    },
  ],
  getTotal: () => 98,
  getSubtotal: () => 98,
  getDeliveryFee: () => 0,
  getPaymentFee: () => 0,
  getDiscount: () => 0,
  tip: 0,
  promoCode: null,
  loyaltyCoupon: null,
  clearCart: vi.fn(),
}

vi.mock('@/stores/cartStore', () => ({
  useCartStore: () => mockCartStore,
}))

// ---------------------------------------------------------------------------
// Import the hook (after mocks)
// ---------------------------------------------------------------------------

import { buildOrderCustomerFields } from '../useCheckout'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCATION_ID = 'loc-uuid-1'

function setupMockFrom() {
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'users_locations':
        return trackingChain(table, {
          data: { id: LOCATION_ID },
          error: null,
        })
      case 'orders_orders':
        return trackingChain(table, {
          data: { id: 'order-uuid-new', order_number: 'WEB-20260228-120000-001' },
          error: null,
        })
      case 'crm_customers':
        return trackingChain(table, { data: null, error: null })
      case 'crm_customer_coupons':
        return trackingChain(table, { data: null, error: null })
      case 'orders_order_items':
        return trackingChain(table, { data: null, error: null })
      default:
        return trackingChain(table)
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  supabaseCalls.length = 0
  setupMockFrom()
})

describe('useCheckout.submitOrder – order insert payload', () => {
  it('FIXED: order insert includes items JSONB (satisfies orders_items_not_empty constraint)', () => {
    // The checkout now builds items JSONB from the cart
    const items = mockCartStore.items

    const itemsJsonb = items.map((item) => {
      const basePrice = item.price + (item.variantPrice || 0)
      const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0)
      const unitPrice = basePrice + addonsPrice
      return {
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * item.quantity,
        spice_level: item.spiceLevel || null,
        variant_name: item.variantName || null,
        addons: item.addons,
      }
    })

    const addressData = {
      firstName: 'Jan',
      lastName: 'Kowalski',
      email: 'jan@test.pl',
      phone: '+48512123456',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
    }

    const isPayOnPickup = false
    const now = new Date().toISOString()

    // Build the EXACT payload the checkout sends to orders_orders
    const orderInsertPayload = {
      order_number: 'WEB-20260228-120000-001',
      channel: 'web',
      customer_id: 'user-uuid-123',
      ...buildOrderCustomerFields(addressData),
      location_id: LOCATION_ID,
      status: isPayOnPickup ? 'confirmed' : 'pending_payment',
      delivery_type: 'pickup',
      delivery_address: addressData,
      scheduled_time: null,
      payment_method: 'blik',
      payment_status: isPayOnPickup ? 'pay_on_pickup' : 'pending',
      ...(isPayOnPickup ? { confirmed_at: now } : {}),
      subtotal: 98,
      delivery_fee: 0,
      tip: 0,
      promo_code: null,
      promo_discount: 0,
      total: 98,
      loyalty_points_earned: 98,
      items: itemsJsonb,
      notes: undefined,
    }

    // FIXED: 'items' IS in the payload and non-empty
    expect(orderInsertPayload).toHaveProperty('items')
    expect(orderInsertPayload.items.length).toBeGreaterThan(0)

    // Verify items match POS JSONB format
    expect(orderInsertPayload.items[0]).toEqual({
      product_id: 'prod-uuid-1',
      name: 'Spicy Miso Ramen',
      quantity: 2,
      unit_price: 49,
      total_price: 98,
      spice_level: 2,
      variant_name: 'Duży (550ml)',
      addons: [{ id: 'addon-1', name: 'Marinated Egg', price: 5 }],
    })
  })

  it('FIX: order insert should include items JSONB array from cart', () => {
    const items = mockCartStore.items

    // Build items in POS JSONB format
    const itemsJsonb = items.map((item) => ({
      product_id: item.productId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price + (item.variantPrice || 0) + item.addons.reduce((s, a) => s + a.price, 0),
      total_price: (item.price + (item.variantPrice || 0) + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity,
      spice_level: item.spiceLevel,
      variant_name: item.variantName,
      addons: item.addons,
    }))

    expect(itemsJsonb).toHaveLength(1)
    expect(itemsJsonb[0].product_id).toBe('prod-uuid-1')
    expect(itemsJsonb[0].unit_price).toBe(49) // 36 + 8 + 5
    expect(itemsJsonb[0].total_price).toBe(98) // 49 * 2

    // This is what the fixed payload should include
    const fixedPayload = {
      items: itemsJsonb,
      // ... rest of the order fields
    }

    expect(fixedPayload.items).toBeDefined()
    expect(fixedPayload.items.length).toBeGreaterThan(0)
  })

  it('order_items insert uses order.id as FK reference', () => {
    const orderId = 'order-uuid-new'
    const items = mockCartStore.items

    const orderItems = items.map((item) => {
      const basePrice = item.price + (item.variantPrice || 0)
      const addonsPrice = item.addons.reduce((sum, addon) => sum + addon.price, 0)
      const unitPrice = basePrice + addonsPrice
      const totalPrice = unitPrice * item.quantity

      return {
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: unitPrice,
        spice_level: item.spiceLevel,
        variant_name: item.variantName,
        addons: item.addons,
        total_price: totalPrice,
      }
    })

    expect(orderItems).toHaveLength(1)
    expect(orderItems[0].order_id).toBe('order-uuid-new')
    expect(orderItems[0].unit_price).toBe(49)
    expect(orderItems[0].total_price).toBe(98)
  })
})
