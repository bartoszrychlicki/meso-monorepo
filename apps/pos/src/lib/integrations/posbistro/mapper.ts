import { PaymentMethod, PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';
import type { PosbistroCartPayload } from './types';
import type { PosbistroResolvedOrderMappings } from './menu-mapping';

function splitName(order: Pick<Order, 'customer_name' | 'delivery_address'>): {
  firstName: string;
  lastName: string;
} {
  const fullName =
    order.customer_name?.trim() ||
    [order.delivery_address?.firstName?.trim(), order.delivery_address?.lastName?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim();

  if (!fullName) {
    return {
      firstName: 'Klient',
      lastName: 'MESO',
    };
  }

  const [firstName, ...rest] = fullName.split(/\s+/);
  return {
    firstName: firstName || 'Klient',
    lastName: rest.join(' ') || 'MESO',
  };
}

function resolveEmail(order: Pick<Order, 'id' | 'delivery_address'>): string {
  return order.delivery_address?.email?.trim() || `order-${order.id}@no-email.mesofood.pl`;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolvePaymentType(
  order: Pick<Order, 'payment_method' | 'payment_status'>
): 'CASH' | 'CARD' | 'ONLINE' {
  if (order.payment_method === PaymentMethod.CARD) return 'CARD';
  if (
    order.payment_method === PaymentMethod.ONLINE ||
    order.payment_method === PaymentMethod.BLIK
  ) {
    return 'ONLINE';
  }
  return 'CASH';
}

function resolvePaymentProvider(order: Pick<Order, 'payment_method'>): string | undefined {
  if (
    order.payment_method === PaymentMethod.ONLINE ||
    order.payment_method === PaymentMethod.BLIK
  ) {
    return 'PRZELEWY24';
  }

  return undefined;
}

export function mapOrderToPosbistroPayload(
  order: Pick<
    Order,
    | 'id'
    | 'order_number'
    | 'delivery_type'
    | 'scheduled_time'
    | 'payment_status'
    | 'payment_method'
    | 'total'
    | 'discount'
    | 'tip'
    | 'notes'
    | 'customer_name'
    | 'customer_id'
    | 'customer_phone'
    | 'delivery_address'
    | 'items'
  >,
  options: {
    callbackToken: string;
    confirmBaseUrl: string;
    resolvedMappings: PosbistroResolvedOrderMappings;
  }
): PosbistroCartPayload {
  const confirmBaseUrl = options.confirmBaseUrl.replace(/\/$/, '');
  const confirmUrl =
    `${confirmBaseUrl}?token=${encodeURIComponent(options.callbackToken)}`;

  const confirmUrlOrigin = new URL(confirmBaseUrl).origin;
  const { firstName, lastName } = splitName(order);
  const products = order.items.map((item) => {
    const resolvedMapping = options.resolvedMappings.itemMappings[item.id];
    const itemPrice = roundCurrency(item.subtotal);
    const originalUnitPrice = item.original_unit_price ?? item.unit_price;
    const modifiersOriginalTotal = (item.modifiers || []).reduce(
      (sum, modifier) => sum + modifier.price * modifier.quantity,
      0
    );
    const originalPrice = roundCurrency(
      item.quantity * (originalUnitPrice + modifiersOriginalTotal)
    );

    return {
      id: item.id,
      productType: resolvedMapping.productType,
      variationId: resolvedMapping.variationId,
      variationSku: resolvedMapping.variationSku,
      variationName: item.variant_name,
      name: item.product_name,
      quantity: item.quantity,
      price: itemPrice,
      originalPrice,
      promotionName:
        item.promotion_label || (itemPrice !== originalPrice ? 'MESO promotion' : undefined),
      comment: item.notes?.trim() || undefined,
      keepIncludedAddons: false,
      addons: (item.modifiers || []).map((modifier) => ({
        ...(resolvedMapping.modifierMappings[modifier.modifier_id]?.addonId
          ? { addonId: resolvedMapping.modifierMappings[modifier.modifier_id]?.addonId }
          : {}),
        ...(resolvedMapping.modifierMappings[modifier.modifier_id]?.addonSku
          ? { addonSku: resolvedMapping.modifierMappings[modifier.modifier_id]?.addonSku }
          : {}),
        id: modifier.modifier_id,
        addonType: modifier.price > 0 ? 'ADDED' as const : 'INCLUDED' as const,
        name: modifier.name,
        quantity: modifier.quantity,
        price: modifier.price,
        originalPrice: modifier.price,
      })),
    };
  });

  const originalPrice = roundCurrency(
    products.reduce((sum, item) => sum + item.originalPrice, 0)
  );
  const currentPrice = roundCurrency(
    products.reduce((sum, item) => sum + item.price, 0)
  );
  const orderPrice = roundCurrency(order.total || currentPrice);
  const promotionName =
    orderPrice !== originalPrice || order.discount > 0 ? 'MESO discount' : undefined;

  return {
    id: order.id,
    orderType: 'ORDER',
    source: 'DELIVERY',
    paymentInfo: {
      paymentType: resolvePaymentType(order),
      paid: order.payment_status === PaymentStatus.PAID,
      provider: resolvePaymentProvider(order),
      tip: typeof order.tip === 'number' && order.tip > 0 ? order.tip : undefined,
    },
    deliveryType: order.delivery_type === 'pickup' ? 'TAKEAWAY' : 'DELIVERY',
    requestedDate: order.scheduled_time || null,
    price: orderPrice,
    originalPrice,
    promotionName,
    siteUrl: `${confirmUrlOrigin}/api/v1/orders/${order.id}`,
    confirmUrl,
    comment: order.notes?.trim() || undefined,
    client: {
      clientId: order.customer_id || undefined,
      firstName,
      lastName,
      phone: order.customer_phone?.trim() || order.delivery_address?.phone?.trim() || '',
      email: resolveEmail(order),
    },
    deliveryAddress: order.delivery_type === 'pickup'
      ? undefined
      : order.delivery_address?.street?.trim()
      ? {
          street: order.delivery_address?.street?.trim() || '',
          streetNumber: order.delivery_address?.houseNumber?.trim() || undefined,
          apartmentNumber: undefined,
          floorNumber: undefined,
          city: order.delivery_address?.city?.trim() || undefined,
          postCode: order.delivery_address?.postal_code?.trim() || undefined,
          latitude: order.delivery_address?.lat,
          longitude: order.delivery_address?.lng,
        }
      : undefined,
    products,
  };
}
