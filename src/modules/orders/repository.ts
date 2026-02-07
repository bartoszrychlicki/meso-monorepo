import { Order } from '@/types/order';
import { OrderStatus } from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';
import { format } from 'date-fns';

const baseRepo = createRepository<Order>('orders');

async function findByStatus(status: OrderStatus): Promise<Order[]> {
  return baseRepo.findMany((order) => order.status === status);
}

async function findByDateRange(from: string, to: string): Promise<Order[]> {
  return baseRepo.findMany(
    (order) => order.created_at >= from && order.created_at <= to
  );
}

async function findByCustomer(name: string): Promise<Order[]> {
  const lower = name.toLowerCase();
  return baseRepo.findMany(
    (order) =>
      (order.customer_name?.toLowerCase().includes(lower) ?? false) ||
      (order.customer_phone?.includes(name) ?? false)
  );
}

async function updateStatus(
  id: string,
  status: OrderStatus,
  note?: string
): Promise<Order> {
  const order = await baseRepo.findById(id);
  if (!order) throw new Error(`Order with id ${id} not found`);

  const statusEntry = {
    status,
    timestamp: new Date().toISOString(),
    note,
  };

  return baseRepo.update(id, {
    status,
    status_history: [...order.status_history, statusEntry],
  } as Partial<Order>);
}

async function getActiveOrders(): Promise<Order[]> {
  const inactiveStatuses: OrderStatus[] = [
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];
  return baseRepo.findMany(
    (order) => !inactiveStatuses.includes(order.status)
  );
}

async function getTodaysOrders(): Promise<Order[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return baseRepo.findMany(
    (order) =>
      order.created_at >= todayStart.toISOString() &&
      order.created_at <= todayEnd.toISOString()
  );
}

async function generateOrderNumber(): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `ZAM-${today}-`;

  const allOrders = await baseRepo.findMany(
    (order) => order.order_number.startsWith(prefix)
  );

  const maxNum = allOrders.reduce((max, order) => {
    const numStr = order.order_number.replace(prefix, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}

export const ordersRepository = {
  // Delegate base repository methods
  findAll: baseRepo.findAll.bind(baseRepo),
  findById: baseRepo.findById.bind(baseRepo),
  findMany: baseRepo.findMany.bind(baseRepo),
  create: baseRepo.create.bind(baseRepo),
  update: baseRepo.update.bind(baseRepo),
  delete: baseRepo.delete.bind(baseRepo),
  count: baseRepo.count.bind(baseRepo),
  bulkCreate: baseRepo.bulkCreate?.bind(baseRepo),
  clear: baseRepo.clear?.bind(baseRepo),
  // Custom methods
  findByStatus,
  findByDateRange,
  findByCustomer,
  updateStatus,
  getActiveOrders,
  getTodaysOrders,
  generateOrderNumber,
};
