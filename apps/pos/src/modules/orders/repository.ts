import { Order } from '@/types/order';
import type { OrderCancellationResult } from '@/types/order-cancel';
import type { KitchenTicket } from '@/types/kitchen';
import type { Customer } from '@/types/crm';
import {
  OrderChannel,
  OrderClosureReasonCode,
  OrderStatus,
  LoyaltyPointReason,
  PaymentMethod,
  PaymentStatus,
} from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';
import {
  buildKitchenItemsFromOrderItems,
  buildKitchenTicketStatusPatch,
  calculateIncludedTaxFromGross,
  calculateOrderItemSubtotal,
  estimateKitchenTicketMinutes,
  haveOrderItemsChanged,
  isOrderEditableStatus,
} from '@/lib/orders/order-editing';
import {
  buildKitchenTicketRollbackPatch,
  buildRollbackLifecycleTimestampPatch,
  buildRollbackStatusNote,
  getRollbackReasonMessage,
  getRollbackResolution,
} from '@/lib/orders/status-rollback';
import { calculateOrderTotal, mergeOrderMetadata, readMetadataPaymentFee } from '@/lib/orders/financials';
import { crmRepository } from '@/modules/crm/repository';
import {
  calculatePointsFromOrder,
} from '@/modules/crm/utils/loyalty-calculator';
import { BONUS_POINTS } from '@/modules/crm/utils/loyalty-calculator';
import { sendSMS } from '@/lib/sms/sms-provider';
import {
  getOrderStatusSMS,
  isValidPhoneNumber,
  formatPhoneForSMS,
} from '@/lib/sms/templates';
import { supabase } from '@/lib/supabase/client';
import type { UpdateOrderInput } from '@/schemas/order';
import { normalizeOrderClosureReason } from '@meso/core';

const baseRepo = createRepository<Order>('orders');
const kitchenRepo = createRepository<KitchenTicket>('kitchen_tickets');
const ACTIVE_KITCHEN_TICKET_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
] as const;
type ActiveKitchenTicketStatus = (typeof ACTIVE_KITCHEN_TICKET_STATUSES)[number];

function usesSupabaseBackend(): boolean {
  return process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';
}

function isActiveKitchenTicketStatus(status: OrderStatus): status is ActiveKitchenTicketStatus {
  return ACTIVE_KITCHEN_TICKET_STATUSES.includes(status as ActiveKitchenTicketStatus);
}

function buildAppUrl(path: string): string {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3000';

  return new URL(path, origin).toString();
}

async function cancelOrderViaApi(
  id: string,
  payload: {
    closureReasonCode?: OrderClosureReasonCode | null;
    closureReason?: string;
    requestRefund?: boolean;
  }
): Promise<OrderCancellationResult> {
  const response = await fetch(buildAppUrl(`/api/v1/orders/${id}/cancel`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      closure_reason_code: payload.closureReasonCode,
      closure_reason: payload.closureReason,
      request_refund: payload.requestRefund,
      requested_from: 'pos',
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Order cancellation failed (${response.status})`);
  }

  return json.data as OrderCancellationResult;
}

async function updateStatusViaApi(
  id: string,
  payload: {
    status: OrderStatus;
    note?: string;
    closureReasonCode?: OrderClosureReasonCode | null;
    closureReason?: string | null;
  }
): Promise<Order> {
  const response = await fetch(buildAppUrl(`/api/v1/orders/${id}/status`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: payload.status,
      note: payload.note,
      closure_reason_code: payload.closureReasonCode,
      closure_reason: payload.closureReason,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Order status update failed (${response.status})`);
  }

  const updatedOrder = json.data as Order;
  const loyaltyPointsAwarded = payload.status === OrderStatus.DELIVERED
    ? (updatedOrder.loyalty_points_earned ?? undefined)
    : undefined;

  if (updatedOrder.customer_phone) {
    try {
      await sendOrderStatusSMS(updatedOrder, payload.status, loyaltyPointsAwarded);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
    }
  }

  return updatedOrder;
}

