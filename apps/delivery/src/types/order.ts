import type { Product } from './menu'

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'awaiting_courier'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled'

export type DeliveryType = 'delivery' | 'pickup'

export type PaymentMethod = 'blik' | 'card' | 'cash' | 'pay_on_pickup'

export interface DeliveryAddress {
  street: string
  building_number: string
  apartment_number?: string
  city: string
  postal_code: string
  notes?: string
}

export interface Order {
  id: string
  order_number?: string
  customer_id: string
  location_id: string
  status: OrderStatus
  delivery_type: DeliveryType
  delivery_address?: DeliveryAddress
  scheduled_time?: string
  estimated_prep_time?: number
  estimated_delivery_time?: number
  payment_method: PaymentMethod
  payment_status: string
  subtotal: number
  delivery_fee: number
  promo_code?: string
  promo_discount: number
  tip: number
  total: number
  loyalty_points_earned: number
  loyalty_points_used: number
  notes?: string
  paid_at?: string
  confirmed_at?: string
  preparing_at?: string
  ready_at?: string
  picked_up_at?: string
  delivered_at?: string
  cancelled_at?: string
  created_at: string
  // Relations
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  spice_level?: 1 | 2 | 3
  variant_id?: string
  addons: OrderItemAddon[]
  notes?: string
  total_price: number
  created_at: string
  // Relations
  product?: Product
}

export interface OrderItemAddon {
  id: string
  name: string
  price: number
}

export const ORDER_STATUS_MESSAGES: Record<OrderStatus, { title: string; subtitle: string; emoji: string }> = {
  pending_payment: {
    title: 'Oczekujemy na płatność',
    subtitle: 'Dokończ płatność, aby złożyć zamówienie',
    emoji: '💳',
  },
  confirmed: {
    title: 'Zamówienie przyjęte!',
    subtitle: 'Zaraz zabieramy się do roboty',
    emoji: '✅',
  },
  preparing: {
    title: 'Gotujemy Twój ramen! 🍜',
    subtitle: 'Nasz kucharz pracuje nad Twoim zamówieniem',
    emoji: '👨‍🍳',
  },
  ready: {
    title: 'Gotowe!',
    subtitle: 'Zamówienie czeka na kuriera',
    emoji: '📦',
  },
  awaiting_courier: {
    title: 'Szukamy kuriera',
    subtitle: 'Za chwilę wyruszy w Twoją stronę',
    emoji: '🔍',
  },
  in_delivery: {
    title: 'Kurier w drodze! 🛵',
    subtitle: 'Śledź go na mapie',
    emoji: '🛵',
  },
  delivered: {
    title: 'Smacznego! 🍜',
    subtitle: 'Dziękujemy za zamówienie',
    emoji: '🎉',
  },
  cancelled: {
    title: 'Zamówienie anulowane',
    subtitle: 'Jeśli zapłaciłeś, zwrot w ciągu 3 dni',
    emoji: '❌',
  },
}

// Extended order type for order tracking
export interface OrderWithItems extends Omit<Order, 'items'> {
  items: OrderItemWithProduct[]
  location?: {
    name: string
    address: string
    phone: string | null
  }
}

export interface OrderItemWithProduct extends Omit<OrderItem, 'product'> {
  product: {
    id: string
    name: string
    image_url: string | null
  }
  variant_name?: string | null
}

// Status colors and icons for UI
export const ORDER_STATUS_STYLES: Record<OrderStatus, { color: string; bgColor: string; icon: string }> = {
  pending_payment: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: 'Clock' },
  confirmed: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: 'CheckCircle' },
  preparing: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: 'ChefHat' },
  ready: { color: 'text-green-500', bgColor: 'bg-green-500/10', icon: 'Package' },
  awaiting_courier: { color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: 'Search' },
  in_delivery: { color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: 'Truck' },
  delivered: { color: 'text-green-600', bgColor: 'bg-green-600/10', icon: 'CheckCircle2' },
  cancelled: { color: 'text-red-500', bgColor: 'bg-red-500/10', icon: 'XCircle' },
}

// Timeline steps for order tracking
export const ORDER_TIMELINE_STEPS = [
  { status: 'confirmed' as OrderStatus, label: 'Zamówione', shortLabel: 'Zamówione' },
  { status: 'preparing' as OrderStatus, label: 'Przygotowywane', shortLabel: 'Gotujemy' },
  { status: 'ready' as OrderStatus, label: 'Gotowe', shortLabel: 'Gotowe' },
  { status: 'in_delivery' as OrderStatus, label: 'W drodze', shortLabel: 'W drodze' },
  { status: 'delivered' as OrderStatus, label: 'Dostarczone', shortLabel: 'Dostarczone' },
]

// Get current step index for timeline
export function getTimelineStepIndex(status: OrderStatus): number {
  const index = ORDER_TIMELINE_STEPS.findIndex(step => step.status === status)
  if (status === 'pending_payment') return -1
  if (status === 'cancelled') return -1
  if (status === 'awaiting_courier') return 2 // same as 'ready'
  return index
}

// Format order date
export function formatOrderDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Format short date for list view
export function formatOrderDateShort(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return `Dziś, ${date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

