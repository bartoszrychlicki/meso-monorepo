import type { SupabaseClient } from '@supabase/supabase-js';
import { BONUS_POINTS, calculatePointsFromOrder, calculateTierFromPoints } from '@/modules/crm/utils/loyalty-calculator';
import { LoyaltyPointReason, LoyaltyTier } from '@/types/enums';
import type { Order } from '@/types/order';

type OrderHistory = {
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_date: string | null;
  first_order_date: string | null;
};

type LoyaltyCustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  loyalty_points: number | null;
  lifetime_points: number | null;
  loyalty_tier: LoyaltyTier | null;
  referred_by: string | null;
  order_history: Partial<OrderHistory> | null;
};

type TransactionRow = {
  amount: number | null;
};

function normalizeOrderHistory(orderHistory: Partial<OrderHistory> | null | undefined): OrderHistory {
  return {
    total_orders: orderHistory?.total_orders ?? 0,
    total_spent: orderHistory?.total_spent ?? 0,
    average_order_value: orderHistory?.average_order_value ?? 0,
    last_order_date: orderHistory?.last_order_date ?? null,
    first_order_date: orderHistory?.first_order_date ?? null,
  };
}

async function findCustomerForOrder(
  serviceClient: SupabaseClient,
  order: Pick<Order, 'customer_id' | 'customer_phone'>
): Promise<LoyaltyCustomerRow | null> {
  const customerColumns = 'id, first_name, last_name, phone, loyalty_points, lifetime_points, loyalty_tier, referred_by, order_history';

  if (order.customer_id) {
    const { data: customerById } = await serviceClient
      .from('crm_customers')
      .select(customerColumns)
      .eq('id', order.customer_id)
      .maybeSingle();

    if (customerById) {
      return customerById as LoyaltyCustomerRow;
    }
  }

  if (!order.customer_phone) {
    return null;
  }

  const { data: customerByPhone } = await serviceClient
    .from('crm_customers')
    .select(customerColumns)
    .eq('phone', order.customer_phone)
    .maybeSingle();

  return (customerByPhone as LoyaltyCustomerRow | null) ?? null;
}

export async function estimateOrderLoyaltyPoints(
  serviceClient: SupabaseClient,
  customerId: string | undefined,
  orderTotal: number
): Promise<number> {
  const basePoints = calculatePointsFromOrder(orderTotal);
  if (!customerId) {
    return basePoints;
  }

  const { data: customer } = await serviceClient
    .from('crm_customers')
    .select('order_history')
    .eq('id', customerId)
    .maybeSingle();

  const orderHistory = normalizeOrderHistory((customer?.order_history as Partial<OrderHistory> | null | undefined) ?? null);
  return basePoints + (orderHistory.total_orders === 0 ? BONUS_POINTS.FIRST_ORDER : 0);
}

