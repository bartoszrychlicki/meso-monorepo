import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { KdsCard } from '../kds-card';
import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';

vi.mock('../../hooks', async () => {
  const actual = await vi.importActual<typeof import('../../hooks')>('../../hooks');
  return {
    ...actual,
    useTicketTimer: () => ({
      elapsed: 0,
      formatted: '00:00',
      color: 'green' as const,
      percentage: 0,
    }),
  };
});

const ticketWithVariantAndModifiers: KitchenTicket = {
  id: 'ticket-1',
  order_id: 'order-1',
  order_number: 'ORD-2026-0001',
  location_id: 'loc-1',
  status: OrderStatus.PENDING,
  priority: 1,
  estimated_minutes: 10,
  items: [
    {
      id: 'item-1',
      order_item_id: 'order-item-1',
      product_name: 'Karaage Fryty',
      variant_name: 'Duzy',
      quantity: 1,
      modifiers: ['Bez cebuli', 'Extra sos'],
      is_done: false,
    },
  ],
  created_at: '2026-03-03T10:00:00.000Z',
  updated_at: '2026-03-03T10:00:00.000Z',
};

describe('KdsCard', () => {
  it('renders item variant and modifiers', () => {
    render(<KdsCard ticket={ticketWithVariantAndModifiers} />);

    expect(screen.getByText('Karaage Fryty')).toBeInTheDocument();
    expect(screen.getByText('(Duzy)')).toBeInTheDocument();
    expect(screen.getByText('Bez cebuli, Extra sos')).toBeInTheDocument();
  });

  it('does not render modifiers row when modifiers list is empty', () => {
    const ticketWithoutModifiers: KitchenTicket = {
      ...ticketWithVariantAndModifiers,
      id: 'ticket-2',
      items: [
        {
          ...ticketWithVariantAndModifiers.items[0],
          id: 'item-2',
          modifiers: [],
        },
      ],
    };

    render(<KdsCard ticket={ticketWithoutModifiers} />);

    expect(screen.queryByText('Bez cebuli, Extra sos')).not.toBeInTheDocument();
  });
});