async function rollbackStatusViaApi(id: string, note?: string): Promise<Order> {
  const response = await fetch(buildAppUrl(`/api/v1/orders/${id}/status/rollback`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note ? { note } : {}),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Order status rollback failed (${response.status})`);
  }

  return json.data as Order;
}

async function updateOrderViaApi(
  id: string,
  input: UpdateOrderInput
): Promise<Order> {
  const response = await fetch(buildAppUrl(`/api/v1/orders/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Order update failed (${response.status})`);
  }

  return json.data as Order;
}

function hasOwnProperty<T extends object>(value: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function buildOrderItems(items: NonNullable<UpdateOrderInput['items']>): Order['items'] {
  return items.map((item) => ({
    id: item.id?.trim() || crypto.randomUUID(),
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    variant_name: item.variant_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    original_unit_price: item.original_unit_price,
    promotion_label: item.promotion_label,
    modifiers: item.modifiers ?? [],
    subtotal: calculateOrderItemSubtotal(item),
    notes: item.notes,
  }));
}

function buildEditRollbackNote(itemsChanged: boolean, notesChanged: boolean): string {
  const changedAreas: string[] = [];
  if (itemsChanged) changedAreas.push('składu');
  if (notesChanged) changedAreas.push('uwag');

  const reasonLabel =
    changedAreas.length > 0
      ? `Edycja ${changedAreas.join(' i ')} zamówienia. `
      : '';

  return `${reasonLabel}${buildRollbackStatusNote(OrderStatus.READY, OrderStatus.PREPARING)}`;
}

async function syncLocalKitchenTicket(order: Order, shouldSyncContents: boolean): Promise<void> {
  if (!shouldSyncContents) {
    return;
  }

  const ticketStatusPatch = buildKitchenTicketStatusPatch(order.status);
  if (!ticketStatusPatch) {
    return;
  }

  const tickets = await kitchenRepo.findMany(
    (ticket) =>
      ticket.order_id === order.id &&
      isActiveKitchenTicketStatus(ticket.status)
  );

  await Promise.all(
    tickets.map((ticket) =>
      kitchenRepo.update(ticket.id, {
        ...ticketStatusPatch,
        items: buildKitchenItemsFromOrderItems(
          order.items,
          Array.isArray(ticket.items) ? ticket.items : []
        ),
        notes: order.notes,
        estimated_minutes: estimateKitchenTicketMinutes(order.items),
      } as Partial<KitchenTicket>)
    )
  );
}

async function syncLocalCustomerPhone(existingOrder: Order, requestedPhone: string | undefined): Promise<void> {
  const normalizedPhone = requestedPhone?.trim();
  if (!existingOrder.customer_id || !normalizedPhone || normalizedPhone === existingOrder.customer_phone) {
    return;
  }

  const customer = await crmRepository.customers.findById(existingOrder.customer_id);
  if (!customer) {
    return;
  }

  await crmRepository.customers.update(existingOrder.customer_id, {
    phone: normalizedPhone,
  } as Partial<Customer>);
}

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
  note?: string,
  closureReasonCode?: OrderClosureReasonCode | null,
  closureReason?: string | null
): Promise<Order> {
  if (usesSupabaseBackend()) {
    return updateStatusViaApi(id, {
      status,
      note,
      closureReasonCode,
      closureReason,
    });
  }

  const order = await baseRepo.findById(id);
  if (!order) throw new Error(`Order with id ${id} not found`);

  const normalizedCancellation = status === OrderStatus.CANCELLED
    ? normalizeOrderClosureReason({
        closure_reason_code: closureReasonCode,
        closure_reason: closureReason,
        note,
      })
    : null;

  if (
    status === OrderStatus.CANCELLED &&
    !normalizedCancellation?.closure_reason &&
    !normalizedCancellation?.note
  ) {
    throw new Error('Powód anulowania jest wymagany');
  }

  const statusEntry = {
    status,
    timestamp: new Date().toISOString(),
    note: normalizedCancellation?.note ?? note,
  };

  const updatedOrder = await baseRepo.update(id, {
    status,
    status_history: [...order.status_history, statusEntry],
    ...(status === OrderStatus.CANCELLED
      ? {
          cancelled_at: statusEntry.timestamp,
          closure_reason_code: normalizedCancellation?.closure_reason_code,
          closure_reason: normalizedCancellation?.closure_reason,
        }
      : {}),
  } as Partial<Order>);

  if (status === OrderStatus.CANCELLED) {
    const { error } = await supabase
      .from('orders_kitchen_tickets')
      .update({
        status: OrderStatus.CANCELLED,
        completed_at: statusEntry.timestamp,
        updated_at: statusEntry.timestamp,
      })
      .eq('order_id', id)
      .in('status', [...ACTIVE_KITCHEN_TICKET_STATUSES]);

    if (error) {
      throw new Error(`[orders_kitchen_tickets] cancel failed: ${error.message}`);
    }
  }

  // ===== CRM INTEGRATION START =====
  let loyaltyPointsAwarded = status === OrderStatus.DELIVERED
    ? (updatedOrder.loyalty_points_earned ?? 0)
    : 0;

  // Local-storage mode still needs app-side loyalty awarding because there is
  // no database trigger there. Supabase environments award on the DB side.
  if (
    status === OrderStatus.DELIVERED &&
    order.customer_phone &&
    !usesSupabaseBackend()
  ) {
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

async function rollbackStatus(id: string, note?: string): Promise<Order> {
  if (usesSupabaseBackend()) {
    return rollbackStatusViaApi(id, note);
  }

  const order = await baseRepo.findById(id);
  if (!order) throw new Error(`Order with id ${id} not found`);

  const resolution = getRollbackResolution(order);
  if (!resolution.canRollback || !resolution.targetStatus) {
    throw new Error(getRollbackReasonMessage(resolution.reason ?? 'invalid_history'));
  }

  const nowIso = new Date().toISOString();
  const rollbackNote = note?.trim()
    ? `${buildRollbackStatusNote(order.status, resolution.targetStatus)}. ${note.trim()}`
    : buildRollbackStatusNote(order.status, resolution.targetStatus);

  const updatedOrder = await baseRepo.update(id, {
    status: resolution.targetStatus,
    status_history: [
      ...(Array.isArray(order.status_history) ? order.status_history : []),
      {
        status: resolution.targetStatus,
        timestamp: nowIso,
        note: rollbackNote,
      },
    ],
    ...buildRollbackLifecycleTimestampPatch(resolution.targetStatus),
  } as Partial<Order>);

  const ticketPatch = buildKitchenTicketRollbackPatch(resolution.targetStatus);
  if (ticketPatch) {
    const tickets = await kitchenRepo.findMany(
      (ticket) =>
        ticket.order_id === id &&
        isActiveKitchenTicketStatus(ticket.status)
    );

    await Promise.all(
      tickets.map((ticket) =>
        kitchenRepo.update(ticket.id, {
          ...ticketPatch,
          updated_at: nowIso,
        } as Partial<KitchenTicket>)
      )
    );
  }

  return updatedOrder;
}

async function updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
  if (usesSupabaseBackend()) {
    return updateOrderViaApi(id, input);
  }

  const existing = await baseRepo.findById(id);
  if (!existing) throw new Error(`Order with id ${id} not found`);

  if (!isOrderEditableStatus(existing.status)) {
    throw new Error('To zamówienie nie może już być edytowane');
  }

  const normalizedPhone = hasOwnProperty(input, 'customer_phone')
    ? input.customer_phone?.trim()
    : undefined;
  if (hasOwnProperty(input, 'customer_phone')) {
    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
      throw new Error('Niepoprawny numer telefonu');
    }
  }

  const nextItems = input.items ? buildOrderItems(input.items) : existing.items;
  const mergedMetadata = hasOwnProperty(input, 'metadata')
    ? mergeOrderMetadata(existing.metadata, input.metadata)
    : existing.metadata;
  const nextSubtotal = input.items
    ? nextItems.reduce((sum, item) => sum + item.subtotal, 0)
    : existing.subtotal;
  const nextDiscount = hasOwnProperty(input, 'discount')
    ? (input.discount ?? 0)
    : existing.discount;
  const nextDeliveryFee = hasOwnProperty(input, 'delivery_fee')
    ? input.delivery_fee
    : existing.delivery_fee;
  const nextTip = hasOwnProperty(input, 'tip')
    ? input.tip
    : existing.tip;
  const nextTax = input.items
    ? calculateIncludedTaxFromGross(nextSubtotal)
    : existing.tax;
  const nextTotal =
    input.items ||
    hasOwnProperty(input, 'discount') ||
    hasOwnProperty(input, 'delivery_fee') ||
    hasOwnProperty(input, 'tip') ||
    hasOwnProperty(input, 'metadata')
      ? calculateOrderTotal({
          subtotal: nextSubtotal,
          discount: nextDiscount,
          deliveryFee: nextDeliveryFee,
          paymentFee: readMetadataPaymentFee(mergedMetadata),
          tip: nextTip,
        })
      : existing.total;

  if (
    existing.payment_method === PaymentMethod.ONLINE &&
    existing.payment_status === PaymentStatus.PAID &&
    nextTotal !== existing.total
  ) {
    throw new Error('Nie można zmienić kwoty opłaconego zamówienia online');
  }

  const itemsChanged = input.items
    ? haveOrderItemsChanged(existing.items, nextItems)
    : false;
  const notesChanged = hasOwnProperty(input, 'notes')
    ? (existing.notes ?? '') !== (input.notes ?? '')
    : false;
  const shouldRollbackReady = existing.status === OrderStatus.READY && (itemsChanged || notesChanged);
  const shouldSyncKitchenContents = itemsChanged || notesChanged;
  const nextStatus = shouldRollbackReady ? OrderStatus.PREPARING : existing.status;

  const patch: Partial<Order> = {};

  if (input.items) {
    patch.items = nextItems;
    patch.subtotal = nextSubtotal;
    patch.tax = nextTax;
    patch.discount = nextDiscount;
    patch.delivery_fee = nextDeliveryFee;
    patch.tip = nextTip;
    patch.total = nextTotal;
  }

  if (hasOwnProperty(input, 'customer_name')) {
    patch.customer_name = input.customer_name;
  }

  if (hasOwnProperty(input, 'customer_phone')) {
    patch.customer_phone = normalizedPhone;
  }

  if (hasOwnProperty(input, 'notes')) {
    patch.notes = input.notes;
  }

  if (!input.items && hasOwnProperty(input, 'discount')) {
    patch.discount = nextDiscount;
  }

  if (!input.items && hasOwnProperty(input, 'delivery_fee')) {
    patch.delivery_fee = nextDeliveryFee;
  }

  if (!input.items && hasOwnProperty(input, 'tip')) {
    patch.tip = nextTip;
  }

  if (hasOwnProperty(input, 'metadata')) {
    patch.metadata = mergedMetadata;
  }

  if (
    !input.items &&
    (
      hasOwnProperty(input, 'discount') ||
      hasOwnProperty(input, 'delivery_fee') ||
      hasOwnProperty(input, 'tip') ||
      hasOwnProperty(input, 'metadata')
    )
  ) {
    patch.total = nextTotal;
  }

  if (shouldRollbackReady) {
    patch.status = nextStatus;
    patch.status_history = [
      ...(Array.isArray(existing.status_history) ? existing.status_history : []),
      {
        status: nextStatus,
        timestamp: new Date().toISOString(),
        note: buildEditRollbackNote(itemsChanged, notesChanged),
      },
    ];
    Object.assign(patch, buildRollbackLifecycleTimestampPatch(nextStatus));
  }

  const updatedOrder = await baseRepo.update(id, patch);
  await syncLocalKitchenTicket(updatedOrder, shouldSyncKitchenContents);
  await syncLocalCustomerPhone(existing, normalizedPhone);

  return updatedOrder;
}

async function cancelOrder(
  id: string,
  payload: {
    closureReasonCode?: OrderClosureReasonCode | null;
    closureReason?: string;
    requestRefund?: boolean;
  }
): Promise<OrderCancellationResult> {
  if (usesSupabaseBackend()) {
    return cancelOrderViaApi(id, payload);
  }

  const order = await updateStatus(
    id,
    OrderStatus.CANCELLED,
    payload.closureReason,
    payload.closureReasonCode,
    payload.closureReason
  );

  return {
    order,
    refund: {
      status: 'not_requested',
    },
  };
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

  // Prefer an explicit customer_id; fall back to phone for older orders.
  const customer = order.customer_id
    ? await crmRepository.customers.findById(order.customer_id)
    : await crmRepository.findCustomerByPhone(order.customer_phone);
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
    multiplier: 1,
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
  try {
    const { data, error } = await supabase.rpc('next_order_number', {
      p_channel: channel ?? OrderChannel.POS,
    });

    if (!error && typeof data === 'string' && data.length > 0) {
      return data;
    }
  } catch {
    // Fall through to local fallback.
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefixCode = channel === OrderChannel.DELIVERY_APP ? 'WEB' : 'ZAM';
  const prefix = `${prefixCode}-${today}-`;
  const allOrders = await baseRepo.findMany((order) =>
    order.order_number.startsWith(prefix)
  );
  const maxNum = allOrders.reduce((max, order) => {
    const numStr = order.order_number.replace(prefix, '');
    const parsed = parseInt(numStr, 10);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);

  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
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
  cancelOrder,
  updateOrder,
  rollbackStatus,
  updateStatus,
  getActiveOrders,
  getTodaysOrders,
  generateOrderNumber,
  awardLoyaltyPoints,
};
