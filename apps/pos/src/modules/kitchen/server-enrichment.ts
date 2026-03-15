import { createServerRepository } from '@/lib/data/server-repository-factory';
import type { KitchenTicket } from '@/types/kitchen';
import type { Order } from '@/types/order';

export type KitchenLinkedOrder = Pick<
  Order,
  'id' | 'status' | 'channel' | 'payment_method' | 'payment_status' | 'scheduled_time' | 'delivery_type'
>;

export function mergeKitchenTicketWithLinkedOrder(
  ticket: KitchenTicket,
  linkedOrder: KitchenLinkedOrder | null | undefined
): KitchenTicket {
  if (!linkedOrder) {
    return ticket;
  }

  return {
    ...ticket,
    scheduled_time: linkedOrder.scheduled_time,
    delivery_type: linkedOrder.delivery_type,
  };
}

export function mergeKitchenTicketsWithLinkedOrders(
  tickets: KitchenTicket[],
  linkedOrders: KitchenLinkedOrder[]
): KitchenTicket[] {
  const linkedOrdersById = new Map(linkedOrders.map((order) => [order.id, order]));

  return tickets.map((ticket) =>
    mergeKitchenTicketWithLinkedOrder(ticket, linkedOrdersById.get(ticket.order_id))
  );
}

export async function loadKitchenLinkedOrder(
  orderId: string
): Promise<KitchenLinkedOrder | null> {
  const ordersRepo = createServerRepository<Order>('orders');
  const order = await ordersRepo.findById(orderId);

  if (!order) {
    return null;
  }

  return {
    id: order.id,
    status: order.status,
    channel: order.channel,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    scheduled_time: order.scheduled_time,
    delivery_type: order.delivery_type,
  };
}
