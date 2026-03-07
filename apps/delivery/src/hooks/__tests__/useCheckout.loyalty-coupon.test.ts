import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(),
  }),
}))

vi.mock('@/stores/cartStore', () => ({
  useCartStore: () => ({
    items: [],
    getDeliveryFee: () => 0,
    getPaymentFee: () => 0,
    getDiscount: () => 0,
    tip: 0,
    promoCode: null,
    loyaltyCoupon: null,
    clearCart: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
  }),
}))

vi.mock('@/app/actions/create-order', () => ({
  createOrderAction: vi.fn(),
}))

import { markLoyaltyCouponAsUsed } from '../useCheckout'

describe('markLoyaltyCouponAsUsed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the server endpoint with coupon and order ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await markLoyaltyCouponAsUsed('coupon-1', 'order-1')

    expect(fetchMock).toHaveBeenCalledWith('/api/loyalty/use-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponId: 'coupon-1', orderId: 'order-1' }),
    })
  })

  it('throws the API error when the endpoint rejects the coupon update', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Kupon nie jest już aktywny' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(markLoyaltyCouponAsUsed('coupon-1', 'order-1')).rejects.toThrow(
      'Kupon nie jest już aktywny'
    )
  })
})
