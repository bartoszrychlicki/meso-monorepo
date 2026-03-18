import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import OrderEditPage from '../page';
import { OrderChannel, OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';

const {
  mockPush,
  mockUseOrder,
  mockUseOrdersStore,
  mockUseBreadcrumbLabel,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUseOrder: vi.fn(),
  mockUseOrdersStore: vi.fn(),
  mockUseBreadcrumbLabel: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    use: <T,>(value: T) => {
      if (
        value &&
        typeof value === 'object' &&
        '__resolved' in (value as Record<string, unknown>)
      ) {
        return (value as { __resolved: unknown }).__resolved;
      }

      return actual.use(value);
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/components/layout/breadcrumb-context', () => ({
  useBreadcrumbLabel: mockUseBreadcrumbLabel,
}));

vi.mock('@/modules/orders/hooks', () => ({
  useOrder: (id: string) => mockUseOrder(id),
}));

vi.mock('@/modules/orders/store', () => ({
  useOrdersStore: () => mockUseOrdersStore(),
}));

const baseOrder: Order = {
  id: 'order-1',
  order_number: 'ZAM-001',
  status: OrderStatus.PREPARING,
  channel: OrderChannel.POS,
  source: OrderSource.TAKEAWAY,
  location_id: 'loc-1',
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  payment_method: PaymentMethod.CASH,
  payment_status: PaymentStatus.PENDING,
  status_history: [],
  created_at: '2026-03-15T10:00:00.000Z',
  updated_at: '2026-03-15T10:00:00.000Z',
};

function makeParams(id: string) {
  return {
    __resolved: { id },
  } as unknown as Promise<{ id: string }>;
}

describe('OrderEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrdersStore.mockReturnValue({
      updateOrder: vi.fn(),
    });
  });

  it('keeps loading state when the store still holds a different order', () => {
    mockUseOrder.mockReturnValue({
      order: {
        ...baseOrder,
        id: 'order-old',
        order_number: 'ZAM-OLD',
      },
      isLoading: false,
    });

    render(<OrderEditPage params={makeParams('order-1')} />);

    expect(screen.getByTestId('order-edit-loading')).toBeInTheDocument();
    expect(screen.queryByText('Edytuj ZAM-OLD')).not.toBeInTheDocument();
    expect(mockUseBreadcrumbLabel).toHaveBeenCalledWith('order-1', undefined);
  });

  it('renders the edit form when the loaded order matches the route id', () => {
    mockUseOrder.mockReturnValue({
      order: baseOrder,
      isLoading: false,
    });

    render(<OrderEditPage params={makeParams('order-1')} />);

    expect(screen.getByText('Edytuj ZAM-001')).toBeInTheDocument();
    expect(mockUseBreadcrumbLabel).toHaveBeenCalledWith('order-1', 'ZAM-001 - edycja');
  });
});
