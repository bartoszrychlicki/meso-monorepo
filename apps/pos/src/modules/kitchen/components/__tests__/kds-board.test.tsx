import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderStatus } from '@/types/enums';
import type { KitchenTicket } from '@/types/kitchen';

const {
  mockUseKitchen,
  mockUseKitchenPolling,
  mockUseKdsSoundEnabled,
  mockPlayNewKitchenOrderSound,
  mockPrimeKitchenAlertAudio,
} = vi.hoisted(() => ({
  mockUseKitchen: vi.fn(),
  mockUseKitchenPolling: vi.fn(),
  mockUseKdsSoundEnabled: vi.fn(),
  mockPlayNewKitchenOrderSound: vi.fn(),
  mockPrimeKitchenAlertAudio: vi.fn(),
}));

vi.mock('../../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks')>();
  return {
    ...actual,
    useKitchen: mockUseKitchen,
    useKitchenPolling: mockUseKitchenPolling,
    useKdsSoundEnabled: mockUseKdsSoundEnabled,
  };
});

vi.mock('../../alerts', () => ({
  getNewPendingTicketIds: (previousTicketIds: ReadonlySet<string>, tickets: KitchenTicket[]) =>
    tickets
      .map((ticket) => ticket.id)
      .filter((ticketId) => !previousTicketIds.has(ticketId)),
  playNewKitchenOrderSound: mockPlayNewKitchenOrderSound,
  primeKitchenAlertAudio: mockPrimeKitchenAlertAudio,
}));

import { KdsBoard } from '../kds-board';

function makeTicket(id: string): KitchenTicket {
  return {
    id,
    order_id: `order-${id}`,
    order_number: `ZAM-${id}`,
    location_id: 'loc-1',
    status: OrderStatus.PENDING,
    items: [],
    priority: 0,
    estimated_minutes: 10,
    created_at: '2026-03-12T10:00:00.000Z',
    updated_at: '2026-03-12T10:00:00.000Z',
  };
}

describe('KdsBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKitchenPolling.mockReturnValue(undefined);
    mockUseKdsSoundEnabled.mockReturnValue(true);
  });

  it('does not play a sound on the initial load', () => {
    mockUseKitchen.mockReturnValue({
      newTickets: [makeTicket('ticket-1')],
      preparingTickets: [],
      readyTickets: [],
      isLoading: false,
    });

    render(<KdsBoard />);

    expect(mockPlayNewKitchenOrderSound).not.toHaveBeenCalled();
  });

  it('plays a sound when a new pending ticket appears after the initial render', () => {
    mockUseKitchen
      .mockReturnValueOnce({
        newTickets: [],
        preparingTickets: [],
        readyTickets: [],
        isLoading: false,
      })
      .mockReturnValueOnce({
        newTickets: [makeTicket('ticket-2')],
        preparingTickets: [],
        readyTickets: [],
        isLoading: false,
      });

    const { rerender } = render(<KdsBoard />);
    rerender(<KdsBoard />);

    expect(mockPlayNewKitchenOrderSound).toHaveBeenCalledTimes(1);
  });

  it('does not play a sound when notification sounds are disabled', () => {
    mockUseKdsSoundEnabled.mockReturnValue(false);
    mockUseKitchen
      .mockReturnValueOnce({
        newTickets: [],
        preparingTickets: [],
        readyTickets: [],
        isLoading: false,
      })
      .mockReturnValueOnce({
        newTickets: [makeTicket('ticket-3')],
        preparingTickets: [],
        readyTickets: [],
        isLoading: false,
      });

    const { rerender } = render(<KdsBoard />);
    rerender(<KdsBoard />);

    expect(mockPlayNewKitchenOrderSound).not.toHaveBeenCalled();
  });
});
