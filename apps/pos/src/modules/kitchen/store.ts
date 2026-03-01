'use client';

import { create } from 'zustand';
import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { kitchenRepository } from './repository';
import { toast } from 'sonner';

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
    try {
      const updated = await kitchenRepository.startPreparing(ticketId);
      set({
        tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
      });
    } catch (error) {
      console.error('Failed to start preparing ticket:', error);
      toast.error('Nie udało się rozpocząć przygotowania zamówienia.');
    }
  },

  markItemDone: async (ticketId: string, itemId: string) => {
    const ticket = get().tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const item = ticket.items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const updated = await kitchenRepository.updateItem(ticketId, itemId, !item.is_done);
      set({
        tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
      });
    } catch (error) {
      console.error('Failed to toggle kitchen item state:', error);
      toast.error('Nie udało się zaktualizować pozycji.');
    }
  },

  markReady: async (ticketId: string) => {
    try {
      const updated = await kitchenRepository.markReady(ticketId);
      set({
        tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
      });
    } catch (error) {
      console.error('Failed to mark ticket as ready:', error);
      toast.error('Nie udało się oznaczyć zamówienia jako gotowe.');
    }
  },

  markServed: async (ticketId: string) => {
    try {
      await kitchenRepository.markServed(ticketId);
      set({
        tickets: get().tickets.filter((t) => t.id !== ticketId),
      });
    } catch (error) {
      console.error('Failed to mark ticket as served:', error);
      toast.error('Nie udało się oznaczyć zamówienia jako wydane.');
    }
  },

  bumpOrder: async (ticketId: string) => {
    const ticket = get().tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    try {
      if (ticket.status === OrderStatus.READY) {
        await kitchenRepository.bumpOrder(ticketId);
        set({
          tickets: get().tickets.filter((t) => t.id !== ticketId),
        });
      } else {
        const updated = await kitchenRepository.bumpOrder(ticketId);
        set({
          tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
        });
      }
    } catch (error) {
      console.error('Failed to bump ticket status:', error);
      toast.error('Nie udało się przesunąć zamówienia dalej.');
    }
  },

  setPriority: async (ticketId: string, priority: number) => {
    try {
      const updated = await kitchenRepository.setPriority(ticketId, priority);
      set({
        tickets: get().tickets.map((t) => (t.id === ticketId ? updated : t)),
      });
    } catch (error) {
      console.error('Failed to update ticket priority:', error);
      toast.error('Nie udało się zmienić priorytetu.');
    }
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
