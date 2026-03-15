import { z } from 'zod';
import {
  ModifierAction,
  OrderClosureReasonCode,
  OrderChannel,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../enums';

export const OrderItemModifierSchema = z.object({
  modifier_id: z.string().min(1),
  name: z.string().min(1),
  price: z.number(),
  quantity: z.number().int().min(1).default(1),
  modifier_action: z.nativeEnum(ModifierAction).default(ModifierAction.ADD),
});

export const CreateOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Produkt jest wymagany'),
  variant_id: z.string().optional(),
  product_name: z.string().min(1),
  variant_name: z.string().optional(),
  quantity: z.number().int().min(1, 'Minimalna ilość to 1'),
  unit_price: z.number().min(0),
  original_unit_price: z.number().min(0).optional(),
  promotion_label: z.string().min(1).max(64).optional(),
  modifiers: z.array(OrderItemModifierSchema).default([]),
  notes: z.string().optional(),
});

const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // Contact info stored alongside address (used by delivery app for confirmation emails)
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  houseNumber: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  channel: z.nativeEnum(OrderChannel).default(OrderChannel.POS),
  source: z.nativeEnum(OrderSource).default(OrderSource.DINE_IN),
  location_id: z.string().min(1, 'Lokalizacja jest wymagana'),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  delivery_address: AddressSchema.optional(),
  items: z.array(CreateOrderItemSchema).min(1, 'Zamówienie musi zawierać produkty'),
  payment_method: z.nativeEnum(PaymentMethod).optional(),
  payment_status: z.nativeEnum(PaymentStatus).optional(),
  notes: z.string().optional(),
  discount: z.number().min(0).default(0),
  delivery_fee: z.number().min(0).optional(),
  tip: z.number().min(0).optional(),
  loyalty_points_used: z.number().int().min(0).optional(),
  promo_code: z.string().optional(),
  delivery_type: z.enum(['delivery', 'pickup']).optional(),
  scheduled_time: z.string().optional(),
  external_order_id: z.string().optional(),
  external_channel: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
  closure_reason_code: z.nativeEnum(OrderClosureReasonCode).nullable().optional(),
  closure_reason: z.string().optional(),
  changed_by: z.string().optional(),
  payment_status: z.nativeEnum(PaymentStatus).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>;
