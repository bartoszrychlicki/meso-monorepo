import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { OrderDetail } from '../order-detail';
import { Order, OrderItem, OrderItemModifier } from '@/types/order';
import { formatCurrency } from '@/lib/utils';
import {
  OrderStatus,
  OrderChannel,
  OrderSource,
  PaymentMethod,
  PaymentStatus,
  ModifierAction,
} from '@/types/enums';

// Polyfill for Radix components (Dialog, etc.)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// --- Mock data ---

const baseItem: OrderItem = {
  id: 'item-1',
  product_id: 'prod-1',
  product_name: 'Ramen Tonkotsu',
  quantity: 2,
  unit_price: 32.0,
  modifiers: [],
  subtotal: 64.0,
};

const modifiers: OrderItemModifier[] = [
  {
    modifier_id: 'mod-1',
    name: 'Extra Chashu',
    price: 8.0,
    quantity: 1,
    modifier_action: ModifierAction.ADD,
  },
  {
    modifier_id: 'mod-2',
    name: 'Podwojne Nori',
    price: 4.0,
    quantity: 1,
    modifier_action: ModifierAction.ADD,
  },
];

const itemWithModifiers: OrderItem = {
  ...baseItem,
  id: 'item-mod',
  modifiers,
  variant_name: 'Duzy',
  notes: 'Bez szczypiorku',
  subtotal: 76.0,
};

const itemUndefinedModifiers: OrderItem = {
  id: 'item-undef',
  product_id: 'prod-2',
  product_name: 'Gyoza',
  quantity: 1,
  unit_price: 18.0,
  modifiers: undefined as unknown as OrderItemModifier[],
  subtotal: 18.0,
};

const baseOrder: Order = {
  id: 'order-1',
  order_number: 'ORD-2024-0042',
  status: OrderStatus.PENDING,
  channel: OrderChannel.POS,
  source: OrderSource.DINE_IN,
  location_id: 'loc-1',
  items: [baseItem],
  subtotal: 64.0,
  tax: 5.12,
  discount: 0,
  delivery_fee: 0,
  tip: 0,
  total: 69.12,
  payment_method: PaymentMethod.CASH,
  payment_status: PaymentStatus.PENDING,
  status_history: [
    {
      status: OrderStatus.PENDING,
      timestamp: '2024-06-15T12:00:00Z',
      changed_by: 'Jan Kowalski',
    },
  ],
  created_at: '2024-06-15T12:00:00Z',
  updated_at: '2024-06-15T12:00:00Z',
};

const orderWithModifiers: Order = {
  ...baseOrder,
  id: 'order-full',
  order_number: 'ORD-2024-0100',
  source: OrderSource.DELIVERY,
  channel: OrderChannel.ONLINE,
  items: [itemWithModifiers],
  customer_name: 'Anna Nowak',
  customer_phone: '+48 600 100 200',
  delivery_address: {
    street: 'ul. Nowa 15/3',
    city: 'Warszawa',
    postal_code: '00-001',
    country: 'PL',
  },
  notes: 'Prosze dzwonic domofonem 15',
  delivery_type: 'delivery',
  subtotal: 76.0,
  tax: 6.08,
  delivery_fee: 5.0,
  tip: 3.0,
  discount: 10.0,
  total: 72.08,
  payment_method: PaymentMethod.BLIK,
  payment_status: PaymentStatus.PAID,
  promo_code: 'FIRST10',
  promo_discount: 10.0,
  external_order_id: 'ext-123',
  external_channel: 'delivery-app',
  metadata: { source: 'integration-test' },
  loyalty_points_earned: 72,
  preparing_at: '2024-06-15T12:10:00Z',
  ready_at: '2024-06-15T12:20:00Z',
  status_history: [
    {
      status: OrderStatus.CONFIRMED,
      timestamp: '2024-06-15T12:05:00Z',
      changed_by: 'System',
    },
    {
      status: OrderStatus.PENDING,
      timestamp: '2024-06-15T12:00:00Z',
    },
  ],
};

