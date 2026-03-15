import { describe, expect, it } from 'vitest';
import type { Customer } from '@/types/crm';
import { CustomerSource, LoyaltyTier } from '@/types/enums';
import {
  DEFAULT_CUSTOMER_SORT,
  getCustomerFavoriteProduct,
  getCustomerFullName,
  getDefaultCustomerSortOrder,
  sortCustomers,
} from '../customer-list';

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

describe('customer list helpers', () => {
  it('returns newest customers first by default', () => {
    const olderCustomer = makeCustomer({
      first_name: 'Anna',
      registration_date: '2026-02-10T09:00:00.000Z',
    });
    const newerCustomer = makeCustomer({
      first_name: 'Maria',
      registration_date: '2026-03-10T09:00:00.000Z',
    });

    const sorted = sortCustomers([olderCustomer, newerCustomer], DEFAULT_CUSTOMER_SORT);

    expect(sorted.map((customer) => customer.first_name)).toEqual(['Maria', 'Anna']);
  });

  it('sorts by favorite dish count when requested', () => {
    const oneDishCustomer = makeCustomer({
      first_name: 'Anna',
      order_history: {
        total_orders: 3,
        total_spent: 120,
        average_order_value: 40,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [
          { product_id: '1', product_name: 'Ramen', order_count: 2 },
        ],
      },
    });
    const twoDishCustomer = makeCustomer({
      first_name: 'Maria',
      order_history: {
        total_orders: 4,
        total_spent: 180,
        average_order_value: 45,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [
          { product_id: '2', product_name: 'Pho', order_count: 4 },
        ],
      },
    });

    const sorted = sortCustomers(
      [oneDishCustomer, twoDishCustomer],
      { key: 'favorite_dish', order: 'desc' }
    );

    expect(sorted.map((customer) => customer.first_name)).toEqual(['Maria', 'Anna']);
  });

  it('picks the most ordered favorite product', () => {
    const customer = makeCustomer({
      order_history: {
        total_orders: 5,
        total_spent: 200,
        average_order_value: 40,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [
          { product_id: '1', product_name: 'Pad Thai', order_count: 3 },
          { product_id: '2', product_name: 'Bao', order_count: 5 },
          { product_id: '3', product_name: 'Kimchi', order_count: 5 },
        ],
      },
    });

    expect(getCustomerFavoriteProduct(customer)).toEqual({
      product_id: '2',
      product_name: 'Bao',
      order_count: 5,
    });
  });

  it('exposes readable customer metadata helpers', () => {
    const customer = makeCustomer({
      first_name: 'Alicja',
      last_name: 'Nowak',
    });

    expect(getCustomerFullName(customer)).toBe('Alicja Nowak');
    expect(getDefaultCustomerSortOrder('name')).toBe('asc');
    expect(getDefaultCustomerSortOrder('registration_date')).toBe('desc');
  });
});
