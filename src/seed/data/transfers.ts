import { StockTransfer } from '@/types/inventory';
import { TransferStatus } from '@/types/enums';
import { WAREHOUSE_IDS, STOCK_ITEM_IDS } from './inventory';

/**
 * Example stock transfers demonstrating different statuses:
 * - DRAFT: Transfer being prepared
 * - PENDING: Awaiting approval/pickup
 * - IN_TRANSIT: Shipped, goods in transit
 * - COMPLETED: Received at destination
 * - CANCELLED: Transfer cancelled
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

export const stockTransfers: StockTransfer[] = [
  // COMPLETED transfer (delivered yesterday)
  {
    id: 'transfer-001',
    transfer_number: 'TR-2024-001',
    from_warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    to_warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.BEEF,
        quantity_requested: 5000,      // 5kg requested
        quantity_picked: 5000,         // 5kg picked
        quantity_received: 4950,       // 4.95kg received (50g damage)
      },
      {
        stock_item_id: STOCK_ITEM_IDS.BUNS,
        quantity_requested: 50,        // 50 buns
        quantity_picked: 50,
        quantity_received: 50,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.CHEDDAR,
        quantity_requested: 2000,      // 2kg cheese
        quantity_picked: 2000,
        quantity_received: 2000,
      },
    ],
    status: TransferStatus.COMPLETED,
    requested_by: 'user-001',          // Manager
    requested_at: daysAgo(2),
    picked_by: 'user-002',             // Warehouse worker
    picked_at: daysAgo(1),
    shipped_by: 'user-002',
    shipped_at: daysAgo(1),
    received_by: 'user-003',           // Food truck staff
    received_at: hoursAgo(6),
    notes: 'Daily resupply for food truck. Minor damage to beef packaging.',
    created_at: daysAgo(2),
    updated_at: hoursAgo(6),
  },

  // IN_TRANSIT transfer (currently being delivered)
  {
    id: 'transfer-002',
    transfer_number: 'TR-2024-002',
    from_warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    to_warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.CHICKEN,
        quantity_requested: 3000,      // 3kg chicken
        quantity_picked: 3000,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.BACON,
        quantity_requested: 1000,      // 1kg bacon
        quantity_picked: 1000,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.LETTUCE,
        quantity_requested: 10,        // 10 heads
        quantity_picked: 10,
      },
      {
        stock_item_id: STOCK_ITEM_IDS.TOMATOES,
        quantity_requested: 5000,      // 5kg tomatoes
        quantity_picked: 5000,
      },
    ],
    status: TransferStatus.IN_TRANSIT,
    requested_by: 'user-001',
    requested_at: hoursAgo(4),
    picked_by: 'user-002',
    picked_at: hoursAgo(2),
    shipped_by: 'user-002',
    shipped_at: hoursAgo(1),
    notes: 'Lunch service resupply. Expected arrival: 30 minutes.',
    created_at: hoursAgo(4),
    updated_at: hoursAgo(1),
  },

  // PENDING transfer (awaiting pickup)
  {
    id: 'transfer-003',
    transfer_number: 'TR-2024-003',
    from_warehouse_id: WAREHOUSE_IDS.CENTRAL_SEMI,
    to_warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.BBQ_SAUCE,
        quantity_requested: 3000,      // 3L BBQ sauce
      },
      {
        stock_item_id: STOCK_ITEM_IDS.COLA,
        quantity_requested: 24,        // 1 case (24 cans)
      },
    ],
    status: TransferStatus.PENDING,
    requested_by: 'user-003',          // Food truck requested
    requested_at: hoursAgo(1),
    notes: 'Urgent: Running low on BBQ sauce and drinks.',
    created_at: hoursAgo(1),
    updated_at: hoursAgo(1),
  },

  // DRAFT transfer (being prepared)
  {
    id: 'transfer-004',
    transfer_number: 'TR-2024-004',
    from_warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    to_warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.BEEF,
        quantity_requested: 10000,     // 10kg beef
      },
      {
        stock_item_id: STOCK_ITEM_IDS.CHICKEN,
        quantity_requested: 5000,      // 5kg chicken
      },
      {
        stock_item_id: STOCK_ITEM_IDS.BUNS,
        quantity_requested: 100,       // 100 buns
      },
      {
        stock_item_id: STOCK_ITEM_IDS.CHEDDAR,
        quantity_requested: 3000,      // 3kg cheese
      },
      {
        stock_item_id: STOCK_ITEM_IDS.LETTUCE,
        quantity_requested: 15,        // 15 heads
      },
      {
        stock_item_id: STOCK_ITEM_IDS.TOMATOES,
        quantity_requested: 8000,      // 8kg
      },
    ],
    status: TransferStatus.DRAFT,
    requested_by: 'user-001',
    requested_at: formatDate(today),
    notes: 'Weekend preparation - large order for Saturday/Sunday.',
    created_at: formatDate(today),
    updated_at: formatDate(today),
  },

  // CANCELLED transfer (cancelled after being in transit)
  {
    id: 'transfer-005',
    transfer_number: 'TR-2024-005',
    from_warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    to_warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.MILK,
        quantity_requested: 10000,     // 10L milk
        quantity_picked: 10000,
      },
    ],
    status: TransferStatus.CANCELLED,
    requested_by: 'user-003',
    requested_at: daysAgo(3),
    picked_by: 'user-002',
    picked_at: daysAgo(3),
    shipped_by: 'user-002',
    shipped_at: daysAgo(3),
    notes: 'Cancelled: Vehicle breakdown. Milk returned to central warehouse to prevent spoilage.',
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
  },

  // COMPLETED transfer with no variance (perfect delivery)
  {
    id: 'transfer-006',
    transfer_number: 'TR-2024-006',
    from_warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    to_warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    items: [
      {
        stock_item_id: STOCK_ITEM_IDS.OIL,
        quantity_requested: 5000,      // 5L oil
        quantity_picked: 5000,
        quantity_received: 5000,       // Perfect delivery
      },
      {
        stock_item_id: STOCK_ITEM_IDS.COLA,
        quantity_requested: 48,        // 2 cases
        quantity_picked: 48,
        quantity_received: 48,
      },
    ],
    status: TransferStatus.COMPLETED,
    requested_by: 'user-001',
    requested_at: daysAgo(5),
    picked_by: 'user-002',
    picked_at: daysAgo(5),
    shipped_by: 'user-002',
    shipped_at: daysAgo(5),
    received_by: 'user-003',
    received_at: daysAgo(4),
    notes: 'Non-perishables delivery. No issues.',
    created_at: daysAgo(5),
    updated_at: daysAgo(4),
  },
];