const orderMinimal: Order = {
  ...baseOrder,
  id: 'order-minimal',
  order_number: 'ORD-2024-0200',
  items: [itemUndefinedModifiers],
  subtotal: 18.0,
  tax: 1.44,
  discount: 0,
  total: 19.44,
};

const orderEmptyModifiers: Order = {
  ...baseOrder,
  id: 'order-empty-mods',
  order_number: 'ORD-2024-0300',
  items: [{ ...baseItem, id: 'item-empty', modifiers: [] }],
};

const cancelledOrder: Order = {
  ...baseOrder,
  id: 'order-cancelled',
  order_number: 'ORD-2024-0400',
  status: OrderStatus.CANCELLED,
  closure_reason: 'Brak składników',
  cancelled_at: '2024-06-15T12:20:00Z',
  status_history: [
    ...baseOrder.status_history,
    {
      status: OrderStatus.CANCELLED,
      timestamp: '2024-06-15T12:20:00Z',
      note: 'Brak składników',
    },
  ],
};

// --- Helpers ---

const noopStatusChange = vi.fn().mockResolvedValue(undefined);
const noopCancel = vi.fn().mockResolvedValue({
  order: baseOrder,
  refund: { status: 'not_requested' },
});

function renderOrderDetail(order: Order) {
  return render(
    <OrderDetail
      order={order}
      onStatusChange={noopStatusChange}
      onCancel={noopCancel}
    />
  );
}

// --- Tests ---

