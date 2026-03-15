import { NextRequest, NextResponse } from 'next/server';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { createServiceClient } from '@/lib/supabase/server';
import {
  ACTIVE_KDS_ORDER_STATUSES,
  COMPLETED_KDS_ORDER_STATUSES,
  extractKitchenTicketOrderIds,
  filterKitchenTicketsByLinkedOrders,
} from '@/modules/kitchen/ticket-filters';
import { mergeKitchenTicketsWithLinkedOrders, type KitchenLinkedOrder } from '@/modules/kitchen/server-enrichment';
import { OrderStatus } from '@/types/enums';
import type { KitchenTicket } from '@/types/kitchen';
import type { Order } from '@/types/order';
const isSupabaseBackend = process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';

async function loadLinkedOrders(orderIds: string[]): Promise<KitchenLinkedOrder[]> {
  if (orderIds.length === 0) {
    return [];
  }

  if (isSupabaseBackend) {
    const { data, error } = await createServiceClient()
      .from('orders_orders')
      .select('id, status, channel, payment_method, payment_status, total, metadata, scheduled_time, delivery_type')
      .in('id', orderIds);

    if (error) {
      throw new Error(`[orders_orders] linked order lookup failed: ${error.message}`);
    }

    return (data ?? []) as KitchenLinkedOrder[];
  }

  const ordersRepo = createServerRepository<Order>('orders');
  const orders = await ordersRepo.findMany((order) => orderIds.includes(order.id));
  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    channel: order.channel,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    total: order.total,
    metadata: order.metadata,
    scheduled_time: order.scheduled_time,
    delivery_type: order.delivery_type,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const repo = createServerRepository<KitchenTicket>('kitchen_tickets');
    const filter = request.nextUrl.searchParams.get('filter');

    let tickets: KitchenTicket[];

    if (filter === 'completed_today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      tickets = await repo.findMany(
        (ticket) =>
          ticket.status === OrderStatus.DELIVERED &&
          !!ticket.completed_at &&
          ticket.completed_at >= todayISO
      );
    } else {
      tickets = await repo.findMany(
        (ticket) =>
          ticket.status === OrderStatus.PENDING ||
          ticket.status === OrderStatus.PREPARING ||
          ticket.status === OrderStatus.READY
      );
    }

    const linkedOrders = await loadLinkedOrders(extractKitchenTicketOrderIds(tickets));
    tickets = filterKitchenTicketsByLinkedOrders(
      tickets,
      linkedOrders,
      filter === 'completed_today'
        ? COMPLETED_KDS_ORDER_STATUSES
        : ACTIVE_KDS_ORDER_STATUSES,
      {
        excludeUnpaidPrepaidOrders: filter !== 'completed_today',
      }
    ).map((ticket) => ({
      ...ticket,
      linked_order: linkedOrders.find((order) => order.id === ticket.order_id),
    }));

    tickets = mergeKitchenTicketsWithLinkedOrders(tickets, linkedOrders);

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('[KDS GET] Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
