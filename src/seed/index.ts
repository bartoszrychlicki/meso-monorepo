import { isSeeded, markAsSeeded, clearSeedFlag } from './check-seeded';
import { locations } from './data/locations';
import { users } from './data/users';
import { categories } from './data/categories';
import { products } from './data/products';
import { employees, workTimes } from './data/employees';
import { orders } from './data/orders';
import { stockItems, warehouses, warehouseStock, stockItemComponents } from './data/inventory';
import { kitchenTickets } from './data/kitchen-tickets';
import { customers } from './data/customers';
import { recipes } from './data/recipes';

const STORAGE_PREFIX = 'mesopos_';

function seedCollection(name: string, data: unknown[]): void {
  if (data.length === 0) return;
  localStorage.setItem(`${STORAGE_PREFIX}${name}`, JSON.stringify(data));
}

export function seedAll(): void {
  if (typeof window === 'undefined') return;
  // Skip localStorage seeding when using Supabase (data is in PostgreSQL)
  if (process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase') return;
  if (isSeeded()) return;

  // Clear stale seed data before re-seeding (version bump)
  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(STORAGE_PREFIX)
  );
  keys.forEach((key) => localStorage.removeItem(key));

  // Seed in dependency order
  seedCollection('locations', locations);
  seedCollection('users', users);
  seedCollection('categories', categories);
  seedCollection('products', products);
  seedCollection('employees', employees);
  seedCollection('work_times', workTimes);
  seedCollection('customers', customers);
  seedCollection('recipes', recipes);
  seedCollection('orders', orders);
  seedCollection('kitchen_tickets', kitchenTickets);
  seedCollection('warehouses', warehouses);
  seedCollection('stock_items', stockItems);
  seedCollection('warehouse_stock', warehouseStock);
  seedCollection('stock_item_components', stockItemComponents);

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