describe('OrderDetail', () => {
  it('renders basic order info: status, channel, source', () => {
    renderOrderDetail(orderWithModifiers);

    // Channel & source labels
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getAllByText('Dostawa').length).toBeGreaterThan(0);
  });

  it('renders closure reason for cancelled orders', () => {
    renderOrderDetail(cancelledOrder);

    expect(screen.getByText('Powód anulowania')).toBeInTheDocument();
    expect(screen.getAllByText('Brak składników').length).toBeGreaterThan(0);
  });

  it('renders pending refund alert when metadata tracks requested refund', () => {
    renderOrderDetail({
      ...cancelledOrder,
      payment_method: PaymentMethod.ONLINE,
      payment_status: PaymentStatus.PAID,
      total: 19.44,
      metadata: {
        p24: {
          refunds: [
            {
              requestId: 'req-1',
              refundsUuid: 'rf-1',
              sessionId: 'session-1',
              p24OrderId: '123',
              amount: 1944,
              description: 'Zwrot',
              status: 'requested',
              requestedAt: '2024-06-15T12:21:00Z',
            },
          ],
        },
      },
    });

    expect(screen.getByText('Zwrot w toku')).toBeInTheDocument();
  });

  it('renders items with modifiers and their prices', () => {
    renderOrderDetail(orderWithModifiers);

    expect(screen.getByText('Ramen Tonkotsu')).toBeInTheDocument();

    // Modifiers rendered with "+ name (price)" pattern
    expect(screen.getByText(/Extra Chashu/)).toBeInTheDocument();
    expect(screen.getByText(/Podwojne Nori/)).toBeInTheDocument();
  });

  it('does not crash when modifiers is undefined', () => {
    // The key test — this was the original bug
    expect(() => renderOrderDetail(orderMinimal)).not.toThrow();
    expect(screen.getByText('Gyoza')).toBeInTheDocument();
  });

  it('does not crash when modifiers is an empty array', () => {
    expect(() => renderOrderDetail(orderEmptyModifiers)).not.toThrow();
    expect(screen.getByText('Ramen Tonkotsu')).toBeInTheDocument();
  });

  it('renders variant_name when present', () => {
    renderOrderDetail(orderWithModifiers);

    expect(screen.getByText('(Duzy)')).toBeInTheDocument();
  });

  it('does not render variant_name when absent', () => {
    renderOrderDetail(orderMinimal);

    // The product renders, but no variant in parentheses
    expect(screen.queryByText(/\(.*\)/)).not.toBeInTheDocument();
  });

  it('renders customer name and phone', () => {
    renderOrderDetail(orderWithModifiers);

    expect(
      screen.getByText('Anna Nowak')
    ).toBeInTheDocument();
    expect(
      screen.getByText('+48 600 100 200')
    ).toBeInTheDocument();
  });

  it('shows "Brak danych klienta" when no customer info', () => {
    renderOrderDetail(orderMinimal);

    expect(screen.getByText('Brak danych klienta')).toBeInTheDocument();
  });

  it('renders delivery address when present', () => {
    renderOrderDetail(orderWithModifiers);

    const addressEl = screen.getByText('ul. Nowa 15/3');
    expect(addressEl).toBeInTheDocument();
    expect(screen.getByText(/00-001/)).toBeInTheDocument();
    expect(screen.getByText(/Warszawa/)).toBeInTheDocument();
  });

  it('does not render delivery address card when absent', () => {
    renderOrderDetail(orderMinimal);

    expect(screen.queryByText('Adres dostawy')).not.toBeInTheDocument();
  });

  it('renders order notes when present', () => {
    renderOrderDetail(orderWithModifiers);

    expect(screen.getByText('Uwagi')).toBeInTheDocument();
    expect(
      screen.getByText('Prosze dzwonic domofonem 15')
    ).toBeInTheDocument();
  });

  it('does not render notes section when absent', () => {
    renderOrderDetail(orderMinimal);

    expect(screen.queryByText('Uwagi')).not.toBeInTheDocument();
  });

  it('renders item-level notes', () => {
    renderOrderDetail(orderWithModifiers);

    expect(screen.getByText('Bez szczypiorku')).toBeInTheDocument();
  });

  it('renders financial summary with discount', () => {
    renderOrderDetail(orderWithModifiers);

    // Discount label visible
    expect(screen.getByText('Rabat')).toBeInTheDocument();
    expect(screen.getByText('Kwota netto')).toBeInTheDocument();
    expect(screen.getByText('Podatek VAT')).toBeInTheDocument();
    expect(screen.getByText('Kwota brutto')).toBeInTheDocument();

    const netRow = document.querySelector('[data-field="order-net"]');
    const vatRow = document.querySelector('[data-field="order-vat"]');
    const grossRow = document.querySelector('[data-field="order-gross"]');
    const normalize = (value: string) => value.replace(/\s/g, '');

    expect(normalize(netRow?.textContent || '')).toContain(
      normalize(formatCurrency(orderWithModifiers.total - orderWithModifiers.tax))
    );
    expect(normalize(vatRow?.textContent || '')).toContain(
      normalize(formatCurrency(orderWithModifiers.tax))
    );
    expect(normalize(grossRow?.textContent || '')).toContain(
      normalize(formatCurrency(orderWithModifiers.total))
    );
  });

  it('renders extended order metadata block', () => {
    renderOrderDetail(orderWithModifiers);

    expect(screen.getByText('Szczegóły zamówienia')).toBeInTheDocument();
    expect(screen.getByText('BLIK')).toBeInTheDocument();
    expect(screen.getByText('Opłacone')).toBeInTheDocument();
    expect(screen.getByText('Kod promocyjny')).toBeInTheDocument();
    expect(screen.getByText('FIRST10')).toBeInTheDocument();
    expect(screen.getByText('ID zewnętrzne')).toBeInTheDocument();
    expect(screen.getByText('ext-123')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });

  it('does not render discount line when discount is 0', () => {
    renderOrderDetail(orderMinimal);

    expect(screen.queryByText('Rabat')).not.toBeInTheDocument();
  });

  it('renders status history section', () => {
    renderOrderDetail(orderWithModifiers);

    expect(screen.getByText('Historia statusow')).toBeInTheDocument();

    // Use data-component to scope within the timeline
    const timeline = document.querySelector('[data-component="order-timeline"]');
    expect(timeline).toBeInTheDocument();

    // Timeline has entries with data-status attributes
    const entries = timeline!.querySelectorAll('[data-status]');
    expect(entries.length).toBe(2); // CONFIRMED + PENDING
  });
});
