/**
 * SMS Message Templates (Phase 4 - MVP Sprint 4)
 *
 * Templates for SMS notifications sent to customers.
 */

import { Order } from '@/types/order';
import { OrderStatus } from '@/types/enums';

/**
 * SMS Templates for order status updates
 */
export const smsTemplates = {
  orderAccepted: (order: Order): string => {
    return `MESOpos: Twoje zamówienie #${order.order_number} zostało przyjęte. Szacowany czas przygotowania: ${order.estimated_ready_at || '30 min'}.`;
  },

  orderReady: (order: Order): string => {
    return `MESOpos: Twoje zamówienie #${order.order_number} jest gotowe do odbioru!`;
  },

  orderOutForDelivery: (order: Order): string => {
    return `MESOpos: Twoje zamówienie #${order.order_number} jest w drodze. Spodziewaj się dostawy wkrótce!`;
  },

  orderDelivered: (order: Order, loyaltyPoints?: number): string => {
    if (loyaltyPoints && loyaltyPoints > 0) {
      return `MESOpos: Dziękujemy za zamówienie #${order.order_number}! Zdobyłeś ${loyaltyPoints} pkt lojalnościowych. 🎉`;
    }
    return `MESOpos: Dziękujemy za zamówienie #${order.order_number}! Zapraszamy ponownie.`;
  },

  orderCancelled: (order: Order): string => {
    return `MESOpos: Twoje zamówienie #${order.order_number} zostało anulowane. Przepraszamy za utrudnienia.`;
  },

  tierUpgrade: (tierName: string, newPoints: number): string => {
    return `MESOpos: Gratulacje! 🎉 Awansowałeś na poziom ${tierName}! Masz teraz ${newPoints} pkt lojalnościowych.`;
  },

  birthdayBonus: (customerName: string, bonusPoints: number): string => {
    return `MESOpos: Wszystkiego najlepszego ${customerName}! 🎂 Otrzymujesz ${bonusPoints} pkt lojalnościowych w prezencie!`;
  },
};

/**
 * Get SMS template for order status change
 */
export function getOrderStatusSMS(
  order: Order,
  status: OrderStatus,
  loyaltyPoints?: number
): string | null {
  switch (status) {
    case OrderStatus.ACCEPTED:
      return smsTemplates.orderAccepted(order);

    case OrderStatus.READY:
      return smsTemplates.orderReady(order);

    case OrderStatus.OUT_FOR_DELIVERY:
      return smsTemplates.orderOutForDelivery(order);

    case OrderStatus.DELIVERED:
      return smsTemplates.orderDelivered(order, loyaltyPoints);

    case OrderStatus.CANCELLED:
      return smsTemplates.orderCancelled(order);

    default:
      return null; // No SMS for other statuses
  }
}

/**
 * Validate phone number for SMS
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Polish phone number: +48 followed by 9 digits
  // International format: + followed by country code and number
  const polishRegex = /^\+48[0-9]{9}$/;
  const internationalRegex = /^\+[0-9]{10,15}$/;

  return polishRegex.test(cleaned) || internationalRegex.test(cleaned);
}

/**
 * Format phone number for SMS sending
 */
export function formatPhoneForSMS(phone: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');

  // Add + prefix if missing
  if (!cleaned.startsWith('+')) {
    // Assume Polish number if no country code
    if (cleaned.startsWith('48')) {
      cleaned = `+${cleaned}`;
    } else {
      cleaned = `+48${cleaned}`;
    }
  }

  return cleaned;
}
