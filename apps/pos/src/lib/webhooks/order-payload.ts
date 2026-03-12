import type { Order, OrderItem } from '@/types/order';
import type { OrderStatusChangedData } from './types';

function toMinorUnits(value?: number): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return Math.round(value * 100);
}

function toWebhookSource(order: Order): string {
  if (order.external_channel) {
    return order.external_channel;
  }

  return order.channel.replace(/_/g, '-');
}

function toWebhookChannel(order: Order): string {
  return order.external_channel ?? order.channel;
}

function toWebhookItemName(item: OrderItem): string {
  if (item.variant_name) {
    return `${item.product_name} (${item.variant_name})`;
  }

  return item.product_name;
}

export function buildOrderStatusChangedWebhookData(
  order: Order,
  options: {
    status: string;
    previousStatus: string;
    note?: string;
  }
): OrderStatusChangedData {
  return {
    pos_order_id: order.id,
    external_order_id: order.external_order_id,
    order_number: order.order_number,
    status: options.status,
    previous_status: options.previousStatus,
    channel: toWebhookChannel(order),
    order_type: order.source,
    source: toWebhookSource(order),
    items: order.items?.map((item) => ({
      name: toWebhookItemName(item),
      quantity: item.quantity,
      unit_price: toMinorUnits(item.unit_price),
      notes: item.notes,
    })),
    total: toMinorUnits(order.total),
    currency: 'PLN',
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    note: options.note,
    estimated_ready_at: order.estimated_ready_at,
    created_at: order.created_at,
  } as OrderStatusChangedData;
}
