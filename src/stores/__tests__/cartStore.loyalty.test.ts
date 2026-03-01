import { describe, it, expect, beforeEach } from 'vitest'
import {
  useCartStore,
  selectDeliveryFee,
  selectDiscount,
  selectTotal,
  type LoyaltyCoupon,
  type CartItem,
} from '@/stores/cartStore'

// ── Fixtures ────────────────────────────────────────────────────────────────

const sampleDiscountCoupon: LoyaltyCoupon = {
  id: 'test-coupon-1',
  code: 'MESO-ABC12',
  coupon_type: 'discount',
  discount_value: 10,
  free_product_name: null,
  expires_at: new Date(Date.now() + 86400000).toISOString(),
}

const sampleFreeDeliveryCoupon: LoyaltyCoupon = {
  id: 'test-coupon-2',
  code: 'MESO-DEL00',
  coupon_type: 'free_delivery',
  discount_value: null,
  free_product_name: null,
  expires_at: new Date(Date.now() + 86400000).toISOString(),
}

const sampleFreeProductCoupon: LoyaltyCoupon = {
  id: 'test-coupon-3',
  code: 'MESO-GYOZA',
  coupon_type: 'free_product',
  discount_value: null,
  free_product_name: 'Gyoza (6 szt.)',
  expires_at: new Date(Date.now() + 86400000).toISOString(),
}

const sampleItems: CartItem[] = [
  {
    id: 'item-1',
    productId: 'prod-1',
    name: 'Spicy Miso Ramen',
    price: 36,
    quantity: 2,
    addons: [],
  },
]

// ── Reset ───────────────────────────────────────────────────────────────────

const freshState = {
  items: [] as CartItem[],
  locationId: null,
  deliveryType: 'pickup' as const,
  paymentType: 'online' as const,
  payOnPickupFee: 2,
  promoCode: null,
  promoDiscount: 0,
  promoDiscountType: null,
  loyaltyCoupon: null,
  tip: 0,
  minOrderValue: 35,
  baseDeliveryFee: 7.99,
}

beforeEach(() => {
  useCartStore.setState(freshState)
})

// ── 1. Loyalty coupon state management ──────────────────────────────────────

describe('Loyalty coupon state management', () => {
  it('setLoyaltyCoupon stores the coupon correctly', () => {
    useCartStore.getState().setLoyaltyCoupon(sampleDiscountCoupon)

    const { loyaltyCoupon } = useCartStore.getState()
    expect(loyaltyCoupon).toEqual(sampleDiscountCoupon)
  })

  it('setLoyaltyCoupon clears promo code (mutual exclusion)', () => {
    // Set a promo code first
    useCartStore.getState().setPromoCode('PIERWSZYRAMEN', 15, 'percent')
    expect(useCartStore.getState().promoCode).toBe('PIERWSZYRAMEN')

    // Now set coupon — should clear promo
    useCartStore.getState().setLoyaltyCoupon(sampleDiscountCoupon)

    const state = useCartStore.getState()
    expect(state.promoCode).toBeNull()
    expect(state.promoDiscount).toBe(0)
    expect(state.promoDiscountType).toBeNull()
    expect(state.loyaltyCoupon).toEqual(sampleDiscountCoupon)
  })

  it('clearLoyaltyCoupon removes the coupon', () => {
    useCartStore.getState().setLoyaltyCoupon(sampleDiscountCoupon)
    expect(useCartStore.getState().loyaltyCoupon).not.toBeNull()

    useCartStore.getState().clearLoyaltyCoupon()
    expect(useCartStore.getState().loyaltyCoupon).toBeNull()
  })

  it('clearCart also clears the loyalty coupon', () => {
    useCartStore.getState().setLoyaltyCoupon(sampleFreeDeliveryCoupon)
    expect(useCartStore.getState().loyaltyCoupon).not.toBeNull()

    useCartStore.getState().clearCart()
    expect(useCartStore.getState().loyaltyCoupon).toBeNull()
  })
})

// ── 2. Promo code / coupon mutual exclusion ─────────────────────────────────

