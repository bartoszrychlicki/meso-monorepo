import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { LOCATION_IDS } from './locations';

// Fixed UUIDs for kitchen tickets
export const KITCHEN_TICKET_IDS = {
  TICKET_1: 'aaaa0000-0000-0000-0000-000000000001',
  TICKET_2: 'aaaa0000-0000-0000-0000-000000000002',
  TICKET_3: 'aaaa0000-0000-0000-0000-000000000003',
  TICKET_4: 'aaaa0000-0000-0000-0000-000000000004',
  TICKET_5: 'aaaa0000-0000-0000-0000-000000000005',
} as const;

const now = new Date();

function minutesAgo(minutes: number): string {
  return new Date(now.getTime() - minutes * 60 * 1000).toISOString();
}

export const kitchenTickets: KitchenTicket[] = [
  // Ticket 1: Preparing, started 5 min ago
  {
    id: KITCHEN_TICKET_IDS.TICKET_1,
    order_id: 'ord-20250207-004',
    order_number: 'ZAM-20250207-004',
    location_id: LOCATION_IDS.CENTRAL_KITCHEN,
    status: OrderStatus.PREPARING,
    items: [
      {
        id: 'ki-001',
        order_item_id: 'oi-004-1',
        product_name: 'Cheeseburger',
        quantity: 2,
        modifiers: ['Dodatkowy ser'],
        is_done: true,
      },
    ],
    priority: 1,
    started_at: minutesAgo(5),
    estimated_minutes: 12,
    created_at: minutesAgo(8),
    updated_at: minutesAgo(5),
  },

  // Ticket 2: Preparing, started 2 min ago
  {
    id: KITCHEN_TICKET_IDS.TICKET_2,
    order_id: 'ord-20250207-005',
    order_number: 'ZAM-20250207-005',
    location_id: LOCATION_IDS.CENTRAL_KITCHEN,
    status: OrderStatus.PREPARING,
    items: [
      {
        id: 'ki-002',
        order_item_id: 'oi-005-1',
        product_name: 'Bacon Burger',
        quantity: 1,
        modifiers: [],
        is_done: false,
      },
      {
        id: 'ki-003',
        order_item_id: 'oi-005-2',
        product_name: 'Frytki',
        variant_name: 'Duże',
        quantity: 2,
        modifiers: ['Sos czosnkowy'],
        is_done: true,
      },
      {
        id: 'ki-004',
        order_item_id: 'oi-005-3',
        product_name: 'Lemoniada',
        variant_name: 'Średnia',
        quantity: 1,
        modifiers: [],
        is_done: true,
      },
    ],
    priority: 2,
    started_at: minutesAgo(2),
    estimated_minutes: 15,
    notes: 'Klient prosi o dobrze wysmażone mięso',
    created_at: minutesAgo(4),
    updated_at: minutesAgo(2),
  },

  // Ticket 3: Ready, completed
  {
    id: KITCHEN_TICKET_IDS.TICKET_3,
    order_id: 'ord-20250207-006',
    order_number: 'ZAM-20250207-006',
    location_id: LOCATION_IDS.CENTRAL_KITCHEN,
    status: OrderStatus.READY,
    items: [
      {
        id: 'ki-005',
        order_item_id: 'oi-006-1',
        product_name: 'Double Smash Burger',
        quantity: 1,
        modifiers: ['Dodatkowy bekon'],
        is_done: true,
      },
      {
        id: 'ki-006',
        order_item_id: 'oi-006-2',
        product_name: 'Frytki',
        variant_name: 'Średnie',
        quantity: 1,
        modifiers: [],
        is_done: true,
      },
    ],
    priority: 1,
    started_at: minutesAgo(16),
    completed_at: minutesAgo(2),
    estimated_minutes: 14,
    created_at: minutesAgo(20),
    updated_at: minutesAgo(2),
  },

  // Ticket 4: New, just arrived
  {
    id: KITCHEN_TICKET_IDS.TICKET_4,
    order_id: 'ord-20250207-008',
    order_number: 'ZAM-20250207-008',
    location_id: LOCATION_IDS.FOOD_TRUCK_MOKOTOW,
    status: OrderStatus.PENDING,
    items: [
      {
        id: 'ki-007',
        order_item_id: 'oi-008-1',
        product_name: 'Zestaw Burger',
        quantity: 1,
        modifiers: ['Burger klasyczny', 'Frytki średnie', 'Cola 0.3L'],
        is_done: false,
      },
    ],
    priority: 1,
    estimated_minutes: 15,
    created_at: minutesAgo(1),
    updated_at: minutesAgo(1),
  },

  // Ticket 5: New, just arrived
  {
    id: KITCHEN_TICKET_IDS.TICKET_5,
    order_id: 'ord-20250207-009',
    order_number: 'ZAM-20250207-009',
    location_id: LOCATION_IDS.FOOD_TRUCK_MOKOTOW,
    status: OrderStatus.PENDING,
    items: [
      {
        id: 'ki-008',
        order_item_id: 'oi-009-1',
        product_name: 'Veggie Burger',
        quantity: 1,
        modifiers: [],
        is_done: false,
      },
      {
        id: 'ki-009',
        order_item_id: 'oi-009-2',
        product_name: 'Sałatka Cezar',
        quantity: 1,
        modifiers: ['Bez grzanek'],
        is_done: false,
      },
    ],
    priority: 1,
    estimated_minutes: 10,
    created_at: minutesAgo(0.5),
    updated_at: minutesAgo(0.5),
  },
];
