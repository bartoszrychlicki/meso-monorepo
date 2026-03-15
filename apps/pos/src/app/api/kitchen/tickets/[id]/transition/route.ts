import { NextRequest, NextResponse } from 'next/server';
import { normalizeOrderClosureReason } from '@meso/core';
import { OrderClosureReasonCode } from '@/types/enums';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import {
  InvalidOrderCancellationReasonError,
  transitionOrderStatus,
} from '@/lib/orders/status-transition';
import { OrderStatus } from '@/types/enums';
import type { KitchenTicket } from '@/types/kitchen';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type TransitionAction =
  | 'start_preparing'
  | 'mark_ready'
  | 'mark_served'
  | 'cancel_order'
  | 'toggle_item'
  | 'set_priority';

interface TransitionBody {
  action: TransitionAction;
  itemId?: string;
  isDone?: boolean;
  priority?: number;
  reasonCode?: OrderClosureReasonCode | null;
  reasonText?: string;
}

interface StatusUpdate {
  status: OrderStatus;
  note: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      return NextResponse.json({ ticket: updatedTicket });
    }

    if (body.action === 'set_priority') {
      if (typeof body.priority !== 'number' || Number.isNaN(body.priority)) {
        return NextResponse.json({ error: 'Missing priority for set_priority' }, { status: 400 });
      }

      updatedTicket = await kitchenRepo.update(id, { priority: body.priority } as Partial<KitchenTicket>);
      return NextResponse.json({ ticket: updatedTicket });
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
      return NextResponse.json({ ticket: updatedTicket });
    }

    const orderId = currentTicket.order_id?.trim();
    if (!orderId || !UUID_REGEX.test(orderId)) {
      return NextResponse.json({ ticket: updatedTicket });
    }

    try {
      await transitionOrderStatus({
        orderId,
        status: statusUpdate.status,
        note: body.action === 'cancel_order'
          ? normalizedCancellation?.note ?? statusUpdate.note
          : statusUpdate.note,
        closure_reason_code: body.action === 'cancel_order'
          ? normalizedCancellation?.closure_reason_code
          : undefined,
        closure_reason: body.action === 'cancel_order'
          ? normalizedCancellation?.closure_reason
          : undefined,
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

    return NextResponse.json({ ticket: updatedTicket });
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