describe('Promo code / coupon mutual exclusion', () => {
  it('setPromoCode clears loyalty coupon', () => {
    useCartStore.getState().setLoyaltyCoupon(sampleDiscountCoupon)
    expect(useCartStore.getState().loyaltyCoupon).not.toBeNull()

    useCartStore.getState().setPromoCode('MESOCLUB', 10, 'percent')

    const state = useCartStore.getState()
    expect(state.loyaltyCoupon).toBeNull()
    expect(state.promoCode).toBe('MESOCLUB')
  })

  it('setting promo code after coupon clears coupon', () => {
    useCartStore.getState().setLoyaltyCoupon(sampleFreeDeliveryCoupon)
    useCartStore.getState().setPromoCode('DOSTAWAZERO', 0, 'free_delivery')

    const state = useCartStore.getState()
    expect(state.loyaltyCoupon).toBeNull()
    expect(state.promoCode).toBe('DOSTAWAZERO')
    expect(state.promoDiscountType).toBe('free_delivery')
  })

  it('setting coupon after promo code clears promo code', () => {
    useCartStore.getState().setPromoCode('PIERWSZYRAMEN', 15, 'percent')
    useCartStore.getState().setLoyaltyCoupon(sampleFreeProductCoupon)

    const state = useCartStore.getState()
    expect(state.promoCode).toBeNull()
    expect(state.promoDiscount).toBe(0)
    expect(state.promoDiscountType).toBeNull()
    expect(state.loyaltyCoupon).toEqual(sampleFreeProductCoupon)
  })
})

// ── 3. Discount calculations with coupons ───────────────────────────────────

describe('Discount calculations with coupons', () => {
  it('getDiscount returns coupon discount value when coupon type is discount', () => {
    useCartStore.setState({ items: sampleItems, loyaltyCoupon: sampleDiscountCoupon })

    expect(useCartStore.getState().getDiscount()).toBe(10)
  })

  it('getDiscount returns 0 for free_delivery coupon', () => {
    useCartStore.setState({ items: sampleItems, loyaltyCoupon: sampleFreeDeliveryCoupon })

    expect(useCartStore.getState().getDiscount()).toBe(0)
  })

  it('getDiscount returns 0 for free_product coupon with null discount_value', () => {
    useCartStore.setState({ items: sampleItems, loyaltyCoupon: sampleFreeProductCoupon })

    expect(useCartStore.getState().getDiscount()).toBe(0)
  })

  it('getDiscount returns discount_value for free_product coupon with computed price', () => {
    const couponWithPrice: LoyaltyCoupon = {
      ...sampleFreeProductCoupon,
      discount_value: 22.90,
    }
    useCartStore.setState({ items: sampleItems, loyaltyCoupon: couponWithPrice })

    expect(useCartStore.getState().getDiscount()).toBe(22.90)
  })

  it('promo code discount takes priority (promo code set = no coupon)', () => {
    // When setPromoCode is called, it clears coupon anyway,
    // but let's verify discount uses promo code logic
    useCartStore.setState({
      items: sampleItems,
      promoCode: 'MESOCLUB',
      promoDiscount: 10,
      promoDiscountType: 'percent',
      loyaltyCoupon: null, // already cleared by mutual exclusion
    })

    // 10% of subtotal (36 * 2 = 72) = 7.2
    expect(useCartStore.getState().getDiscount()).toBeCloseTo(7.2)
  })
})

// ── 4. Delivery fee with coupons ────────────────────────────────────────────

describe('Delivery fee with coupons', () => {
  it('getDeliveryFee returns 0 when coupon type is free_delivery and delivery type is delivery', () => {
    useCartStore.setState({
      deliveryType: 'delivery',
      loyaltyCoupon: sampleFreeDeliveryCoupon,
    })

    expect(useCartStore.getState().getDeliveryFee()).toBe(0)
  })

  it('getDeliveryFee returns base fee when coupon type is discount', () => {
    useCartStore.setState({
      deliveryType: 'delivery',
      loyaltyCoupon: sampleDiscountCoupon,
    })

    expect(useCartStore.getState().getDeliveryFee()).toBe(7.99)
  })

  it('getDeliveryFee returns 0 when delivery type is pickup regardless of coupon', () => {
    useCartStore.setState({
      deliveryType: 'pickup',
      loyaltyCoupon: sampleFreeDeliveryCoupon,
    })

    expect(useCartStore.getState().getDeliveryFee()).toBe(0)

    // Also with discount coupon
    useCartStore.setState({
      deliveryType: 'pickup',
      loyaltyCoupon: sampleDiscountCoupon,
    })

    expect(useCartStore.getState().getDeliveryFee()).toBe(0)
  })
})

