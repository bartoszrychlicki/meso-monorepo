import { NextRequest, NextResponse } from 'next/server';
import { appendPickupTimeAdjustment, normalizeOrderClosureReason } from '@meso/core';
import { OrderClosureReasonCode } from '@/types/enums';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { cancelOrderWithOptionalRefund } from '@/lib/orders/cancel-order';
import { sendPickupTimeAdjustedEmail } from '@/lib/orders/pickup-time-adjustment-email';
import {
  InvalidOrderCancellationReasonError,
  transitionOrderStatus,
} from '@/lib/orders/status-transition';
import {
  loadKitchenLinkedOrder,
  mergeKitchenTicketWithLinkedOrder,
} from '@/modules/kitchen/server-enrichment';
import { OrderStatus } from '@/types/enums';
import type { KitchenTicket } from '@/types/kitchen';
import type { Order } from '@/types/order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type TransitionAction =
  | 'start_preparing'
  | 'mark_ready'
  | 'mark_served'
  | 'cancel_order'
  | 'toggle_item'
  | 'set_priority'
  | 'adjust_pickup_time';

interface TransitionBody {
  action: TransitionAction;
  itemId?: string;
  isDone?: boolean;
  priority?: number;
  pickupTime?: string;
  reasonCode?: OrderClosureReasonCode | null;
  reasonText?: string;
  requestRefund?: boolean;
}

