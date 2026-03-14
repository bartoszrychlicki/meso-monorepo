import { BaseEntity } from '@/types/common';

export type WebhookEvent =
  | 'order.created'
  | 'order.status_changed'
  | 'order.cancelled';

export interface WebhookSubscription extends BaseEntity {
  url: string;
  events: WebhookEvent[];
  secret: string;
  is_active: boolean;
  description?: string;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookOrderItemData {
  name: string;
  quantity: number;
  unit_price?: number;
  notes?: string;
}

export interface OrderStatusChangedData {
  pos_order_id: string;
  external_order_id?: string;
  order_number?: string;
  status: string;
  previous_status: string;
  channel?: string;
  order_type?: string;
  source?: string;
  items?: WebhookOrderItemData[];
  total?: number;
  currency?: string;
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  estimated_ready_at?: string;
  created_at?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  status_code?: number;
  error?: string;
  delivery_id: string;
}
