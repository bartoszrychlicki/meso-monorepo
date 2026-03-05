import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';

const baseRepo = createRepository<KitchenTicket>('kitchen_tickets');
const isSupabaseBackend = process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';

type TransitionAction =
  | 'start_preparing'
  | 'mark_ready'
  | 'mark_served'
  | 'toggle_item'
  | 'set_priority';

interface TransitionPayload {
  itemId?: string;
  isDone?: boolean;
  priority?: number;
}

async function callTransition(
  id: string,
  action: TransitionAction,
  payload: TransitionPayload = {}
): Promise<KitchenTicket> {
  const response = await fetch(`/api/kitchen/tickets/${id}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || `KDS transition failed (${response.status})`);
  }

  return json.ticket as KitchenTicket;
}

async function getByStatus(status: OrderStatus): Promise<KitchenTicket[]> {
  return baseRepo.findMany((ticket) => ticket.status === status);
}

async function startPreparing(id: string): Promise<KitchenTicket> {
  if (isSupabaseBackend) {
    return callTransition(id, 'start_preparing');
  }

  const ticket = await baseRepo.findById(id);
  if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

  return baseRepo.update(id, {
    status: OrderStatus.PREPARING,
    started_at: new Date().toISOString(),
  } as Partial<KitchenTicket>);
}

async function markReady(id: string): Promise<KitchenTicket> {
  if (isSupabaseBackend) {
    return callTransition(id, 'mark_ready');
  }

  const ticket = await baseRepo.findById(id);
  if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

  return baseRepo.update(id, {
    status: OrderStatus.READY,
    completed_at: new Date().toISOString(),
  } as Partial<KitchenTicket>);
}

async function markServed(id: string): Promise<KitchenTicket> {
  if (isSupabaseBackend) {
    return callTransition(id, 'mark_served');
  }

  const ticket = await baseRepo.findById(id);
  if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

  return baseRepo.update(id, {
    status: OrderStatus.DELIVERED,
  } as Partial<KitchenTicket>);
}

async function bumpOrder(id: string): Promise<KitchenTicket> {
  if (isSupabaseBackend) {
    // Fetch current ticket via server API to determine status
    const res = await fetch('/api/kitchen/tickets');
    if (!res.ok) throw new Error(`Failed to fetch tickets for bump (${res.status})`);
    const json = await res.json();
    const ticket = (json.tickets as KitchenTicket[]).find((t) => t.id === id);
    if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

    const actionByStatus: Record<string, TransitionAction> = {
      [OrderStatus.PENDING]: 'start_preparing',
      [OrderStatus.PREPARING]: 'mark_ready',
      [OrderStatus.READY]: 'mark_served',
    };

    const action = actionByStatus[ticket.status];
    if (!action) throw new Error(`Cannot bump ticket in status ${ticket.status}`);
    return callTransition(id, action);
  }

  const ticket = await baseRepo.findById(id);
  if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

  const statusFlow: Record<string, OrderStatus> = {
    [OrderStatus.PENDING]: OrderStatus.PREPARING,
    [OrderStatus.PREPARING]: OrderStatus.READY,
    [OrderStatus.READY]: OrderStatus.DELIVERED,
  };

  const nextStatus = statusFlow[ticket.status];
  if (!nextStatus) throw new Error(`Cannot bump ticket in status ${ticket.status}`);

  const updates: Partial<KitchenTicket> = { status: nextStatus };
  if (nextStatus === OrderStatus.PREPARING) {
    updates.started_at = new Date().toISOString();
  }
  if (nextStatus === OrderStatus.READY) {
    updates.completed_at = new Date().toISOString();
  }

  return baseRepo.update(id, updates);
}

async function getActiveTickets(): Promise<KitchenTicket[]> {
  if (isSupabaseBackend) {
    const res = await fetch('/api/kitchen/tickets');
    if (!res.ok) throw new Error(`Failed to fetch active tickets (${res.status})`);
    const json = await res.json();
    return json.tickets as KitchenTicket[];
  }
  return baseRepo.findMany(
    (ticket) =>
      ticket.status === OrderStatus.PENDING ||
      ticket.status === OrderStatus.PREPARING ||
      ticket.status === OrderStatus.READY
  );
}

async function getCompletedToday(): Promise<KitchenTicket[]> {
  if (isSupabaseBackend) {
    const res = await fetch('/api/kitchen/tickets?filter=completed_today');
    if (!res.ok) throw new Error(`Failed to fetch completed tickets (${res.status})`);
    const json = await res.json();
    return json.tickets as KitchenTicket[];
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return baseRepo.findMany(
    (ticket) =>
      ticket.status === OrderStatus.DELIVERED &&
      !!ticket.completed_at &&
      ticket.completed_at >= todayStart.toISOString()
  );
}

async function updateItem(
  ticketId: string,
  itemId: string,
  isDone: boolean
): Promise<KitchenTicket> {
  if (isSupabaseBackend) {
    return callTransition(ticketId, 'toggle_item', { itemId, isDone });
  }

  const ticket = await baseRepo.findById(ticketId);
  if (!ticket) throw new Error(`Kitchen ticket with id ${ticketId} not found`);

  const updatedItems = ticket.items.map((item) =>
    item.id === itemId ? { ...item, is_done: isDone } : item
  );

  return baseRepo.update(ticketId, { items: updatedItems } as Partial<KitchenTicket>);
}

async function setPriority(id: string, priority: number): Promise<KitchenTicket> {
  if (isSupabaseBackend) {
    return callTransition(id, 'set_priority', { priority });
  }

  return baseRepo.update(id, { priority } as Partial<KitchenTicket>);
}

export const kitchenRepository = {
  ...baseRepo,
  getByStatus,
  startPreparing,
  markReady,
  markServed,
  bumpOrder,
  getActiveTickets,
  getCompletedToday,
  updateItem,
  setPriority,
};