async function awardReferralBonus(
  serviceClient: SupabaseClient,
  referrerId: string,
  referredCustomer: LoyaltyCustomerRow,
  order: Order
): Promise<void> {
  const { data: existingReferral } = await serviceClient
    .from('crm_loyalty_transactions')
    .select('id')
    .eq('customer_id', referrerId)
    .eq('related_order_id', order.id)
    .eq('reason', LoyaltyPointReason.REFERRAL)
    .maybeSingle();

  if (existingReferral) {
    return;
  }

  const { data: referrer } = await serviceClient
    .from('crm_customers')
    .select('id, loyalty_points, lifetime_points')
    .eq('id', referrerId)
    .maybeSingle();

  if (!referrer) {
    return;
  }

  const nextLoyaltyPoints = (referrer.loyalty_points ?? 0) + BONUS_POINTS.REFERRAL;
  const nextLifetimePoints = (referrer.lifetime_points ?? 0) + BONUS_POINTS.REFERRAL;

  await serviceClient
    .from('crm_customers')
    .update({
      loyalty_points: nextLoyaltyPoints,
      lifetime_points: nextLifetimePoints,
      loyalty_tier: calculateTierFromPoints(nextLifetimePoints),
    })
    .eq('id', referrerId);

  const referredCustomerName = [referredCustomer.first_name, referredCustomer.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || referredCustomer.phone || order.customer_phone || 'klient';

  await serviceClient
    .from('crm_loyalty_transactions')
    .insert({
      customer_id: referrerId,
      amount: BONUS_POINTS.REFERRAL,
      reason: LoyaltyPointReason.REFERRAL,
      description: `Polecenie klienta: ${referredCustomerName}`,
      related_order_id: order.id,
      multiplier: 1,
      created_by: null,
    });
}

export async function awardOrderLoyaltyPoints(
  serviceClient: SupabaseClient,
  order: Order
): Promise<number> {
  const { data: existingTransactions } = await serviceClient
    .from('crm_loyalty_transactions')
    .select('amount, reason')
    .eq('related_order_id', order.id)
    .in('reason', [LoyaltyPointReason.PURCHASE, LoyaltyPointReason.FIRST_ORDER]);

  const customer = await findCustomerForOrder(serviceClient, order);
  const existingOrderTransactions = (existingTransactions as Array<TransactionRow & { reason: LoyaltyPointReason }> | null) ?? [];
  const existingPoints = existingOrderTransactions.reduce(
    (sum, transaction) => sum + (transaction.amount ?? 0),
    0
  );

  if (existingOrderTransactions.length > 0) {
    if (customer) {
      await serviceClient
        .from('orders_orders')
        .update({
          customer_id: customer.id,
          loyalty_points_earned: existingPoints,
        })
        .eq('id', order.id);

      const wasFirstOrder = existingOrderTransactions.some(
        (transaction) => transaction.reason === LoyaltyPointReason.FIRST_ORDER
      );

      if (wasFirstOrder && customer.referred_by) {
        await awardReferralBonus(serviceClient, customer.referred_by, customer, order);
      }
    }

    return existingPoints;
  }

  if (!customer) {
    return 0;
  }

  const orderHistory = normalizeOrderHistory(customer.order_history);
  const isFirstOrder = orderHistory.total_orders === 0;
  const basePoints = calculatePointsFromOrder(order.total, customer.loyalty_tier ?? LoyaltyTier.BRONZE);
  const bonusPoints = isFirstOrder ? BONUS_POINTS.FIRST_ORDER : 0;
  const totalPoints = order.loyalty_points_earned && order.loyalty_points_earned > 0
    ? order.loyalty_points_earned
    : basePoints + bonusPoints;
  const now = new Date().toISOString();

  const nextLoyaltyPoints = (customer.loyalty_points ?? 0) + totalPoints;
  const nextLifetimePoints = (customer.lifetime_points ?? 0) + totalPoints;
  const nextTier = calculateTierFromPoints(nextLifetimePoints);
  const nextOrderTotal = orderHistory.total_orders + 1;
  const nextTotalSpent = orderHistory.total_spent + order.total;

  await serviceClient
    .from('crm_customers')
    .update({
      loyalty_points: nextLoyaltyPoints,
      lifetime_points: nextLifetimePoints,
      loyalty_tier: nextTier,
      order_history: {
        total_orders: nextOrderTotal,
        total_spent: nextTotalSpent,
        average_order_value: nextTotalSpent / nextOrderTotal,
        last_order_date: now,
        first_order_date: orderHistory.first_order_date || now,
      },
    })
    .eq('id', customer.id);

  await serviceClient
    .from('crm_loyalty_transactions')
    .insert({
      customer_id: customer.id,
      amount: totalPoints,
      reason: isFirstOrder ? LoyaltyPointReason.FIRST_ORDER : LoyaltyPointReason.PURCHASE,
      description: isFirstOrder
        ? `Pierwsze zamówienie + ${basePoints} pkt za zakup (Zamówienie #${order.order_number})`
        : `Zakup na kwotę ${order.total.toFixed(2)} PLN (Zamówienie #${order.order_number})`,
      related_order_id: order.id,
      multiplier: 1,
      created_by: null,
    });

  await serviceClient
    .from('orders_orders')
    .update({
      customer_id: customer.id,
      loyalty_points_earned: totalPoints,
    })
    .eq('id', order.id);

  if (isFirstOrder && customer.referred_by) {
    await awardReferralBonus(serviceClient, customer.referred_by, customer, order);
  }

  return totalPoints;
}
