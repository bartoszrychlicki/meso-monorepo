export type { BaseEntity, Address, PaginatedResult } from '@meso/core';

// POS-specific types (not in @meso/core)
import type { LocationType } from '@meso/core';
import type { BaseEntity, Address } from '@meso/core';

export interface Location extends BaseEntity {
  name: string;
  type: LocationType;
  address: Address;
  phone?: string;
  is_active: boolean;
}

export interface DeliveryConfig {
  id: string;
  location_id: string;
  delivery_radius_km: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_minutes: number;
  is_delivery_active: boolean;
  opening_time: string;
  closing_time: string;
  pickup_time_min: number;
  pickup_time_max: number;
  pickup_buffer_after_open: number;
  pickup_buffer_before_close: number;
  pay_on_pickup_enabled: boolean;
  pay_on_pickup_fee: number;
  pay_on_pickup_max_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReceiptConfig {
  id: string;
  location_id: string;
  receipt_header: string | null;
  receipt_footer: string | null;
  print_automatically: boolean | null;
  show_logo: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface KdsConfig {
  id: string;
  location_id: string;
  alert_time_minutes: number | null;
  auto_accept_orders: boolean | null;
  sound_enabled: boolean | null;
  display_priority: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptDefaults {
  header: string;
  footer: string;
  print_automatically: boolean;
  show_logo: boolean;
}

export interface KdsDefaults {
  alert_time_minutes: number;
  auto_accept_orders: boolean;
  sound_enabled: boolean;
  display_priority: boolean;
}

export interface LocationWithConfigs extends Location {
  delivery_config: DeliveryConfig | null;
  receipt_config: ReceiptConfig | null;
  kds_config: KdsConfig | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
