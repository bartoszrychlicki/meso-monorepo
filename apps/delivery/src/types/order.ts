import type { Product } from './menu'
import {
  type CoreOrderStatus,
  normalizeOrderStatus,
  toDisplayOrderStatus,
  type DisplayOrderStatus,
  type RawOrderStatus,
} from '@/lib/order-status'
import type { LocationAddressObject } from '@/lib/location-address'

export type OrderStatus = CoreOrderStatus
export type DeliveryType = 'delivery' | 'pickup'
export type PaymentMethod = 'blik' | 'card' | 'cash' | 'pay_on_pickup'

export interface DeliveryAddress {
  street: string
  building_number?: string
  houseNumber?: string
  apartment_number?: string
  apartmentNumber?: string
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
  discount?: number
  delivery_fee: number
  promo_code?: string
  promo_discount?: number
  tip: number
  total: number
  metadata?: Record<string, unknown>
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
  product?: Product
}

export interface OrderItemAddon {
  id: string
  name: string
  price: number
}

export const ORDER_STATUS_MESSAGES: Record<
  DisplayOrderStatus,
  { title: string; subtitle: string; emoji: string }
> = {
  pending_payment: {
    title: 'Oczekujemy na płatność',
    subtitle: 'Dokończ płatność, aby złożyć zamówienie',
    emoji: '💳',
  },
  pending: {
    title: 'Zamówienie oczekuje',
    subtitle: 'Zaraz potwierdzimy Twoje zamówienie',
    emoji: '⏳',
  },
  confirmed: {
    title: 'Zamówienie potwierdzone',
    subtitle: 'Przekazaliśmy je do realizacji',
    emoji: '✅',
  },
  accepted: {
    title: 'Zamówienie przyjęte!',
    subtitle: 'Kuchnia zaraz zacznie przygotowanie',
    emoji: '✅',
  },
  preparing: {
    title: 'Gotujemy Twój ramen! 🍜',
    subtitle: 'Nasz kucharz pracuje nad Twoim zamówieniem',
    emoji: '👨‍🍳',
  },
  ready: {
    title: 'Gotowe!',
    subtitle: 'Zamówienie czeka na kuriera lub odbiór',
    emoji: '📦',
  },
  out_for_delivery: {
    title: 'Kurier w drodze! 🛵',
    subtitle: 'Śledź postęp dostawy',
    emoji: '🛵',
  },
  delivered: {
    title: 'Smacznego! 🍜',
    subtitle: 'Dziękujemy za zamówienie',
    emoji: '🎉',
  },
  cancelled: {
    title: 'Zamówienie anulowane',
    subtitle: 'Jeśli zapłaciłeś, zwrot otrzymasz automatycznie',
    emoji: '❌',
  },
  unknown: {
    title: 'Aktualizujemy status',
    subtitle: 'Odśwież stronę za chwilę',
    emoji: 'ℹ️',
  },
}

export interface OrderWithItems extends Omit<Order, 'items'> {
  items: OrderItemWithProduct[]
  location?: {
    name: string
    address: string | LocationAddressObject | null
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

export const ORDER_STATUS_STYLES: Record<
  DisplayOrderStatus,
  { color: string; bgColor: string; icon: string }
> = {
  pending_payment: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: 'Clock' },
  pending: { color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: 'Clock' },
  confirmed: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: 'CheckCircle' },
  accepted: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: 'CheckCircle' },
  preparing: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: 'ChefHat' },
  ready: { color: 'text-green-500', bgColor: 'bg-green-500/10', icon: 'Package' },
  out_for_delivery: { color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: 'Truck' },
  delivered: { color: 'text-green-600', bgColor: 'bg-green-600/10', icon: 'CheckCircle2' },
  cancelled: { color: 'text-red-500', bgColor: 'bg-red-500/10', icon: 'XCircle' },
  unknown: { color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', icon: 'Clock' },
}

export const ORDER_TIMELINE_STEPS = [
  { status: 'accepted' as CoreOrderStatus, label: 'Przyjęte', shortLabel: 'Przyjęte' },
  { status: 'preparing' as CoreOrderStatus, label: 'Przygotowywane', shortLabel: 'Gotujemy' },
  { status: 'ready' as CoreOrderStatus, label: 'Gotowe', shortLabel: 'Gotowe' },
  { status: 'out_for_delivery' as CoreOrderStatus, label: 'W drodze', shortLabel: 'W drodze' },
  { status: 'delivered' as CoreOrderStatus, label: 'Dostarczone', shortLabel: 'Dostarczone' },
]

export function getTimelineStepIndex(
  status: RawOrderStatus,
  paymentStatus?: string
): number {
  const display = toDisplayOrderStatus(status, paymentStatus)
  if (display === 'pending_payment' || display === 'cancelled' || display === 'unknown') {
    return -1
  }

  const normalized = normalizeOrderStatus(status)
  if (normalized === 'pending' || normalized === 'confirmed') return 0
  return ORDER_TIMELINE_STEPS.findIndex((step) => step.status === normalized)
}

export function getOrderStatusMessage(
  status: RawOrderStatus,
  paymentStatus?: string
) {
  return ORDER_STATUS_MESSAGES[toDisplayOrderStatus(status, paymentStatus)]
}

export function getOrderStatusStyle(
  status: RawOrderStatus,
  paymentStatus?: string
) {
  return ORDER_STATUS_STYLES[toDisplayOrderStatus(status, paymentStatus)]
}

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
