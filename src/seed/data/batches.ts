import { Batch } from '@/types/inventory';
import { BatchStatus } from '@/types/enums';
import { WAREHOUSE_IDS, STOCK_ITEM_IDS } from './inventory';

/**
 * Example batches demonstrating different statuses:
 * - FRESH (>50% shelf life)
 * - WARNING (25-50% shelf life)
 * - CRITICAL (<25% shelf life)
 * - EXPIRED (past expiry date)
 */

const today = new Date();
const formatDate = (date: Date) => date.toISOString();

// Helper to create dates relative to today
const daysFromNow = (days: number): string => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

const daysAgo = (days: number): string => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return formatDate(date);
};

export const batches: Batch[] = [
  // FRESH batches (>50% shelf life remaining)
  {
    id: 'batch-001',
    stock_item_id: STOCK_ITEM_IDS.BEEF,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'BEEF-2024-001',
    production_date: daysAgo(2),          // Produced 2 days ago
    quantity_initial: 10000,               // 10kg
    quantity_current: 8500,                // 8.5kg remaining
    cost_per_unit: 0.032,
    received_date: daysAgo(1),
    expiry_date: daysFromNow(12),         // Expires in 12 days (>50% of 14-day shelf life)
    status: BatchStatus.FRESH,
    created_at: daysAgo(1),
    updated_at: formatDate(today),
  },
  {
    id: 'batch-002',
    stock_item_id: STOCK_ITEM_IDS.CHEDDAR,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'CHEESE-2024-001',
    production_date: daysAgo(5),
    quantity_initial: 5000,                // 5kg
    quantity_current: 4200,
    cost_per_unit: 0.028,
    received_date: daysAgo(4),
    expiry_date: daysFromNow(25),         // Expires in 25 days (>50% of 30-day shelf life)
    status: BatchStatus.FRESH,
    created_at: daysAgo(4),
    updated_at: formatDate(today),
  },
  {
    id: 'batch-003',
    stock_item_id: STOCK_ITEM_IDS.MILK,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'MILK-2024-001',
    production_date: daysAgo(1),
    quantity_initial: 12000,               // 12L
    quantity_current: 11000,
    cost_per_unit: 0.003,
    received_date: daysAgo(1),
    expiry_date: daysFromNow(6),          // Expires in 6 days (>50% of 7-day shelf life)
    status: BatchStatus.FRESH,
    created_at: daysAgo(1),
    updated_at: formatDate(today),
  },

  // WARNING batches (25-50% shelf life remaining)
  {
    id: 'batch-004',
    stock_item_id: STOCK_ITEM_IDS.BEEF,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'BEEF-2024-002',
    production_date: daysAgo(10),
    quantity_initial: 10000,
    quantity_current: 3000,                // 3kg remaining
    cost_per_unit: 0.032,
    received_date: daysAgo(9),
    expiry_date: daysFromNow(5),          // Expires in 5 days (35% of 14-day shelf life)
    status: BatchStatus.WARNING,
    created_at: daysAgo(9),
    updated_at: formatDate(today),
  },
  {
    id: 'batch-005',
    stock_item_id: STOCK_ITEM_IDS.LETTUCE,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'LETTUCE-2024-001',
    production_date: daysAgo(4),
    quantity_initial: 20,                  // 20 heads
    quantity_current: 12,
    cost_per_unit: 3.5,
    received_date: daysAgo(3),
    expiry_date: daysFromNow(2),          // Expires in 2 days (28% of 7-day shelf life)
    status: BatchStatus.WARNING,
    created_at: daysAgo(3),
    updated_at: formatDate(today),
  },
  {
    id: 'batch-006',
    stock_item_id: STOCK_ITEM_IDS.TOMATOES,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'TOMATO-2024-001',
    production_date: daysAgo(3),
    quantity_initial: 10000,               // 10kg
    quantity_current: 7500,
    cost_per_unit: 0.008,
    received_date: daysAgo(2),
    expiry_date: daysFromNow(2),          // Expires in 2 days (40% of 5-day shelf life)
    status: BatchStatus.WARNING,
    created_at: daysAgo(2),
    updated_at: formatDate(today),
  },

  // CRITICAL batches (<25% shelf life remaining)
  {
    id: 'batch-007',
    stock_item_id: STOCK_ITEM_IDS.CHICKEN,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'CHICKEN-2024-001',
    production_date: daysAgo(6),
    quantity_initial: 5000,                // 5kg
    quantity_current: 2000,
    cost_per_unit: 0.018,
    received_date: daysAgo(5),
    expiry_date: daysFromNow(1),          // Expires in 1 day (14% of 7-day shelf life)
    status: BatchStatus.CRITICAL,
    created_at: daysAgo(5),
    updated_at: formatDate(today),
  },
  {
    id: 'batch-008',
    stock_item_id: STOCK_ITEM_IDS.BBQ_SAUCE,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_SEMI,
    batch_number: 'BBQ-2024-001',
    production_date: daysAgo(28),
    quantity_initial: 10000,               // 10L
    quantity_current: 3500,
    cost_per_unit: 0.012,
    received_date: daysAgo(27),
    expiry_date: daysFromNow(2),          // Expires in 2 days (6.6% of 30-day shelf life)
    status: BatchStatus.CRITICAL,
    created_at: daysAgo(27),
    updated_at: formatDate(today),
  },

  // EXPIRED batch (past expiry date)
  {
    id: 'batch-009',
    stock_item_id: STOCK_ITEM_IDS.LETTUCE,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'LETTUCE-2024-002',
    production_date: daysAgo(10),
    quantity_initial: 15,
    quantity_current: 5,                   // Still has quantity but expired
    cost_per_unit: 3.5,
    received_date: daysAgo(9),
    expiry_date: daysAgo(2),              // Expired 2 days ago
    status: BatchStatus.EXPIRED,
    created_at: daysAgo(9),
    updated_at: formatDate(today),
  },

  // DEPLETED batch (quantity = 0)
  {
    id: 'batch-010',
    stock_item_id: STOCK_ITEM_IDS.BACON,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'BACON-2024-001',
    production_date: daysAgo(15),
    quantity_initial: 3000,
    quantity_current: 0,                   // Fully used
    cost_per_unit: 0.045,
    received_date: daysAgo(14),
    expiry_date: daysFromNow(5),
    status: BatchStatus.DEPLETED,
    created_at: daysAgo(14),
    updated_at: formatDate(today),
  },

  // Non-perishable items (no expiry date) - always FRESH
  {
    id: 'batch-011',
    stock_item_id: STOCK_ITEM_IDS.COLA,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'COLA-2024-001',
    production_date: daysAgo(30),
    quantity_initial: 288,                 // 1 pallet
    quantity_current: 250,
    cost_per_unit: 1.8,
    received_date: daysAgo(29),
    expiry_date: undefined,                // No expiry (long shelf life)
    status: BatchStatus.FRESH,
    created_at: daysAgo(29),
    updated_at: formatDate(today),
  },
  {
    id: 'batch-012',
    stock_item_id: STOCK_ITEM_IDS.OIL,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_number: 'OIL-2024-001',
    production_date: daysAgo(45),
    quantity_initial: 20000,               // 20L
    quantity_current: 18000,
    cost_per_unit: 0.008,
    received_date: daysAgo(44),
    expiry_date: undefined,                // No expiry
    status: BatchStatus.FRESH,
    created_at: daysAgo(44),
    updated_at: formatDate(today),
  },

  // Additional FRESH batches for Food Truck warehouse
  {
    id: 'batch-013',
    stock_item_id: STOCK_ITEM_IDS.BUNS,
    warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    batch_number: 'BUNS-FT-001',
    production_date: daysAgo(1),
    quantity_initial: 100,
    quantity_current: 85,
    cost_per_unit: 1.2,
    received_date: daysAgo(1),
    expiry_date: daysFromNow(2),          // 3-day shelf life, 2 days remaining (66%)
    status: BatchStatus.FRESH,
    created_at: daysAgo(1),
    updated_at: formatDate(today),
  },
];
