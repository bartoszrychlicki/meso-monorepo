/**
 * Customer Seed Data
 *
 * Sample customers for development and testing.
 */

import { Customer } from '@/types/crm';
import { LoyaltyTier, CustomerSource } from '@/types/enums';

export const CUSTOMER_IDS = {
  REGULAR_1: '99999999-9999-9999-9999-999999990001',
  REGULAR_2: '99999999-9999-9999-9999-999999990002',
  SILVER_1: '99999999-9999-9999-9999-999999990003',
  GOLD_1: '99999999-9999-9999-9999-999999990004',
  NEW_1: '99999999-9999-9999-9999-999999990005',
} as const;

export const customers: Customer[] = [
  {
    id: CUSTOMER_IDS.REGULAR_1,
    first_name: 'Anna',
    last_name: 'Kowalska',
    email: 'anna.kowalska@example.com',
    phone: '+48 501 234 567',
    birth_date: new Date('1990-05-15').toISOString(),
    registration_date: new Date('2024-01-01').toISOString(),
    source: CustomerSource.MOBILE_APP,
    marketing_consent: true,

    loyalty_points: 350,
    loyalty_tier: LoyaltyTier.BRONZE,

    rfm_segment: null,
    rfm_recency_score: null,
    rfm_frequency_score: null,
    rfm_monetary_score: null,
    rfm_last_calculated: null,

    addresses: [
      {
        id: 'addr-001',
        customer_id: CUSTOMER_IDS.REGULAR_1,
        label: 'Dom',
        street: 'ul. Marszałkowska',
        building_number: '100',
        apartment_number: '25',
        postal_code: '00-001',
        city: 'Warszawa',
        is_default: true,
        delivery_instructions: 'Dzwonek na dole, 2 piętro',
        created_at: new Date('2024-01-01').toISOString(),
      },
    ],

    preferences: {
      favorite_products: [],
      dietary_restrictions: ['gluten_free'],
      default_payment_method: 'card',
    },

    order_history: {
      total_orders: 12,
      total_spent: 450.0,
      average_order_value: 37.5,
      last_order_date: new Date('2024-02-01').toISOString(),
      first_order_date: new Date('2024-01-05').toISOString(),
    },

    notes: null,
    is_active: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString(),
  },

  {
    id: CUSTOMER_IDS.REGULAR_2,
    first_name: 'Jan',
    last_name: 'Kowalski',
    email: 'jan.kowalski@example.com',
    phone: '+48 502 234 567',
    birth_date: new Date('1988-03-22').toISOString(),
    registration_date: new Date('2024-01-15').toISOString(),
    source: CustomerSource.POS_TERMINAL,
    marketing_consent: false,

    loyalty_points: 180,
    loyalty_tier: LoyaltyTier.BRONZE,

    rfm_segment: null,
    rfm_recency_score: null,
    rfm_frequency_score: null,
    rfm_monetary_score: null,
    rfm_last_calculated: null,

    addresses: [],

    preferences: {},

    order_history: {
      total_orders: 5,
      total_spent: 215.0,
      average_order_value: 43.0,
      last_order_date: new Date('2024-01-30').toISOString(),
      first_order_date: new Date('2024-01-15').toISOString(),
    },

    notes: 'Zawsze zamawia z dodatkiem ostrego sosu',
    is_active: true,
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-30').toISOString(),
  },

  {
    id: CUSTOMER_IDS.SILVER_1,
    first_name: 'Piotr',
    last_name: 'Nowak',
    email: 'piotr.nowak@example.com',
    phone: '+48 503 345 678',
    birth_date: new Date('1985-08-20').toISOString(),
    registration_date: new Date('2023-10-01').toISOString(),
    source: CustomerSource.POS_TERMINAL,
    marketing_consent: true,

    loyalty_points: 750,
    loyalty_tier: LoyaltyTier.SILVER,

    rfm_segment: null,
    rfm_recency_score: null,
    rfm_frequency_score: null,
    rfm_monetary_score: null,
    rfm_last_calculated: null,

    addresses: [
      {
        id: 'addr-003',
        customer_id: CUSTOMER_IDS.SILVER_1,
        label: 'Biuro',
        street: 'ul. Świętokrzyska',
        building_number: '21',
        apartment_number: null,
        postal_code: '00-002',
        city: 'Warszawa',
        is_default: true,
        delivery_instructions: 'Recepcja, 1 piętro',
        created_at: new Date('2023-10-01').toISOString(),
      },
    ],

    preferences: {
      favorite_products: [],
      dietary_restrictions: [],
      default_payment_method: 'blik',
    },

    order_history: {
      total_orders: 35,
      total_spent: 1250.0,
      average_order_value: 35.71,
      last_order_date: new Date('2024-01-28').toISOString(),
      first_order_date: new Date('2023-10-05').toISOString(),
    },

    notes: 'Stały klient, preferuje burgery ostrzejsze',
    is_active: true,
    created_at: new Date('2023-10-01').toISOString(),
    updated_at: new Date('2024-01-28').toISOString(),
  },

  {
    id: CUSTOMER_IDS.GOLD_1,
    first_name: 'Maria',
    last_name: 'Wiśniewska',
    email: 'maria.wisniewska@example.com',
    phone: '+48 504 456 789',
    birth_date: new Date('1978-12-10').toISOString(),
    registration_date: new Date('2023-06-01').toISOString(),
    source: CustomerSource.MOBILE_APP,
    marketing_consent: true,

    loyalty_points: 1850,
    loyalty_tier: LoyaltyTier.GOLD,

    rfm_segment: null,
    rfm_recency_score: null,
    rfm_frequency_score: null,
    rfm_monetary_score: null,
    rfm_last_calculated: null,

    addresses: [
      {
        id: 'addr-002',
        customer_id: CUSTOMER_IDS.GOLD_1,
        label: 'Dom',
        street: 'ul. Emilii Plater',
        building_number: '53',
        apartment_number: '12A',
        postal_code: '00-113',
        city: 'Warszawa',
        is_default: true,
        delivery_instructions: 'Domofon - Wiśniewska',
        created_at: new Date('2023-06-01').toISOString(),
      },
      {
        id: 'addr-004',
        customer_id: CUSTOMER_IDS.GOLD_1,
        label: 'Biuro',
        street: 'ul. Złota',
        building_number: '44',
        apartment_number: null,
        postal_code: '00-120',
        city: 'Warszawa',
        is_default: false,
        delivery_instructions: 'Ochrona przy wejściu',
        created_at: new Date('2023-07-15').toISOString(),
      },
    ],

    preferences: {
      favorite_products: [],
      dietary_restrictions: [],
      default_payment_method: 'card',
    },

    order_history: {
      total_orders: 78,
      total_spent: 3200.0,
      average_order_value: 41.03,
      last_order_date: new Date('2024-02-05').toISOString(),
      first_order_date: new Date('2023-06-08').toISOString(),
    },

    notes: 'VIP - zawsze pyta o nowości w menu',
    is_active: true,
    created_at: new Date('2023-06-01').toISOString(),
    updated_at: new Date('2024-02-05').toISOString(),
  },

  {
    id: CUSTOMER_IDS.NEW_1,
    first_name: 'Tomasz',
    last_name: 'Kaczmarek',
    email: null,
    phone: '+48 505 567 890',
    birth_date: null,
    registration_date: new Date('2024-02-06').toISOString(),
    source: CustomerSource.POS_TERMINAL,
    marketing_consent: false,

    loyalty_points: 0,
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
    },

    notes: null,
    is_active: true,
    created_at: new Date('2024-02-06').toISOString(),
    updated_at: new Date('2024-02-06').toISOString(),
  },
];
