import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItemAddon {
  id: string
  name: string
  price: number
}

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
  spiceLevel?: 1 | 2 | 3
  variantId?: string
  variantName?: string
  variantPrice?: number
  addons: CartItemAddon[]
  notes?: string
}

type PaymentType = 'online' | 'pay_on_pickup'

export interface LoyaltyCoupon {
  id: string
  code: string
  coupon_type: 'free_delivery' | 'discount' | 'free_product'
  discount_value: number | null
  free_product_name: string | null
  expires_at: string
}

interface CartState {
  items: CartItem[]
  locationId: string | null
  deliveryType: 'delivery' | 'pickup'
  paymentType: PaymentType
  payOnPickupFee: number
  promoCode: string | null
  promoDiscount: number
  promoDiscountType: 'percent' | 'fixed' | 'free_delivery' | null
  loyaltyCoupon: LoyaltyCoupon | null
  tip: number
  minOrderValue: number
  baseDeliveryFee: number

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  setLocation: (locationId: string) => void
  setDeliveryType: (type: 'delivery' | 'pickup') => void
  setPaymentType: (type: PaymentType) => void
  setPayOnPickupFee: (fee: number) => void
  setPromoCode: (code: string, discount: number, discountType: 'percent' | 'fixed' | 'free_delivery') => void
  clearPromoCode: () => void
  setLoyaltyCoupon: (coupon: LoyaltyCoupon) => void
  clearLoyaltyCoupon: () => void
  setTip: (amount: number) => void
  setLocationConfig: (minOrder: number, deliveryFee: number) => void

  // Getters
  getItemCount: () => number
  getSubtotal: () => number
  getDeliveryFee: () => number
  getPaymentFee: () => number
  getDiscount: () => number
  getTotal: () => number
  canCheckout: () => { allowed: boolean; reason?: string }
}

// Fallback defaults (used until location data is loaded from DB)
const DEFAULT_MIN_ORDER_VALUE = 35 // zł
const DEFAULT_DELIVERY_FEE = 7.99 // zł

// Standalone helper – reused by selectors and store methods
function computeSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => {
    const basePrice = (item.price || 0) + (item.variantPrice || 0)
    const addonsPrice = (item.addons || []).reduce((a, addon) => a + (addon.price || 0), 0)
    return sum + (basePrice + addonsPrice) * (item.quantity || 1)
  }, 0)
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      locationId: null,
      deliveryType: 'pickup',
      paymentType: 'online',
      payOnPickupFee: 2,
      promoCode: null,
      promoDiscount: 0,
      promoDiscountType: null,
      loyaltyCoupon: null,
      tip: 0,
      minOrderValue: DEFAULT_MIN_ORDER_VALUE,
      baseDeliveryFee: DEFAULT_DELIVERY_FEE,

      addItem: (item) => {
        const id = `${item.productId}-${item.variantId || 'base'}-${item.spiceLevel || 0}-${JSON.stringify(item.addons || [])}-${Date.now()}`

        // Check if identical item exists (same product, variant, spice level, addons)
        const existingIndex = get().items.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId &&
            i.spiceLevel === item.spiceLevel &&
            JSON.stringify(i.addons || []) === JSON.stringify(item.addons || [])
        )

        if (existingIndex > -1) {
          const items = [...get().items]
          items[existingIndex].quantity += item.quantity
          set({ items })
        } else {
          set({ items: [...get().items, { ...item, id }] })
        }
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }

        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        })
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) })
      },

      clearCart: () => {
        set({
          items: [],
          paymentType: 'online',
          promoCode: null,
          promoDiscount: 0,
          promoDiscountType: null,
          loyaltyCoupon: null,
          tip: 0,
        })
      },

      setLocation: (locationId) => set({ locationId }),

      setDeliveryType: (type) => set({ deliveryType: type }),

      setPaymentType: (type) => set({ paymentType: type }),

      setPayOnPickupFee: (fee) => set({ payOnPickupFee: fee }),

      setPromoCode: (code, discount, discountType) => {
        set({
          promoCode: code,
          promoDiscount: discount,
          promoDiscountType: discountType,
          loyaltyCoupon: null, // One slot: promo OR coupon
        })
      },

      clearPromoCode: () => {
        set({
          promoCode: null,
          promoDiscount: 0,
          promoDiscountType: null,
        })
      },

      setLoyaltyCoupon: (coupon) => {
        set({
          loyaltyCoupon: coupon,
          // One slot: clear promo code when coupon is set
          promoCode: null,
          promoDiscount: 0,
          promoDiscountType: null,
        })
      },

      clearLoyaltyCoupon: () => {
        set({ loyaltyCoupon: null })
      },

      setTip: (amount) => set({ tip: Math.min(200, Math.max(0, amount)) }),

      setLocationConfig: (minOrder, deliveryFee) => {
        set({ minOrderValue: minOrder, baseDeliveryFee: deliveryFee })
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getSubtotal: () => computeSubtotal(get().items),

      getDeliveryFee: () => {
        const { deliveryType, promoDiscountType, loyaltyCoupon, baseDeliveryFee } = get()
        if (deliveryType === 'pickup') return 0
        if (promoDiscountType === 'free_delivery') return 0
        if (loyaltyCoupon?.coupon_type === 'free_delivery') return 0
        return baseDeliveryFee
      },

      getPaymentFee: () => {
        const { paymentType, payOnPickupFee } = get()
        return paymentType === 'pay_on_pickup' ? payOnPickupFee : 0
      },

      getDiscount: () => {
        const { promoDiscount, promoDiscountType, loyaltyCoupon } = get()

        // Promo code discount
        if (promoDiscount && promoDiscountType) {
          if (promoDiscountType === 'percent') {
            return get().getSubtotal() * (promoDiscount / 100)
          }
          if (promoDiscountType === 'fixed') {
            return promoDiscount
          }
          return 0 // free_delivery is handled in getDeliveryFee
        }

        // Loyalty coupon discount (discount or free_product with computed value)
        if ((loyaltyCoupon?.coupon_type === 'discount' || loyaltyCoupon?.coupon_type === 'free_product') && loyaltyCoupon.discount_value) {
          return loyaltyCoupon.discount_value
        }

        return 0
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        const deliveryFee = get().getDeliveryFee()
        const paymentFee = get().getPaymentFee()
        const discount = get().getDiscount()
        const tip = get().tip

        return Math.max(0, subtotal - discount + deliveryFee + paymentFee + tip)
      },

      canCheckout: () => {
        const items = get().items
        const subtotal = get().getSubtotal()
        const { minOrderValue } = get()

        if (items.length === 0) {
          return { allowed: false, reason: 'Koszyk jest pusty' }
        }

        if (subtotal < minOrderValue) {
          const missing = (minOrderValue - subtotal).toFixed(2)
          return {
            allowed: false,
            reason: `Minimalna wartość zamówienia to ${minOrderValue} zł. Brakuje ${missing} zł.`,
          }
        }

        return { allowed: true }
      },
    }),
    {
      name: 'meso-cart',
      partialize: (state) => ({
        items: state.items,
        locationId: state.locationId,
        deliveryType: state.deliveryType,
        loyaltyCoupon: state.loyaltyCoupon,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<CartState>
        const items = (p.items || []).filter(
          (item) => item && typeof item.price === 'number' && !isNaN(item.price) && item.productId
        ).map((item) => ({
          ...item,
          addons: item.addons || [],
          quantity: item.quantity || 1,
        }))
        // Clamp tip on rehydration to prevent stale values above limit
        const tip = Math.min(200, Math.max(0, p.tip ?? 0))
        return { ...current, ...p, items, tip }
      },
    }
  )
)

