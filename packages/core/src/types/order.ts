import {
  ModifierAction,
  OrderClosureReasonCode,
  OrderChannel,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../enums';
import { Address, BaseEntity } from './common';

export interface OrderItemModifier {
  modifier_id: string;
  name: string;
  price: number;
  quantity: number;
  modifier_action: ModifierAction;
}

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  promotion_label?: string;
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
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: Address;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  delivery_fee?: number;
  tip?: number;
  total: number;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  status_history: OrderStatusEntry[];
  assigned_to?: string;
  estimated_ready_at?: string;
  external_order_id?: string;
  external_channel?: string;
  metadata?: Record<string, unknown>;
  promo_code?: string;
  promo_discount?: number;
  scheduled_time?: string;
  delivery_type?: 'delivery' | 'pickup';
  loyalty_points_earned?: number;
  loyalty_points_used?: number;
  closure_reason_code?: OrderClosureReasonCode | null;
  closure_reason?: string | null;
  // Lifecycle timestamps
  paid_at?: string;
  confirmed_at?: string;
  preparing_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
}
