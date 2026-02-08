import { isSeeded, markAsSeeded, clearSeedFlag } from './check-seeded';
import { locations } from './data/locations';
import { users } from './data/users';
import { categories } from './data/categories';
import { products } from './data/products';
import { employees, workTimes } from './data/employees';
import { orders } from './data/orders';
import { warehouses, stockItems } from './data/inventory';
import { batches } from './data/batches';
import { stockTransfers } from './data/transfers';
import { wastageRecords } from './data/wastage';
import { stockCounts } from './data/stock-counts';
import { kitchenTickets } from './data/kitchen-tickets';

const STORAGE_PREFIX = 'mesopos_';

function seedCollection(name: string, data: unknown[]): void {
  if (data.length === 0) return;
  localStorage.setItem(`${STORAGE_PREFIX}${name}`, JSON.stringify(data));
}

export function seedAll(): void {
  if (typeof window === 'undefined') return;
  if (isSeeded()) return;

  // Seed in dependency order
  seedCollection('locations', locations);
  seedCollection('users', users);
  seedCollection('categories', categories);
  seedCollection('products', products);
  seedCollection('employees', employees);
  seedCollection('work_times', workTimes);
  seedCollection('orders', orders);
  seedCollection('kitchen_tickets', kitchenTickets);
  seedCollection('warehouses', warehouses);
  seedCollection('stock_items', stockItems);
  seedCollection('batches', batches);
  seedCollection('stock_transfers', stockTransfers);
  seedCollection('wastage_records', wastageRecords);
  seedCollection('stock_counts', stockCounts);

  markAsSeeded();
  console.log('[MESOpos] Seed data loaded successfully');
}

export function resetAll(): void {
  if (typeof window === 'undefined') return;

  // Clear all mesopos_ keys
  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(STORAGE_PREFIX)
  );
  keys.forEach((key) => localStorage.removeItem(key));

  clearSeedFlag();

  // Re-seed
  seedAll();
  console.log('[MESOpos] Data reset and re-seeded');
}
