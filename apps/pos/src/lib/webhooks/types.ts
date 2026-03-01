import { BaseEntity } from '@/types/common';

export type WebhookEvent = 'order.status_changed' | 'order.cancelled';

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

export interface OrderStatusChangedData {
  pos_order_id: string;
  external_order_id?: string;
  status: string;
  previous_status: string;
  note?: string;
  estimated_ready_at?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  status_code?: number;
  error?: string;
  delivery_id: string;
}
