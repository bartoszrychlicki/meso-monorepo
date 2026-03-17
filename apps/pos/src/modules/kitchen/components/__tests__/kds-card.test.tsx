import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { KdsCard } from '../kds-card';
import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { formatKitchenEstimatedReadyTime } from '../../formatting';

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
  delivery_type: 'pickup',
  scheduled_time: '2026-03-04T18:45:00',
  estimated_minutes: 10,
  items: [
    {
      id: 'item-1',
      order_item_id: 'order-item-1',
      product_name: 'Karaage Fryty',
      variant_name: 'Duzy',
      quantity: 1,
      modifiers: ['Bez cebuli', 'Extra sos x2', '  '],
      is_done: false,
    },
  ],
  created_at: '2026-03-03T10:00:00.000Z',
  updated_at: '2026-03-03T10:00:00.000Z',
};

describe('KdsCard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders item variant, modifiers and scheduled pickup time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00'));

    render(<KdsCard ticket={ticketWithVariantAndModifiers} />);

    expect(screen.getByText('Karaage Fryty')).toBeInTheDocument();
    expect(screen.getByText('(Duzy)')).toBeInTheDocument();
    expect(screen.getByText('Bez cebuli')).toBeInTheDocument();
    expect(screen.getByText('Extra sos x2')).toBeInTheDocument();
    expect(screen.getByText('Odbior: jutro, 18:45')).toBeInTheDocument();
  });

  it('renders estimated pickup time for asap pickup orders', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00'));

    render(
      <KdsCard
        ticket={{
          ...ticketWithVariantAndModifiers,
          id: 'ticket-asap',
          scheduled_time: undefined,
        }}
      />
    );

    expect(
      screen.getByText(
        `Odbior ok.: ${formatKitchenEstimatedReadyTime(
          ticketWithVariantAndModifiers.created_at,
          ticketWithVariantAndModifiers.estimated_minutes
        )}`
      )
    ).toBeInTheDocument();
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

    expect(screen.queryByText('Bez cebuli')).not.toBeInTheDocument();
  });

  it('preserves repeated modifier entries on the ticket', () => {
    render(
      <KdsCard
        ticket={{
          ...ticketWithVariantAndModifiers,
          id: 'ticket-5',
          items: [
            {
              ...ticketWithVariantAndModifiers.items[0],
              id: 'item-5',
              modifiers: ['Extra sos', 'Extra sos', ' '],
            },
          ],
        }}
      />
    );

    expect(screen.getAllByText('Extra sos')).toHaveLength(2);
  });

  it('does not render pickup time badge when order is not scheduled and delivery type is unknown', () => {
    render(
      <KdsCard
        ticket={{
          ...ticketWithVariantAndModifiers,
          id: 'ticket-4',
          delivery_type: undefined,
          scheduled_time: undefined,
        }}
      />
    );

    expect(screen.queryByText(/Odbior:/)).not.toBeInTheDocument();
  });

  it('renders scheduled time without pickup label when delivery type is unknown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00'));

    render(
      <KdsCard
        ticket={{
          ...ticketWithVariantAndModifiers,
          id: 'ticket-6',
          delivery_type: undefined,
        }}
      />
    );

    expect(screen.getByText('jutro, 18:45')).toBeInTheDocument();
    expect(screen.queryByText(/Odbior:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dostawa:/)).not.toBeInTheDocument();
  });

  it('shows cancel action only for new tickets', () => {
    render(<KdsCard ticket={ticketWithVariantAndModifiers} />);

    expect(screen.getByText('Anuluj')).toBeInTheDocument();
  });

  it('hides cancel action after preparation starts', () => {
    render(
      <KdsCard
        ticket={{
          ...ticketWithVariantAndModifiers,
          id: 'ticket-3',
          status: OrderStatus.PREPARING,
        }}
      />
    );

    expect(screen.queryByText('Anuluj')).not.toBeInTheDocument();
  });

  it('shows refund prompt in cancel dialog for paid online orders', async () => {
    const user = userEvent.setup();

    render(
      <KdsCard
        ticket={{
          ...ticketWithVariantAndModifiers,
          linked_order: {
            id: 'order-1',
            status: OrderStatus.PENDING,
            channel: 'delivery_app',
            payment_method: 'online',
            payment_status: 'paid',
            total: 42,
            metadata: {
              p24: {
                sessions: [
                  {
                    sessionId: 'order-1-1234567890',
                    status: 'verified',
                    createdAt: '2026-03-03T10:00:00.000Z',
                    verifiedAt: '2026-03-03T10:01:00.000Z',
                    p24OrderId: '777',
                  },
                ],
              },
            },
          },
        }}
      />
    );

    await user.click(screen.getByText('Anuluj'));
    expect(screen.getByText(/Czy od razu zlecić zwrot płatności/)).toBeInTheDocument();
  });
});
