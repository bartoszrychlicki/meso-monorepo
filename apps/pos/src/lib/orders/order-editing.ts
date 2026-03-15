import { formatKitchenModifierLabel, normalizeKitchenModifierLabels } from '@/modules/kitchen/formatting';
import type { KitchenItem } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import type { OrderItem, OrderItemModifier } from '@/types/order';

export const EDITABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

const EDITABLE_ORDER_STATUS_SET = new Set(EDITABLE_ORDER_STATUSES);
const INCLUDED_VAT_RATE = 0.08;

function sortModifiers(modifiers: OrderItemModifier[]): OrderItemModifier[] {
  return [...modifiers].sort((left, right) => {
    const leftKey = `${left.modifier_id}:${left.name}:${left.modifier_action}`;
    const rightKey = `${right.modifier_id}:${right.name}:${right.modifier_action}`;
    return leftKey.localeCompare(rightKey);
  });
}

function normalizeModifiers(modifiers: OrderItemModifier[] | undefined) {
  return sortModifiers(modifiers ?? []).map((modifier) => ({
    modifier_id: modifier.modifier_id,
    name: modifier.name,
    price: modifier.price,
    quantity: modifier.quantity,
    modifier_action: modifier.modifier_action,
  }));
}

function getKitchenModifierLabels(item: Pick<OrderItem, 'modifiers'>): string[] {
  return normalizeKitchenModifierLabels(
    (item.modifiers ?? []).map((modifier) => formatKitchenModifierLabel(modifier))
  );
}

function buildOrderItemComparablePayload(item: OrderItem) {
  return {
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id ?? null,
    product_name: item.product_name,
    variant_name: item.variant_name ?? null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    original_unit_price: item.original_unit_price ?? null,
    promotion_label: item.promotion_label ?? null,
    subtotal: item.subtotal,
    notes: item.notes ?? '',
    modifiers: normalizeModifiers(item.modifiers),
  };
}

function buildKitchenComparablePayload(item: Pick<OrderItem, 'product_name' | 'variant_name' | 'quantity' | 'modifiers' | 'notes'>) {
  return {
    product_name: item.product_name,
    variant_name: item.variant_name ?? null,
    quantity: item.quantity,
    modifiers: getKitchenModifierLabels(item),
    notes: item.notes ?? '',
  };
}

export function isOrderEditableStatus(status: OrderStatus): boolean {
  return EDITABLE_ORDER_STATUS_SET.has(status);
}

export function calculateOrderItemSubtotal(item: {
  quantity: number;
  unit_price: number;
  modifiers?: Array<{ price: number; quantity: number }>;
}): number {
  const modifiersTotal = (item.modifiers ?? []).reduce(
    (sum, modifier) => sum + modifier.price * modifier.quantity,
    0
  );

  return Math.round(item.quantity * (item.unit_price + modifiersTotal) * 100) / 100;
}

export function calculateIncludedTaxFromGross(grossAmount: number): number {
  if (grossAmount <= 0) return 0;
  return Math.round((grossAmount - grossAmount / (1 + INCLUDED_VAT_RATE)) * 100) / 100;
}

export function haveOrderItemsChanged(currentItems: OrderItem[], nextItems: OrderItem[]): boolean {
  if (currentItems.length !== nextItems.length) {
    return true;
  }

  return currentItems.some((item, index) => {
    const nextItem = nextItems[index];
    return JSON.stringify(buildOrderItemComparablePayload(item)) !== JSON.stringify(buildOrderItemComparablePayload(nextItem));
  });
}

export function buildKitchenItemsFromOrderItems(
  orderItems: OrderItem[],
  previousKitchenItems: KitchenItem[] = []
): KitchenItem[] {
  const previousByOrderItemId = new Map(
    previousKitchenItems.map((item) => [item.order_item_id, item])
  );

  return orderItems.map((item) => {
    const previousItem = previousByOrderItemId.get(item.id);
    const previousComparable = previousItem
      ? {
          product_name: previousItem.product_name,
          variant_name: previousItem.variant_name ?? null,
          quantity: previousItem.quantity,
          modifiers: [...previousItem.modifiers],
          notes: previousItem.notes ?? '',
        }
      : null;
    const nextComparable = buildKitchenComparablePayload(item);
    const canPreserveCompletion =
      previousComparable &&
      JSON.stringify(previousComparable) === JSON.stringify(nextComparable);

    return {
      id: previousItem?.id ?? crypto.randomUUID(),
      order_item_id: item.id,
      product_name: item.product_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      modifiers: nextComparable.modifiers,
      notes: item.notes,
      is_done: canPreserveCompletion && previousItem ? previousItem.is_done : false,
    };
  });
}

export function estimateKitchenTicketMinutes(orderItems: Array<{ quantity: number }>): number {
  return Math.max(5, orderItems.length * 4);
}

export function buildKitchenTicketStatusPatch(status: OrderStatus):
  | { status: OrderStatus; started_at?: null; completed_at?: null }
  | null {
  switch (status) {
    case OrderStatus.PENDING:
    case OrderStatus.CONFIRMED:
    case OrderStatus.ACCEPTED:
      return {
        status: OrderStatus.PENDING,
        started_at: null,
        completed_at: null,
      };
    case OrderStatus.PREPARING:
      return {
        status: OrderStatus.PREPARING,
        completed_at: null,
      };
    case OrderStatus.READY:
      return {
        status: OrderStatus.READY,
      };
    default:
      return null;
  }
}
