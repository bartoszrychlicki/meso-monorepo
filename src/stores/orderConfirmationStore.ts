import { create } from 'zustand'
import type { CartItem } from './cartStore'

export interface OrderConfirmation {
  orderId: string
  orderNumber: string
  items: CartItem[]
  deliveryType: 'delivery' | 'pickup'
  deliveryAddress: {
    street?: string
    houseNumber?: string
    apartmentNumber?: string
    city?: string
    firstName?: string
    lastName?: string
  } | null
  pickupLocation: {
    name: string
    address: string
    city: string
  } | null
  subtotal: number
  deliveryFee: number
  discount: number
  tip: number
  total: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  estimatedTime: string
  createdAt: string
  loyaltyPointsEarned?: number
}

type ConfirmationUpdater = OrderConfirmation | ((prev: OrderConfirmation | null) => OrderConfirmation | null)

interface OrderConfirmationState {
  confirmation: OrderConfirmation | null
  setConfirmation: (data: ConfirmationUpdater) => void
  clearConfirmation: () => void
}

export const useOrderConfirmationStore = create<OrderConfirmationState>()((set) => ({
  confirmation: null,
  setConfirmation: (data) => set((state) => ({
    confirmation: typeof data === 'function' ? data(state.confirmation) : data,
  })),
  clearConfirmation: () => set({ confirmation: null }),
}))
