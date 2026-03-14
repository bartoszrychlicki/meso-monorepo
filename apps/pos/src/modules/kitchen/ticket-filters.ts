import { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus } from '@/types/enums';
import type { KitchenTicket } from '@/types/kitchen';
import type { Order } from '@/types/order';

type LinkedOrder = Pick<Order, 'id' | 'status' | 'channel' | 'payment_method' | 'payment_status'>;
type FilterKitchenTicketsOptions = {
  excludeUnpaidPrepaidOrders?: boolean;
};

const PREPAID_KDS_PAYMENT_METHODS = new Set<PaymentMethod>([
  PaymentMethod.ONLINE,
  PaymentMethod.BLIK,
]);
const REMOTE_PREPAID_KDS_CHANNELS = new Set<OrderChannel>([
  OrderChannel.DELIVERY_APP,
  OrderChannel.ONLINE,
]);

export const ACTIVE_KDS_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
]);

export const COMPLETED_KDS_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
]);

export function extractKitchenTicketOrderIds(tickets: KitchenTicket[]): string[] {
  return [...new Set(
    tickets
      .map((ticket) => ticket.order_id?.trim())
      .filter((orderId): orderId is string => Boolean(orderId))
  )];
}

export function filterKitchenTicketsByLinkedOrders(
  tickets: KitchenTicket[],
  orders: LinkedOrder[],
  allowedStatuses: ReadonlySet<OrderStatus>,
  options: FilterKitchenTicketsOptions = {}
): KitchenTicket[] {
  const visibleOrderIds = new Set(
    orders
      .filter(
        (order) =>
          allowedStatuses.has(order.status) &&
          !(
            options.excludeUnpaidPrepaidOrders &&
            order.channel &&
            REMOTE_PREPAID_KDS_CHANNELS.has(order.channel) &&
            order.payment_method &&
            PREPAID_KDS_PAYMENT_METHODS.has(order.payment_method) &&
            order.payment_status !== PaymentStatus.PAID
          )
      )
      .map((order) => order.id)
  );

  return tickets.filter((ticket) => {
    const orderId = ticket.order_id?.trim();
    return Boolean(orderId && visibleOrderIds.has(orderId));
  });
}
