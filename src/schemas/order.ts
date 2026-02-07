import { z } from 'zod';
import {
  OrderChannel,
  OrderSource,
  OrderStatus,
  PaymentMethod,
} from '@/types/enums';

const OrderItemModifierSchema = z.object({
  modifier_id: z.string().min(1),
  modifier_group_id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
});

const CreateOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Produkt jest wymagany'),
  variant_id: z.string().optional(),
  product_name: z.string().min(1),
  variant_name: z.string().optional(),
  quantity: z.number().int().min(1, 'Minimalna ilość to 1'),
  unit_price: z.number().min(0),
  modifiers: z.array(OrderItemModifierSchema).default([]),
  notes: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  channel: z.nativeEnum(OrderChannel).default(OrderChannel.POS),
  source: z.nativeEnum(OrderSource).default(OrderSource.DINE_IN),
  location_id: z.string().min(1, 'Lokalizacja jest wymagana'),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  items: z.array(CreateOrderItemSchema).min(1, 'Zamówienie musi zawierać produkty'),
  payment_method: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().optional(),
  discount: z.number().min(0).default(0),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
  changed_by: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
