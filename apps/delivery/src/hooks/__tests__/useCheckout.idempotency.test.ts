// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPush,
  mockCreateOrderAction,
  mockFetchCustomerIdentityByAuthId,
  mockClearCart,
  toastError,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockCreateOrderAction: vi.fn(),
  mockFetchCustomerIdentityByAuthId: vi.fn(),
  mockClearCart: vi.fn(),
  toastError: vi.fn(),
}))

const mockCartStore = {
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      name: 'Ramen',
      price: 30,
      quantity: 1,
      addons: [],
      variantPrice: 0,
    },
  ],
  getDeliveryFee: () => 0,
  getPaymentFee: () => 2,
  getDiscount: () => 5,
  tip: 3,
  promoCode: 'PROMO5',
  loyaltyCoupon: null,
  clearCart: mockClearCart,
}

const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: () => ({
      order: () => ({
        order: () => ({
          limit: () => ({
            single: () => Promise.resolve({ data: { id: 'loc-1' }, error: null }),
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/stores/cartStore', () => ({
  useCartStore: () => mockCartStore,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'auth-user-1', email: 'jan@test.pl' },
  }),
}))

vi.mock('@/app/actions/create-order', () => ({
  createOrderAction: mockCreateOrderAction,
}))

vi.mock('@/lib/customers', () => ({
  fetchCustomerIdentityByAuthId: mockFetchCustomerIdentityByAuthId,
}))

import { useCheckout } from '../useCheckout'

const deliveryData = {
  type: 'pickup',
  time: 'asap',
  scheduledTime: '',
} as const

const addressData = {
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan@test.pl',
  phone: '500600700',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
  notes: 'bez sezamu',
}

const paymentData = {
  method: 'blik',
} as const

describe('useCheckout idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    mockFetchCustomerIdentityByAuthId.mockResolvedValue({ id: 'crm-customer-1' })
    mockCreateOrderAction.mockResolvedValue({
      success: true,
      data: { id: 'order-1' },
    })
  })

  it('reuses the same external_order_id after payment registration failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'P24 unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCheckout())

    await act(async () => {
      await result.current.submitOrder(
        deliveryData,
        addressData,
        paymentData
      )
    })

    await act(async () => {
      await result.current.submitOrder(
        deliveryData,
        addressData,
        paymentData
      )
    })

    expect(mockCreateOrderAction).toHaveBeenCalledTimes(2)
    const [firstPayload] = mockCreateOrderAction.mock.calls[0]
    const [secondPayload] = mockCreateOrderAction.mock.calls[1]

    expect(firstPayload.external_order_id).toBeDefined()
    expect(secondPayload.external_order_id).toBe(firstPayload.external_order_id)
    expect(secondPayload.metadata).toEqual({ payment_fee: 2 })
    expect(firstPayload.delivery_fee).toBe(0)
    expect(toastError).toHaveBeenCalled()
  })
})
