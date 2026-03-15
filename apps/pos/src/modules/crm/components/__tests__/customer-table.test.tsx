import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Customer } from '@/types/crm';
import { CustomerSource, LoyaltyTier } from '@/types/enums';
import { CustomerTable } from '../customer-table';
import { DEFAULT_CUSTOMER_SORT } from '@/modules/crm/utils/customer-list';

function makeCustomer(overrides: Partial<Customer>): Customer {
  return {
    id: crypto.randomUUID(),
    created_at: '2026-03-01T12:00:00.000Z',
    updated_at: '2026-03-01T12:00:00.000Z',
    first_name: 'Jan',
    last_name: 'Kowalski',
    email: 'jan@example.com',
    phone: '+48 500 100 100',
    birth_date: null,
    registration_date: '2026-03-01T12:00:00.000Z',
    source: CustomerSource.POS_TERMINAL,
    marketing_consent: false,
    loyalty_points: 100,
    loyalty_tier: LoyaltyTier.BRONZE,
    rfm_segment: null,
    rfm_recency_score: null,
    rfm_frequency_score: null,
    rfm_monetary_score: null,
    rfm_last_calculated: null,
    addresses: [],
    preferences: {},
    order_history: {
      total_orders: 0,
      total_spent: 0,
      average_order_value: 0,
      last_order_date: null,
      first_order_date: null,
      top_ordered_products: [],
    },
    notes: null,
    is_active: true,
    ...overrides,
  };
}

describe('CustomerTable', () => {
  it('keeps the compact column set and shows zero spent for invalid order totals', () => {
    render(
      <CustomerTable
        customers={[
          makeCustomer({
            order_history: {
              total_orders: 0,
              total_spent: Number.NaN,
              average_order_value: Number.NaN,
              last_order_date: null,
              first_order_date: null,
              top_ordered_products: [],
            },
          }),
        ]}
        sort={DEFAULT_CUSTOMER_SORT}
        onSortChange={vi.fn()}
        onSelectCustomer={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Sortuj po: Ulubiona potrawa' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sortuj po: Zamówień' })).toBeInTheDocument();
    expect(screen.getByText(/0,00\s*zł/i)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
  });
});
