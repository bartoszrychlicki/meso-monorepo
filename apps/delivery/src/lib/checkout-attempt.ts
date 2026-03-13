import type { CartItem, LoyaltyCoupon } from '@/stores/cartStore'
import type { AddressFormData, DeliveryFormData, PaymentFormData } from '@/lib/validators/checkout'

const STORAGE_KEY = 'meso-delivery-checkout-attempt'

export interface CheckoutAttemptState {
  fingerprint: string
  externalOrderId: string
  orderId?: string
  createdAt: string
}

type CheckoutFingerprintInput = {
  userId: string
  items: CartItem[]
  deliveryData: DeliveryFormData
  addressData: AddressFormData
  paymentData: PaymentFormData
  promoCode: string | null
  loyaltyCoupon: LoyaltyCoupon | null
  discount: number
  deliveryFee: number
  paymentFee: number
  tip: number
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function safeParse(value: string | null): CheckoutAttemptState | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<CheckoutAttemptState>
    if (
      typeof parsed?.fingerprint !== 'string' ||
      typeof parsed?.externalOrderId !== 'string' ||
      typeof parsed?.createdAt !== 'string'
    ) {
      return null
    }

    return {
      fingerprint: parsed.fingerprint,
      externalOrderId: parsed.externalOrderId,
      orderId: typeof parsed.orderId === 'string' ? parsed.orderId : undefined,
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

function sortAddons(addons: CartItem['addons']) {
  return [...addons].sort((left, right) => {
    if (left.id !== right.id) return left.id.localeCompare(right.id)
    if (left.name !== right.name) return left.name.localeCompare(right.name)
    return left.price - right.price
  })
}

export function buildCheckoutFingerprint(input: CheckoutFingerprintInput): string {
  const payload = {
    userId: input.userId,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      spiceLevel: item.spiceLevel ?? null,
      variantId: item.variantId ?? null,
      variantName: item.variantName ?? null,
      variantPrice: item.variantPrice ?? 0,
      notes: item.notes ?? null,
      addons: sortAddons(item.addons).map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
      })),
    })),
    deliveryData: {
      type: input.deliveryData.type,
      time: input.deliveryData.time,
      scheduledTime: input.deliveryData.scheduledTime ?? null,
    },
    addressData: {
      firstName: input.addressData.firstName.trim(),
      lastName: input.addressData.lastName.trim(),
      email: input.addressData.email.trim(),
      phone: input.addressData.phone.trim(),
      street: input.addressData.street?.trim() ?? null,
      houseNumber: input.addressData.houseNumber?.trim() ?? null,
      city: input.addressData.city?.trim() ?? null,
      postalCode: input.addressData.postalCode?.trim() ?? null,
      notes: input.addressData.notes?.trim() ?? null,
    },
    paymentMethod: input.paymentData.method,
    promoCode: input.promoCode,
    loyaltyCoupon: input.loyaltyCoupon
      ? {
          id: input.loyaltyCoupon.id,
          code: input.loyaltyCoupon.code,
          pointsSpent: input.loyaltyCoupon.points_spent ?? 0,
        }
      : null,
    discount: input.discount,
    deliveryFee: input.deliveryFee,
    paymentFee: input.paymentFee,
    tip: input.tip,
  }

  return JSON.stringify(payload)
}

export function getCheckoutAttempt(): CheckoutAttemptState | null {
  const storage = getStorage()
  if (!storage) return null
  return safeParse(storage.getItem(STORAGE_KEY))
}

export function saveCheckoutAttempt(state: CheckoutAttemptState) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearCheckoutAttempt() {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(STORAGE_KEY)
}
