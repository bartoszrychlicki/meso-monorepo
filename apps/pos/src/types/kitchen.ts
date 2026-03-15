import { OrderStatus } from './enums';
import { BaseEntity } from './common';
import type { Order } from './order';

export interface KitchenItem {
  id: string;
  order_item_id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  modifiers: string[];
  notes?: string;
  is_done: boolean;
}

export interface KitchenTicket extends BaseEntity {
  order_id: string;
  order_number: string;
  location_id: string;
  status: OrderStatus;
  linked_order?: Pick<
    Order,
    'id' | 'status' | 'channel' | 'payment_method' | 'payment_status' | 'total' | 'metadata'
  >;
  items: KitchenItem[];
  priority: number;
  delivery_type?: 'delivery' | 'pickup';
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;
  estimated_minutes: number;
  notes?: string;
}
