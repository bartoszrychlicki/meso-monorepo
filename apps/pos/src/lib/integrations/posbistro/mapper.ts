import { PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';
import type { PosbistroCartPayload } from './types';

function normalizeName(order: Pick<Order, 'customer_name' | 'delivery_address'>): string {
  if (order.customer_name?.trim()) return order.customer_name.trim();

  const firstName = order.delivery_address?.firstName?.trim();
  const lastName = order.delivery_address?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || 'Klient MESO';
}

function buildStreet(order: Pick<Order, 'delivery_address'>): string | undefined {
  const street = order.delivery_address?.street?.trim();
  const houseNumber = order.delivery_address?.houseNumber?.trim();
  const parts = [street, houseNumber].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function mapOrderToPosbistroPayload(
  order: Pick<
    Order,
    | 'id'
    | 'order_number'
    | 'delivery_type'
    | 'payment_status'
    | 'total'
    | 'notes'
    | 'customer_name'
    | 'customer_phone'
    | 'delivery_address'
    | 'items'
  >,
  options: {
    callbackToken: string;
    confirmBaseUrl: string;
  }
): PosbistroCartPayload {
  const confirmBaseUrl = options.confirmBaseUrl.replace(/\/$/, '');
  const confirmUrl =
    `${confirmBaseUrl}?token=${encodeURIComponent(options.callbackToken)}`;

  const street = buildStreet(order);
  const email = order.delivery_address?.email?.trim();

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    fulfillmentType: order.delivery_type === 'pickup' ? 'pickup' : 'delivery',
    paid: order.payment_status === PaymentStatus.PAID,
    total: order.total,
    notes: order.notes?.trim() || undefined,
    confirmUrl,
    customer: {
      name: normalizeName(order),
      phone: order.customer_phone?.trim() || undefined,
      email: email || undefined,
    },
    address: street
      ? {
          street,
          city: order.delivery_address?.city?.trim() || undefined,
          postalCode: order.delivery_address?.postal_code?.trim() || undefined,
          country: order.delivery_address?.country?.trim() || undefined,
        }
      : undefined,
    items: order.items.map((item) => ({
      id: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: item.unit_price,
      notes: item.notes?.trim() || undefined,
      modifiers: (item.modifiers || []).map((modifier) => ({
        id: modifier.modifier_id,
        name: modifier.name,
        price: modifier.price,
        quantity: modifier.quantity,
      })),
    })),
  };
}
