import { StockCount } from '@/types/inventory';
import { StockCountType, StockCountStatus } from '@/types/enums';
import { WAREHOUSE_IDS, STOCK_ITEM_IDS } from './inventory';

/**
 * Example stock counts demonstrating different types and statuses:
 * - DAILY: Daily cycle count (partial inventory)
 * - WEEKLY: Weekly spot check
 * - MONTHLY: Monthly full count
 * - AD_HOC: On-demand count (after incident)
 */

const today = new Date();
const formatDate = (date: Date) => date.toISOString();

const daysAgo = (days: number): string => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return formatDate(date);
};

const hoursAgo = (hours: number): string => {
  const date = new Date(today);
  date.setHours(date.getHours() - hours);
  return formatDate(date);
};

export const stockCounts: StockCount[] = [
  // COMPLETED - Monthly full count (all items, multiple variances)
  {
    id: 'count-001',
    count_number: 'INV-2024-001',
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    type: StockCountType.MONTHLY,
    status: StockCountStatus.APPROVED,
    scheduled_date: daysAgo(7),
    started_at: daysAgo(7),
    completed_at: daysAgo(6),
    counted_by: ['user-001', 'user-002'],
    approved_by: 'user-001',
    approved_at: daysAgo(5),
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.BEEF,
        quantity_system: 45000,        // System: 45kg
        quantity_counted: 44500,       // Counted: 44.5kg
        variance: -500,                // -500g shortage
        variance_cost: 16.0,           // 500 × 0.032 PLN
        notes: 'Nieznaczny niedobór - możliwe odparowanie',
      },
      {
        stock_item_id: STOCK_ITEM_IDS.CHICKEN,
        quantity_system: 15000,
        quantity_counted: 15000,
        variance: 0,                   // Perfect match
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.BACON,
        quantity_system: 8000,
        quantity_counted: 7800,
        variance: -200,                // -200g shortage
        variance_cost: 9.0,            // 200 × 0.045 PLN
      },
      {
        stock_item_id: STOCK_ITEM_IDS.CHEDDAR,
        quantity_system: 12000,
        quantity_counted: 12200,
        variance: 200,                 // +200g surplus
        variance_cost: 5.6,            // 200 × 0.028 PLN
        notes: 'Nadwyżka - możliwy błąd przy poprzednim wydaniu',
      },
      {
        stock_item_id: STOCK_ITEM_IDS.MILK,
        quantity_system: 45000,
        quantity_counted: 45000,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.LETTUCE,
        quantity_system: 20,
        quantity_counted: 18,
        variance: -2,                  // -2 heads shortage
        variance_cost: 7.0,            // 2 × 3.5 PLN
        notes: 'Brak 2 sztuk - sprawdzono wszystkie lokalizacje',
      },
      {
        stock_item_id: STOCK_ITEM_IDS.TOMATOES,
        quantity_system: 30000,
        quantity_counted: 30000,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.BUNS,
        quantity_system: 200,
        quantity_counted: 205,
        variance: 5,                   // +5 buns surplus
        variance_cost: 6.0,            // 5 × 1.2 PLN
      },
      {
        stock_item_id: STOCK_ITEM_IDS.OIL,
        quantity_system: 50000,
        quantity_counted: 50000,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.COLA,
        quantity_system: 250,
        quantity_counted: 238,
        variance: -12,                 // -12 cans shortage
        variance_cost: 21.6,           // 12 × 1.8 PLN
        notes: 'Znaczący niedobór - wymaga wyjaśnienia',
      },
    ],
    notes: 'Miesięczna inwentaryzacja pełna. Ogółem 3 pozycje z niedoborami, 2 z nadwyżkami. Wartość netto niedoborów: ~50 PLN.',
    created_at: daysAgo(7),
    updated_at: daysAgo(5),
  },

  // COMPLETED - Daily cycle count (3 random items)
  {
    id: 'count-002',
    count_number: 'INV-2024-002',
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    type: StockCountType.DAILY,
    status: StockCountStatus.COMPLETED,
    scheduled_date: daysAgo(2),
    started_at: daysAgo(2),
    completed_at: daysAgo(2),
    counted_by: ['user-002'],
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.BEEF,
        quantity_system: 42000,
        quantity_counted: 42000,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.LETTUCE,
        quantity_system: 12,
        quantity_counted: 12,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.BBQ_SAUCE,
        quantity_system: 20000,
        quantity_counted: 19800,
        variance: -200,                // -200ml shortage
        variance_cost: 2.4,            // 200 × 0.012 PLN
      },
    ],
    notes: 'Dzienna inwentaryzacja rotacyjna - 3 losowe pozycje. Niewielki niedobór sosu BBQ.',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },

  // IN_PROGRESS - Weekly count (in progress)
  {
    id: 'count-003',
    count_number: 'INV-2024-003',
    warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    type: StockCountType.WEEKLY,
    status: StockCountStatus.IN_PROGRESS,
    scheduled_date: formatDate(today),
    started_at: hoursAgo(1),
    counted_by: ['user-003'],
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.BUNS,
        quantity_system: 85,
        quantity_counted: 83,
        variance: -2,
        variance_cost: 2.4,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.COLA,
        quantity_system: 60,
        quantity_counted: 60,
        variance: 0,
        variance_cost: 0,
      },
      // More items being counted...
    ],
    notes: 'Tygodniowa inwentaryzacja food trucka - w trakcie liczenia.',
    created_at: hoursAgo(1),
    updated_at: hoursAgo(1),
  },

  // DRAFT - Scheduled for tomorrow
  {
    id: 'count-004',
    count_number: 'INV-2024-004',
    warehouse_id: WAREHOUSE_IDS.CENTRAL_SEMI,
    type: StockCountType.WEEKLY,
    status: StockCountStatus.DRAFT,
    scheduled_date: (() => {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDate(tomorrow);
    })(),
    counted_by: ['user-001', 'user-002'],
    items: [],
    notes: 'Zaplanowana tygodniowa inwentaryzacja magazynu półproduktów.',
    created_at: formatDate(today),
    updated_at: formatDate(today),
  },

  // AD_HOC - After theft incident
  {
    id: 'count-005',
    count_number: 'INV-2024-005',
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    type: StockCountType.AD_HOC,
    status: StockCountStatus.APPROVED,
    scheduled_date: daysAgo(7),
    started_at: daysAgo(7),
    completed_at: daysAgo(7),
    counted_by: ['user-001', 'user-002'],
    approved_by: 'user-001',
    approved_at: daysAgo(6),
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.BACON,
        quantity_system: 3000,
        quantity_counted: 2500,
        variance: -500,                // -500g shortage (theft)
        variance_cost: 22.5,           // 500 × 0.045 PLN
        notes: 'Potwierdzony niedobór - zgłoszono kradzież',
      },
      {
        stock_item_id: STOCK_ITEM_IDS.BEEF,
        quantity_system: 45000,
        quantity_counted: 45000,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.CHICKEN,
        quantity_system: 15000,
        quantity_counted: 15000,
        variance: 0,
        variance_cost: 0,
      },
    ],
    notes: 'Inwentaryzacja doraźna po podejrzeniu kradzieży. Potwierdzono niedobór bekonu.',
    created_at: daysAgo(7),
    updated_at: daysAgo(6),
  },

  // COMPLETED - Daily count with no variances (perfect accuracy)
  {
    id: 'count-006',
    count_number: 'INV-2024-006',
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    type: StockCountType.DAILY,
    status: StockCountStatus.COMPLETED,
    scheduled_date: daysAgo(1),
    started_at: daysAgo(1),
    completed_at: daysAgo(1),
    counted_by: ['user-002'],
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.MILK,
        quantity_system: 45000,
        quantity_counted: 45000,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.OIL,
        quantity_system: 50000,
        quantity_counted: 50000,
        variance: 0,
        variance_cost: 0,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.TOMATOES,
        quantity_system: 30000,
        quantity_counted: 30000,
        variance: 0,
        variance_cost: 0,
      },
    ],
    notes: 'Dzienna inwentaryzacja - 100% zgodność!',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
];
