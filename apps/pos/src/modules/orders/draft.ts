import { calculateOrderItemSubtotal } from '@/lib/orders/order-editing';
import { calculateOrderTotal, readMetadataPaymentFee } from '@/lib/orders/financials';
import { getProductPromotionPricing } from '@/modules/menu/utils/pricing';
import type { UpdateOrderItemInput } from '@/schemas/order';
import type { Product, ProductVariant } from '@/types/menu';
import type { Order, OrderItem, OrderItemModifier } from '@/types/order';

export interface EditableOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  promotion_label?: string;
  modifiers: OrderItemModifier[];
  modifiers_price: number;
  total_price: number;
  notes?: string;
}

export function calculateModifiersPrice(modifiers: OrderItemModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.price * modifier.quantity, 0);
}

export function calculateEditableItemTotal(item: Pick<EditableOrderItem, 'quantity' | 'unit_price' | 'modifiers'>): number {
  return calculateOrderItemSubtotal({
    quantity: item.quantity,
    unit_price: item.unit_price,
    modifiers: item.modifiers,
  });
}

export function orderItemToEditableItem(item: OrderItem): EditableOrderItem {
  const modifiers = item.modifiers ?? [];
  return {
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    variant_id: item.variant_id,
    variant_name: item.variant_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    original_unit_price: item.original_unit_price,
    promotion_label: item.promotion_label,
    modifiers,
    modifiers_price: calculateModifiersPrice(modifiers),
    total_price: item.subtotal,
    notes: item.notes,
  };
}

export function createEditableItem(
  product: Product,
  variant?: ProductVariant,
  quantity = 1,
  modifiers: OrderItemModifier[] = []
): EditableOrderItem {
  const promotionPricing = getProductPromotionPricing(product);
  const basePrice = promotionPricing.currentPrice;
  const originalBasePrice = promotionPricing.originalPrice;
  const unitPrice = basePrice + (variant?.price ?? 0);
  const originalUnitPrice =
    originalBasePrice != null ? originalBasePrice + (variant?.price ?? 0) : undefined;
  const modifiersPrice = calculateModifiersPrice(modifiers);

  return {
    id: crypto.randomUUID(),
    product_id: product.id,
    product_name: product.name,
    variant_id: variant?.id,
    variant_name: variant?.name,
    quantity,
    unit_price: unitPrice,
    original_unit_price: originalUnitPrice,
    promotion_label: promotionPricing.isPromotionActive
      ? promotionPricing.promoLabel
      : undefined,
    modifiers,
    modifiers_price: modifiersPrice,
    total_price: quantity * (unitPrice + modifiersPrice),
  };
}

export function editableItemToUpdateItemInput(item: EditableOrderItem): UpdateOrderItemInput {
  return {
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    variant_id: item.variant_id,
    variant_name: item.variant_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    original_unit_price: item.original_unit_price,
    promotion_label: item.promotion_label,
    modifiers: item.modifiers,
    notes: item.notes,
  };
}

export function calculateDraftSubtotal(items: EditableOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.total_price, 0);
}

export function calculateDraftTotal(order: Pick<Order, 'discount' | 'delivery_fee' | 'tip' | 'metadata'>, items: EditableOrderItem[]): number {
  return calculateOrderTotal({
    subtotal: calculateDraftSubtotal(items),
    discount: order.discount,
    deliveryFee: order.delivery_fee,
    paymentFee: readMetadataPaymentFee(order.metadata),
    tip: order.tip,
  });
}
