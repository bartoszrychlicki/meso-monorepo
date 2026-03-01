import { Order } from '@/types/order';
import { OrderStatus, OrderChannel, LoyaltyPointReason } from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';
import { format } from 'date-fns';
import { crmRepository } from '@/modules/crm/repository';
import {
  calculatePointsFromOrder,
  checkTierUpgrade,
  getTierMultiplier,
} from '@/modules/crm/utils/loyalty-calculator';
import { BONUS_POINTS } from '@/modules/crm/utils/loyalty-calculator';
import { sendSMS } from '@/lib/sms/sms-provider';
import {
  getOrderStatusSMS,
  isValidPhoneNumber,
  formatPhoneForSMS,
  smsTemplates,
} from '@/lib/sms/templates';

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

  const updatedOrder = await baseRepo.update(id, {
    status,
    status_history: [...order.status_history, statusEntry],
  } as Partial<Order>);

  // ===== CRM INTEGRATION START =====
  let loyaltyPointsAwarded = 0;

  // Award loyalty points when order is delivered/completed
  if (status === OrderStatus.DELIVERED && order.customer_phone) {
    try {
      loyaltyPointsAwarded = await awardLoyaltyPoints(updatedOrder);
    } catch (error) {
      console.error('Failed to award loyalty points:', error);
      // Don't fail the order status update if loyalty fails
    }
  }

  // Send SMS notification for order status changes
  if (order.customer_phone) {
    try {
      await sendOrderStatusSMS(updatedOrder, status, loyaltyPointsAwarded || undefined);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Don't fail the order status update if SMS fails
    }
  }
  // ===== CRM INTEGRATION END =====

  return updatedOrder;
}

/**
 * Award loyalty points for a completed order
 *
 * This function:
 * 1. Finds customer by phone number
 * 2. Calculates points based on order total and tier multiplier
 * 3. Adds bonus points for first order
 * 4. Creates loyalty transaction
 * 5. Updates customer order statistics
 * 6. Checks for tier upgrade
 *
 * @returns Number of points awarded
 */
async function awardLoyaltyPoints(order: Order): Promise<number> {
  if (!order.customer_phone) return 0;

  // Find customer by phone
  const customer = await crmRepository.findCustomerByPhone(order.customer_phone);
  if (!customer) {
    console.log(`No customer found for phone: ${order.customer_phone}`);
    return 0;
  }

  // Update order with customer_id if not already set
  if (!order.customer_id) {
    await baseRepo.update(order.id, { customer_id: customer.id } as Partial<Order>);
  }

  // Calculate points
  const basePoints = calculatePointsFromOrder(order.total, customer.loyalty_tier);
  const isFirstOrder = customer.order_history.total_orders === 0;
  const bonusPoints = isFirstOrder ? BONUS_POINTS.FIRST_ORDER : 0;
  const totalPoints = basePoints + bonusPoints;

  // Add loyalty transaction
  await crmRepository.addLoyaltyTransaction({
    customer_id: customer.id,
    amount: totalPoints,
    reason: isFirstOrder
      ? LoyaltyPointReason.FIRST_ORDER
      : LoyaltyPointReason.PURCHASE,
    description: isFirstOrder
      ? `Pierwsze zamówienie + ${basePoints} pkt za zakup (Zamówienie #${order.order_number})`
      : `Zakup na kwotę ${order.total.toFixed(2)} PLN (Zamówienie #${order.order_number})`,
    related_order_id: order.id,
    multiplier: getTierMultiplier(customer.loyalty_tier),
    created_by: null,
    updated_at: new Date().toISOString(),
  });

  // Update order statistics
  const newTotalOrders = customer.order_history.total_orders + 1;
  const newTotalSpent = customer.order_history.total_spent + order.total;

  await crmRepository.updateOrderStats(customer.id, {
    total_orders: newTotalOrders,
    total_spent: newTotalSpent,
    average_order_value: newTotalSpent / newTotalOrders,
    last_order_date: new Date().toISOString(),
    first_order_date: customer.order_history.first_order_date || new Date().toISOString(),
  });

  // Check tier upgrade
  const upgrade = checkTierUpgrade(
    customer.loyalty_points,
    customer.loyalty_points + totalPoints
  );

  if (upgrade?.upgraded) {
    console.log(
      `🎉 Customer ${customer.first_name} ${customer.last_name} upgraded from ${upgrade.oldTier} to ${upgrade.newTier}!`
    );
    // TODO Phase 4 (SMS): Send congratulations SMS
  }

  console.log(
    `✅ Awarded ${totalPoints} loyalty points to ${customer.first_name} ${customer.last_name} (Order #${order.order_number})`
  );

  return totalPoints;
}

/**
 * Send SMS notification for order status change
 *
 * Only sends SMS if:
 * - Customer has a valid phone number
 * - Customer has given marketing consent (for non-critical updates)
 * - Status change warrants a notification
 */
async function sendOrderStatusSMS(
  order: Order,
  status: OrderStatus,
  loyaltyPoints?: number
): Promise<void> {
  if (!order.customer_phone) return;

  // Validate phone number
  if (!isValidPhoneNumber(order.customer_phone)) {
    console.warn(`Invalid phone number for SMS: ${order.customer_phone}`);
    return;
  }

  // Get customer to check marketing consent
  const customer = await crmRepository.findCustomerByPhone(order.customer_phone);

  // For critical statuses (accepted, ready, out_for_delivery), always send
  // For other statuses, only send if customer has marketing consent
  const criticalStatuses = [
    OrderStatus.ACCEPTED,
    OrderStatus.READY,
    OrderStatus.OUT_FOR_DELIVERY,
  ];
  const isCritical = criticalStatuses.includes(status);

  if (!isCritical && (!customer || !customer.marketing_consent)) {
    console.log(`Skipping SMS notification (no marketing consent) for order #${order.order_number}`);
    return;
  }

  // Get SMS message template
  const message = getOrderStatusSMS(order, status, loyaltyPoints);
  if (!message) {
    return; // No SMS template for this status
  }

  // Format phone number
  const formattedPhone = formatPhoneForSMS(order.customer_phone);

  // Send SMS
  const result = await sendSMS(formattedPhone, message, 'MESOpos');

  if (result.success) {
    console.log(`📱 SMS sent to ${formattedPhone} for order #${order.order_number} (${status})`);
  } else {
    console.error(`❌ Failed to send SMS: ${result.error}`);
  }
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

async function generateOrderNumber(channel?: OrderChannel): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefixCode = channel === OrderChannel.DELIVERY_APP ? 'WEB' : 'ZAM';
  const prefix = `${prefixCode}-${today}-`;

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
  awardLoyaltyPoints,
};
