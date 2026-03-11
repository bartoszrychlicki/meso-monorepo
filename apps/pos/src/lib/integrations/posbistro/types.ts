import type { BaseEntity } from '@/types/common';

export type PosbistroOrderIntegrationStatus =
  | 'pending'
  | 'sending'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'failed';

export type PosbistroMenuMappingType = 'product' | 'variant' | 'modifier';
export type PosbistroProductType = 'SIMPLE' | 'DELIVERY' | 'PACKAGE' | 'SET' | 'PIZZA';

export interface PosbistroPaymentInfoPayload {
  paymentType: 'CASH' | 'CARD' | 'ONLINE';
  paid: boolean;
  provider?: string;
  transactionId?: string;
  tip?: number;
}

export interface PosbistroProductAddonPayload {
  id: string;
  addonType: 'ADDED' | 'INCLUDED';
  addonId?: string;
  addonSku?: number;
  name?: string;
  quantity: number;
  price: number;
  originalPrice: number;
}

export interface PosbistroProductPayload {
  id: string;
  productType: 'SIMPLE' | 'DELIVERY' | 'PACKAGE' | 'SET' | 'PIZZA';
  variationId?: string;
  variationSku?: number;
  variationName?: string;
  name?: string;
  quantity: number;
  price: number;
  originalPrice: number;
  promotionName?: string;
  comment?: string;
  keepIncludedAddons?: boolean;
  addons?: PosbistroProductAddonPayload[];
}

export interface PosbistroClientPayload {
  clientId?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  taxNumber?: string;
}

export interface PosbistroDeliveryAddressPayload {
  street: string;
  streetNumber?: string;
  apartmentNumber?: string;
  floorNumber?: string;
  postCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface PosbistroCartPayload {
  id: string;
  orderType: 'ORDER' | 'RESERVATION';
  source: 'DELIVERY';
  paymentInfo: PosbistroPaymentInfoPayload;
  deliveryType: 'DELIVERY' | 'TAKEAWAY' | 'PREORDER' | 'RESERVATION';
  requestedDate: string | null;
  price: number;
  originalPrice: number;
  promotionName?: string;
  siteUrl?: string;
  confirmUrl: string;
  comment?: string;
  numberOfPeople?: number;
  client: PosbistroClientPayload;
  deliveryAddress?: PosbistroDeliveryAddressPayload;
  products: PosbistroProductPayload[];
}

export interface PosbistroSubmitResponse {
  status?: boolean;
  code?: string;
  message?: string | string[];
  data?: Record<string, unknown>;
  orderId?: string;
  id?: string;
  accepted?: boolean;
  [key: string]: unknown;
}

export interface PosbistroConfirmationPayload {
  status: 'accepted' | 'rejected' | 'ACCEPTED' | 'REJECTED';
  orderId?: string;
  reason?: string;
  message?: string;
  comment?: string;
  deliveryTime?: string | number | null;
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

export interface PosbistroMenuMapping extends BaseEntity {
  mapping_type: PosbistroMenuMappingType;
  meso_product_id: string | null;
  meso_variant_id: string | null;
  meso_modifier_id: string | null;
  posbistro_product_type: PosbistroProductType | null;
  posbistro_variation_id: string | null;
  posbistro_variation_sku: number | null;
  posbistro_addon_id: string | null;
  posbistro_addon_sku: number | null;
  posbistro_name: string | null;
  notes: string | null;
  is_active: boolean;
}
