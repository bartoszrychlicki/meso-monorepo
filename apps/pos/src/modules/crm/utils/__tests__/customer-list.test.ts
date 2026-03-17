import { describe, expect, it } from 'vitest';
import type { Customer } from '@/types/crm';
import { CustomerSource, LoyaltyTier } from '@/types/enums';
import {
  DEFAULT_CUSTOMER_SORT,
  getCustomerFavoriteProduct,
  getCustomerFullName,
  getCustomerOrderHistory,
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

  it('keeps customers without a favorite dish at the end in descending dish sort', () => {
    const customerWithoutOrders = makeCustomer({
      first_name: 'Adam',
      order_history: {
        total_orders: 0,
        total_spent: 0,
        average_order_value: 0,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithOrders = makeCustomer({
      first_name: 'Karolina',
      order_history: {
        total_orders: 2,
        total_spent: 90,
        average_order_value: 45,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [
          { product_id: '1', product_name: 'Bao', order_count: 2 },
        ],
      },
    });

    const sorted = sortCustomers(
      [customerWithoutOrders, customerWithOrders],
      { key: 'favorite_dish', order: 'desc' }
    );

    expect(sorted.map((customer) => customer.first_name)).toEqual(['Karolina', 'Adam']);
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

  it('normalizes invalid order history numbers to zero', () => {
    const customer = makeCustomer({
      order_history: {
        total_orders: Number.NaN,
        total_spent: Number.NaN,
        average_order_value: Number.NaN,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });

    expect(getCustomerOrderHistory(customer)).toMatchObject({
      total_orders: 0,
      total_spent: 0,
      average_order_value: 0,
    });
  });

  it('sorts spent totals ascending with invalid values treated as zero', () => {
    const customerWithInvalidSpent = makeCustomer({
      first_name: 'Adam',
      registration_date: '2026-03-11T10:00:00.000Z',
      order_history: {
        total_orders: 0,
        total_spent: Number.NaN,
        average_order_value: 0,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithZeroSpent = makeCustomer({
      first_name: 'Beata',
      registration_date: '2026-03-09T10:00:00.000Z',
      order_history: {
        total_orders: 0,
        total_spent: 0,
        average_order_value: 0,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithEightySpent = makeCustomer({
      first_name: 'Karolina',
      registration_date: '2026-03-08T10:00:00.000Z',
      order_history: {
        total_orders: 1,
        total_spent: 80,
        average_order_value: 80,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithEightyTwoSpent = makeCustomer({
      first_name: 'Robert',
      registration_date: '2026-03-07T10:00:00.000Z',
      order_history: {
        total_orders: 1,
        total_spent: 82,
        average_order_value: 82,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithTwoHundredSpent = makeCustomer({
      first_name: 'Bartosz',
      registration_date: '2026-03-06T10:00:00.000Z',
      order_history: {
        total_orders: 2,
        total_spent: 205,
        average_order_value: 102.5,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });

    const sorted = sortCustomers(
      [
        customerWithInvalidSpent,
        customerWithEightySpent,
        customerWithZeroSpent,
        customerWithTwoHundredSpent,
        customerWithEightyTwoSpent,
      ],
      { key: 'total_spent', order: 'asc' }
    );

    expect(sorted.map((customer) => customer.first_name)).toEqual([
      'Adam',
      'Beata',
      'Karolina',
      'Robert',
      'Bartosz',
    ]);
  });

  it('sorts spent totals descending with invalid values treated as zero', () => {
    const customerWithInvalidSpent = makeCustomer({
      first_name: 'Adam',
      registration_date: '2026-03-11T10:00:00.000Z',
      order_history: {
        total_orders: 0,
        total_spent: Number.NaN,
        average_order_value: 0,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithZeroSpent = makeCustomer({
      first_name: 'Beata',
      registration_date: '2026-03-09T10:00:00.000Z',
      order_history: {
        total_orders: 0,
        total_spent: 0,
        average_order_value: 0,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithEightySpent = makeCustomer({
      first_name: 'Karolina',
      registration_date: '2026-03-08T10:00:00.000Z',
      order_history: {
        total_orders: 1,
        total_spent: 80,
        average_order_value: 80,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithEightyTwoSpent = makeCustomer({
      first_name: 'Robert',
      registration_date: '2026-03-07T10:00:00.000Z',
      order_history: {
        total_orders: 1,
        total_spent: 82,
        average_order_value: 82,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });
    const customerWithTwoHundredSpent = makeCustomer({
      first_name: 'Bartosz',
      registration_date: '2026-03-06T10:00:00.000Z',
      order_history: {
        total_orders: 2,
        total_spent: 205,
        average_order_value: 102.5,
        last_order_date: null,
        first_order_date: null,
        top_ordered_products: [],
      },
    });

    const sorted = sortCustomers(
      [
        customerWithInvalidSpent,
        customerWithEightySpent,
        customerWithZeroSpent,
        customerWithTwoHundredSpent,
        customerWithEightyTwoSpent,
      ],
      { key: 'total_spent', order: 'desc' }
    );

    expect(sorted.map((customer) => customer.first_name)).toEqual([
      'Bartosz',
      'Robert',
      'Karolina',
      'Adam',
      'Beata',
    ]);
  });
});
