import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { OrderChannel, OrderSource, OrderStatus, PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';

const mockUseOrders = vi.fn();
const mockGetAllWarehouseStockItems = vi.fn();
const mockGetLowStockItems = vi.fn();

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ),
}));

vi.mock('@/components/dashboard/kpi-card', () => ({
  KpiCard: ({ label, value }: { label: string; value: string | number }) => (
    <div>{label}:{value}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/shared/status-badge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>Ladowanie...</div>,
}));

vi.mock('@/modules/orders/hooks', () => ({
  useOrders: () => mockUseOrders(),
}));

vi.mock('@/modules/inventory/repository', () => ({
  inventoryRepository: {
    getAllWarehouseStockItems: () => mockGetAllWarehouseStockItems(),
    getLowStockItems: () => mockGetLowStockItems(),
  },
}));

import DashboardPage from '../page';

function createOrder({
  id,
  createdAt,
  total,
  status,
  productId,
  productName,
  quantity,
}: {
  id: string;
  createdAt: string;
  total: number;
  status: OrderStatus;
  productId: string;
  productName: string;
  quantity: number;
}): Order {
  return {
    id,
    order_number: `WEB-${id}`,
    status,
    channel: OrderChannel.WEBSITE,
    source: OrderSource.DELIVERY,
    location_id: 'loc-1',
    customer_name: `Klient ${id}`,
    items: [
      {
        id: `${id}-item-1`,
        product_id: productId,
        product_name: productName,
        quantity,
        unit_price: total,
        modifiers: [],
        subtotal: total,
      },
    ],
    subtotal: total,
    tax: 0,
    discount: 0,
    total,
    payment_status: PaymentStatus.PAID,
    status_history: [],
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseOrders.mockReturnValue({
      orders: [
        createOrder({
          id: '001',
          createdAt: '2026-03-17T12:00:00.000Z',
          total: 50,
          status: OrderStatus.DELIVERED,
          productId: 'prod-1',
          productName: 'Ramen Spicy Miso',
          quantity: 2,
        }),
        createOrder({
          id: '002',
          createdAt: '2026-03-17T11:00:00.000Z',
          total: 70,
          status: OrderStatus.CANCELLED,
          productId: 'prod-2',
          productName: 'Ramen Tonkotsu Chasiu',
          quantity: 3,
        }),
      ],
      isLoading: false,
    });
    mockGetAllWarehouseStockItems.mockResolvedValue([]);
    mockGetLowStockItems.mockResolvedValue([]);
  });

  it('excludes cancelled orders from dashboard aggregates and shows them separately', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockGetAllWarehouseStockItems).toHaveBeenCalled();
    });

    expect(screen.getByText(/Zamowienia dzisiaj:1/)).toBeInTheDocument();
    expect(screen.getByText(/Przychod dzisiaj:.*50/)).toBeInTheDocument();
    expect(screen.getByText(/Srednia wartosc:.*50/)).toBeInTheDocument();
    expect(screen.getByText(/Anulowane dzisiaj:1/)).toBeInTheDocument();
    expect(screen.getByText('Ramen Spicy Miso')).toBeInTheDocument();
    expect(screen.queryByText('Ramen Tonkotsu Chasiu')).not.toBeInTheDocument();
  });
});
