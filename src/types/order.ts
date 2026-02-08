import {
  OrderChannel,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './enums';
import { Address, BaseEntity } from './common';

export interface OrderItemModifier {
  modifier_id: string;
  modifier_group_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  modifiers: OrderItemModifier[];
  subtotal: number;
  notes?: string;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  timestamp: string;
  changed_by?: string;
  note?: string;
}

export interface Order extends BaseEntity {
  order_number: string;
  status: OrderStatus;
  channel: OrderChannel;
  source: OrderSource;
  location_id: string;
  customer_id?: string;           // CRM customer ID for loyalty points
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: Address;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  status_history: OrderStatusEntry[];
  assigned_to?: string;
  estimated_ready_at?: string;
}