// ── 5. Total calculation with coupons ───────────────────────────────────────

describe('Total calculation with coupons', () => {
  it('getTotal correctly applies coupon discount', () => {
    useCartStore.setState({
      items: sampleItems,
      deliveryType: 'pickup',
      loyaltyCoupon: sampleDiscountCoupon,
    })

    // subtotal = 36 * 2 = 72, discount = 10, delivery = 0, payment = 0, tip = 0
    // total = 72 - 10 + 0 + 0 + 0 = 62
    expect(useCartStore.getState().getTotal()).toBe(62)
  })

  it('getTotal correctly handles free_delivery coupon', () => {
    useCartStore.setState({
      items: sampleItems,
      deliveryType: 'delivery',
      loyaltyCoupon: sampleFreeDeliveryCoupon,
    })

    // subtotal = 72, discount = 0, delivery = 0 (free), payment = 0, tip = 0
    // total = 72 - 0 + 0 + 0 + 0 = 72
    expect(useCartStore.getState().getTotal()).toBe(72)
  })

  it('getTotal without free_delivery coupon includes delivery fee', () => {
    useCartStore.setState({
      items: sampleItems,
      deliveryType: 'delivery',
      loyaltyCoupon: null,
    })

    // subtotal = 72, discount = 0, delivery = 7.99, payment = 0, tip = 0
    // total = 72 + 7.99 = 79.99
    expect(useCartStore.getState().getTotal()).toBeCloseTo(79.99)
  })
})

// ── 6. Stable selectors ─────────────────────────────────────────────────────

describe('Stable selectors', () => {
  it('selectDeliveryFee handles loyalty coupon free_delivery', () => {
    const state = {
      ...freshState,
      deliveryType: 'delivery' as const,
      loyaltyCoupon: sampleFreeDeliveryCoupon,
    }

    expect(selectDeliveryFee(state as Parameters<typeof selectDeliveryFee>[0])).toBe(0)
  })

  it('selectDeliveryFee returns base fee when coupon is discount type', () => {
    const state = {
      ...freshState,
      deliveryType: 'delivery' as const,
      loyaltyCoupon: sampleDiscountCoupon,
    }

    expect(selectDeliveryFee(state as Parameters<typeof selectDeliveryFee>[0])).toBe(7.99)
  })

  it('selectDiscount handles loyalty coupon discount', () => {
    const state = {
      ...freshState,
      items: sampleItems,
      loyaltyCoupon: sampleDiscountCoupon,
    }

    expect(selectDiscount(state as Parameters<typeof selectDiscount>[0])).toBe(10)
  })

  it('selectDiscount returns 0 for free_delivery coupon', () => {
    const state = {
      ...freshState,
      items: sampleItems,
      loyaltyCoupon: sampleFreeDeliveryCoupon,
    }

    expect(selectDiscount(state as Parameters<typeof selectDiscount>[0])).toBe(0)
  })

  it('selectTotal handles loyalty coupon discount correctly', () => {
    const state = {
      ...freshState,
      items: sampleItems,
      deliveryType: 'pickup' as const,
      loyaltyCoupon: sampleDiscountCoupon,
    }

    // subtotal = 72, discount = 10, delivery = 0, payment = 0, tip = 0
    // total = 72 - 10 + 0 + 0 + 0 = 62
    expect(selectTotal(state as Parameters<typeof selectTotal>[0])).toBe(62)
  })

  it('selectTotal handles loyalty coupon free_delivery correctly', () => {
    const state = {
      ...freshState,
      items: sampleItems,
      deliveryType: 'delivery' as const,
      loyaltyCoupon: sampleFreeDeliveryCoupon,
    }

    // subtotal = 72, discount = 0, delivery = 0 (free), payment = 0, tip = 0
    // total = 72
    expect(selectTotal(state as Parameters<typeof selectTotal>[0])).toBe(72)
  })

  it('selectTotal includes delivery fee when no free_delivery coupon', () => {
    const state = {
      ...freshState,
      items: sampleItems,
      deliveryType: 'delivery' as const,
      loyaltyCoupon: null,
    }

    // subtotal = 72, delivery = 7.99, total = 79.99
    expect(selectTotal(state as Parameters<typeof selectTotal>[0])).toBeCloseTo(79.99)
  })
})
