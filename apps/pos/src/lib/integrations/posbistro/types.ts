import type { BaseEntity } from '@/types/common';

export type PosbistroOrderIntegrationStatus =
  | 'pending'
  | 'sending'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'failed';

export interface PosbistroItemModifierPayload {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PosbistroItemPayload {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  modifiers: PosbistroItemModifierPayload[];
}

export interface PosbistroCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
}

export interface PosbistroAddressPayload {
  street: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface PosbistroCartPayload {
  orderId: string;
  orderNumber: string;
  fulfillmentType: 'delivery' | 'pickup';
  paid: boolean;
  total: number;
  notes?: string;
  confirmUrl: string;
  customer: PosbistroCustomerPayload;
  address?: PosbistroAddressPayload;
  items: PosbistroItemPayload[];
}

export interface PosbistroSubmitResponse {
  orderId?: string;
  id?: string;
  accepted?: boolean;
  [key: string]: unknown;
}

export interface PosbistroConfirmationPayload {
  status: 'accepted' | 'rejected';
  orderId?: string;
  reason?: string;
  message?: string;
  [key: string]: unknown;
}

export interface PosbistroOrderIntegration extends BaseEntity {
  order_id: string;
  status: PosbistroOrderIntegrationStatus;
  callback_token: string;
  posbistro_order_id: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}
