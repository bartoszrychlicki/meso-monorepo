'use client';

import { create } from 'zustand';
import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { kitchenRepository } from './repository';

interface KitchenStore {
  tickets: KitchenTicket[];
  isLoading: boolean;

  // Actions
  loadTickets: () => Promise<void>;
  refreshTickets: () => Promise<void>;
  startPreparing: (ticketId: string) => Promise<void>;
  markItemDone: (ticketId: string, itemId: string) => Promise<void>;
  markReady: (ticketId: string) => Promise<void>;
  markServed: (ticketId: string) => Promise<void>;
  bumpOrder: (ticketId: string) => Promise<void>;
  setPriority: (ticketId: string, priority: number) => Promise<void>;
}

export const useKitchenStore = create<KitchenStore>((set, get) => ({
  tickets: [],
  isLoading: false,

  loadTickets: async () => {
    set({ isLoading: true });
    try {
      const tickets = await kitchenRepository.getActiveTickets();
      set({ tickets });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshTickets: async () => {
    try {
      const tickets = await kitchenRepository.getActiveTickets();
      set({ tickets });
    } catch {
      // Silent fail on refresh to not disrupt the UI
    }
  },

  startPreparing: async (ticketId: string) => {
    const updated = await kitchenRepository.startPreparing(ticketId);
    set({
      tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
    });
  },

  markItemDone: async (ticketId: string, itemId: string) => {
    const ticket = get().tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const item = ticket.items.find((i) => i.id === itemId);
    if (!item) return;

    const updated = await kitchenRepository.updateItem(ticketId, itemId, !item.is_done);
    set({
      tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
    });
  },

  markReady: async (ticketId: string) => {
    const updated = await kitchenRepository.markReady(ticketId);
    set({
      tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
    });
  },

  markServed: async (ticketId: string) => {
    set({
      tickets: get().tickets.filter((t) => t.id !== ticketId),
    });
    await kitchenRepository.markServed(ticketId);
  },

  bumpOrder: async (ticketId: string) => {
    const ticket = get().tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    if (ticket.status === OrderStatus.READY) {
      // Bumping from ready = served, remove from board
      set({
        tickets: get().tickets.filter((t) => t.id !== ticketId),
      });
      await kitchenRepository.bumpOrder(ticketId);
    } else {
      const updated = await kitchenRepository.bumpOrder(ticketId);
      set({
        tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
      });
    }
  },

  setPriority: async (ticketId: string, priority: number) => {
    const updated = await kitchenRepository.setPriority(ticketId, priority);
    set({
      tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
    });
  },
}));

// Selector functions (computed from state)
export function selectNewTickets(state: KitchenStore): KitchenTicket[] {
  return state.tickets
    .filter((t) => t.status === OrderStatus.PENDING)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.created_at.localeCompare(b.created_at);
    });
}

export function selectPreparingTickets(state: KitchenStore): KitchenTicket[] {
  return state.tickets
    .filter((t) => t.status === OrderStatus.PREPARING)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.created_at.localeCompare(b.created_at);
    });
}

export function selectReadyTickets(state: KitchenStore): KitchenTicket[] {
  return state.tickets
    .filter((t) => t.status === OrderStatus.READY)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.created_at.localeCompare(b.created_at);
    });
}