// ── Stable selectors (safe for use in components) ──
export const selectItemCount = (s: CartState) =>
  s.items.reduce((sum, item) => sum + item.quantity, 0)

export const selectSubtotal = (s: CartState) => computeSubtotal(s.items)

export const selectDeliveryFee = (s: CartState) => {
  if (s.deliveryType === 'pickup') return 0
  if (s.promoDiscountType === 'free_delivery') return 0
  if (s.loyaltyCoupon?.coupon_type === 'free_delivery') return 0
  return s.baseDeliveryFee
}

export const selectDiscount = (s: CartState) => {
  if (s.promoDiscount && s.promoDiscountType) {
    if (s.promoDiscountType === 'percent') return computeSubtotal(s.items) * (s.promoDiscount / 100)
    if (s.promoDiscountType === 'fixed') return s.promoDiscount
    return 0
  }
  if ((s.loyaltyCoupon?.coupon_type === 'discount' || s.loyaltyCoupon?.coupon_type === 'free_product') && s.loyaltyCoupon.discount_value) {
    return s.loyaltyCoupon.discount_value
  }
  return 0
}

export const selectPaymentFee = (s: CartState) =>
  s.paymentType === 'pay_on_pickup' ? s.payOnPickupFee : 0

export const selectTotal = (s: CartState) => {
  const subtotal = computeSubtotal(s.items)
  let deliveryFee = s.baseDeliveryFee
  if (s.deliveryType === 'pickup') deliveryFee = 0
  else if (s.promoDiscountType === 'free_delivery') deliveryFee = 0
  else if (s.loyaltyCoupon?.coupon_type === 'free_delivery') deliveryFee = 0
  const paymentFee = s.paymentType === 'pay_on_pickup' ? s.payOnPickupFee : 0
  let discount = 0
  if (s.promoDiscount && s.promoDiscountType) {
    if (s.promoDiscountType === 'percent') discount = subtotal * (s.promoDiscount / 100)
    else if (s.promoDiscountType === 'fixed') discount = s.promoDiscount
  } else if ((s.loyaltyCoupon?.coupon_type === 'discount' || s.loyaltyCoupon?.coupon_type === 'free_product') && s.loyaltyCoupon.discount_value) {
    discount = s.loyaltyCoupon.discount_value
  }
  return Math.max(0, subtotal - discount + deliveryFee + paymentFee + s.tip)
}