interface StatusUpdate {
  status: OrderStatus;
  note: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseIsoTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function buildFallbackPickupTime(ticket: KitchenTicket): string | null {
  if (!Number.isFinite(ticket.estimated_minutes) || ticket.estimated_minutes <= 0) {
    return null;
  }

  const createdAt = parseIsoTimestamp(ticket.created_at);
  if (createdAt === null) {
    return null;
  }

  return new Date(createdAt + ticket.estimated_minutes * 60_000).toISOString();
}

function resolveCurrentPickupTime(order: Order, ticket: KitchenTicket): string | null {
  return order.estimated_ready_at || order.scheduled_time || buildFallbackPickupTime(ticket);
}

function getStatusUpdate(action: TransitionAction): StatusUpdate | null {
  switch (action) {
    case 'start_preparing':
      return { status: OrderStatus.PREPARING, note: 'Rozpoczęto przygotowanie (KDS)' };
    case 'mark_ready':
      return { status: OrderStatus.READY, note: 'Zamówienie gotowe do wydania (KDS)' };
    case 'mark_served':
      return { status: OrderStatus.DELIVERED, note: 'Zamówienie wydane (KDS)' };
    case 'cancel_order':
      return { status: OrderStatus.CANCELLED, note: 'Anulowano w KDS' };
    default:
      return null;
  }
}

function getTicketStatusPatch(action: TransitionAction, now: string): Partial<KitchenTicket> {
  switch (action) {
    case 'start_preparing':
      return {
        status: OrderStatus.PREPARING,
        started_at: now,
      };
    case 'mark_ready':
      return {
        status: OrderStatus.READY,
        completed_at: now,
      };
    case 'mark_served':
      return {
        status: OrderStatus.DELIVERED,
      };
    case 'cancel_order':
      return {
        status: OrderStatus.CANCELLED,
        completed_at: now,
      };
    default:
      return {};
  }
}

async function enrichKitchenTicket(ticket: KitchenTicket): Promise<KitchenTicket> {
  const orderId = ticket.order_id?.trim();
  if (!orderId || !UUID_REGEX.test(orderId)) {
    return ticket;
  }

  try {
    const linkedOrder = await loadKitchenLinkedOrder(orderId);
    return mergeKitchenTicketWithLinkedOrder(ticket, linkedOrder);
  } catch (error) {
    console.warn(
      `[KDS transition] Ticket ${ticket.id} updated, but linked order enrichment was skipped:`,
      error
    );

    return ticket;
  }
}

function buildAdjustedPickupResponseTicket(
  ticket: KitchenTicket,
  order: Pick<Order, 'scheduled_time' | 'estimated_ready_at' | 'delivery_type'>
): KitchenTicket {
  return {
    ...ticket,
    scheduled_time: order.scheduled_time ?? ticket.scheduled_time,
    estimated_ready_at: order.estimated_ready_at ?? ticket.estimated_ready_at,
    delivery_type: order.delivery_type ?? ticket.delivery_type,
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = (await request.json()) as TransitionBody;
    if (!body?.action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    const { id } = await params;
    const now = new Date().toISOString();

    const kitchenRepo = createServerRepository<KitchenTicket>('kitchen_tickets');

    const currentTicket = await kitchenRepo.findById(id);
    if (!currentTicket) {
      return NextResponse.json({ error: 'Kitchen ticket not found' }, { status: 404 });
    }

    let updatedTicket: KitchenTicket;

    if (body.action === 'toggle_item') {
      if (!body.itemId || typeof body.isDone !== 'boolean') {
        return NextResponse.json({ error: 'Missing itemId or isDone for toggle_item' }, { status: 400 });
      }

      const itemExists = currentTicket.items.some((item) => item.id === body.itemId);
      if (!itemExists) {
        return NextResponse.json({ error: 'Kitchen ticket item not found' }, { status: 404 });
      }

      const updatedItems = currentTicket.items.map((item) =>
        item.id === body.itemId ? { ...item, is_done: body.isDone } : item
      );

      updatedTicket = await kitchenRepo.update(id, { items: updatedItems } as Partial<KitchenTicket>);
      return NextResponse.json({ ticket: await enrichKitchenTicket(updatedTicket) });
    }

    if (body.action === 'set_priority') {
      if (typeof body.priority !== 'number' || Number.isNaN(body.priority)) {
        return NextResponse.json({ error: 'Missing priority for set_priority' }, { status: 400 });
      }

      updatedTicket = await kitchenRepo.update(id, { priority: body.priority } as Partial<KitchenTicket>);
      return NextResponse.json({ ticket: await enrichKitchenTicket(updatedTicket) });
    }

    const orderId = currentTicket.order_id?.trim();

    if (body.action === 'adjust_pickup_time') {
      if (!orderId || !UUID_REGEX.test(orderId)) {
        return NextResponse.json({ error: 'Pickup time adjustment requires a linked order' }, { status: 400 });
      }

      if (currentTicket.status !== OrderStatus.PENDING && currentTicket.status !== OrderStatus.PREPARING) {
        return NextResponse.json({ error: 'Pickup time can be adjusted only for active pickup tickets' }, { status: 422 });
      }

      if (!body.pickupTime) {
        return NextResponse.json({ error: 'Missing pickupTime for adjust_pickup_time' }, { status: 400 });
      }

      const newPickupTimestamp = parseIsoTimestamp(body.pickupTime);
      if (newPickupTimestamp === null) {
        return NextResponse.json({ error: 'Invalid pickupTime format' }, { status: 400 });
      }

      if (newPickupTimestamp <= Date.now()) {
        return NextResponse.json({ error: 'Pickup time cannot be in the past' }, { status: 400 });
      }

      const ordersRepo = createServerRepository<Order>('orders');
      const order = await ordersRepo.findById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Linked order not found' }, { status: 404 });
      }

      if (order.delivery_type !== 'pickup') {
        return NextResponse.json({ error: 'Pickup time can be adjusted only for pickup orders' }, { status: 422 });
      }

      const previousPickupTime = resolveCurrentPickupTime(order, currentTicket);
      if (!previousPickupTime) {
        return NextResponse.json({ error: 'Current pickup time is unavailable' }, { status: 422 });
      }

      if (parseIsoTimestamp(previousPickupTime) === newPickupTimestamp) {
        return NextResponse.json({ error: 'Pickup time was not changed' }, { status: 400 });
      }

      const updatedOrder = await ordersRepo.update(orderId, {
        estimated_ready_at: new Date(newPickupTimestamp).toISOString(),
        metadata: appendPickupTimeAdjustment(order.metadata, {
          previous_time: previousPickupTime,
          new_time: new Date(newPickupTimestamp).toISOString(),
          changed_at: now,
          source: 'kds',
        }),
      } as Partial<Order>);

      if (updatedOrder.delivery_address?.email?.trim()) {
        try {
          const emailResult = await sendPickupTimeAdjustedEmail(
            updatedOrder,
            previousPickupTime,
            updatedOrder.estimated_ready_at!
          );

          if (!emailResult.success) {
            console.error('[KDS pickup time email] Failed:', emailResult.error ?? 'Unknown error');
          }
        } catch (error) {
          console.error('[KDS pickup time email] Failed:', error);
        }
      }

      const latestTicket = await kitchenRepo.findById(id);
      const responseTicket = buildAdjustedPickupResponseTicket(
        latestTicket ?? currentTicket,
        updatedOrder
      );

      return NextResponse.json({ ticket: await enrichKitchenTicket(responseTicket) });
    }

    const normalizedCancellation = body.action === 'cancel_order'
      ? normalizeOrderClosureReason({
          closure_reason_code: body.reasonCode,
          closure_reason: body.reasonText,
        })
      : null;

    if (
      body.action === 'cancel_order' &&
      !normalizedCancellation?.closure_reason &&
      !normalizedCancellation?.note
    ) {
      return NextResponse.json({ error: 'Missing cancellation reason' }, { status: 400 });
    }

    const ticketStatusPatch = getTicketStatusPatch(body.action, now);
    updatedTicket = await kitchenRepo.update(id, ticketStatusPatch);

    const statusUpdate = getStatusUpdate(body.action);
    if (!statusUpdate) {
      return NextResponse.json({ ticket: await enrichKitchenTicket(updatedTicket) });
    }

    if (!orderId || !UUID_REGEX.test(orderId)) {
      return NextResponse.json({ ticket: await enrichKitchenTicket(updatedTicket) });
    }

    try {
      if (body.action === 'cancel_order') {
        const cancelResult = await cancelOrderWithOptionalRefund({
          orderId,
          closure_reason_code: normalizedCancellation?.closure_reason_code,
          closure_reason: normalizedCancellation?.closure_reason ?? undefined,
          request_refund: body.requestRefund,
          requested_from: 'kds',
          requestOrigin: request.nextUrl.origin,
        });

        return NextResponse.json({ ticket: updatedTicket, cancelResult });
      }

      await transitionOrderStatus({
        orderId,
        status: statusUpdate.status,
        note: statusUpdate.note,
        requestOrigin: request.nextUrl.origin,
      });
    } catch (error) {
      if (error instanceof InvalidOrderCancellationReasonError) {
        return NextResponse.json({ error: 'Missing cancellation reason' }, { status: 400 });
      }

      console.warn(
        `[KDS transition] Ticket ${id} transitioned, but linked order sync was skipped:`,
        error
      );
    }

    return NextResponse.json({ ticket: await enrichKitchenTicket(updatedTicket) });
  } catch (error) {
    console.error('[KDS transition] Failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
