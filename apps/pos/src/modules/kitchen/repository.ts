import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';

const baseRepo = createRepository<KitchenTicket>('kitchen_tickets');

async function getByStatus(status: OrderStatus): Promise<KitchenTicket[]> {
  return baseRepo.findMany((ticket) => ticket.status === status);
}

async function startPreparing(id: string): Promise<KitchenTicket> {
  const ticket = await baseRepo.findById(id);
  if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

  return baseRepo.update(id, {
    status: OrderStatus.PREPARING,
    started_at: new Date().toISOString(),
  } as Partial<KitchenTicket>);
}

async function markReady(id: string): Promise<KitchenTicket> {
  const ticket = await baseRepo.findById(id);
  if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

  return baseRepo.update(id, {
    status: OrderStatus.READY,
    completed_at: new Date().toISOString(),
  } as Partial<KitchenTicket>);
}

async function markServed(id: string): Promise<KitchenTicket> {
  const ticket = await baseRepo.findById(id);
  if (!ticket) throw new Error(`Kitchen ticket with id ${id} not found`);

  return baseRepo.update(id, {
    status: OrderStatus.DELIVERED,
  } as Partial<KitchenTicket>);
}

async function bumpOrder(id: string): Promise<KitchenTicket> {
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
  return baseRepo.findMany(
    (ticket) =>
      ticket.status === OrderStatus.PENDING ||
      ticket.status === OrderStatus.PREPARING ||
      ticket.status === OrderStatus.READY
  );
}

async function getCompletedToday(): Promise<KitchenTicket[]> {
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
  const ticket = await baseRepo.findById(ticketId);
  if (!ticket) throw new Error(`Kitchen ticket with id ${ticketId} not found`);

  const updatedItems = ticket.items.map((item) =>
    item.id === itemId ? { ...item, is_done: isDone } : item
  );

  return baseRepo.update(ticketId, { items: updatedItems } as Partial<KitchenTicket>);
}

async function setPriority(id: string, priority: number): Promise<KitchenTicket> {
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
