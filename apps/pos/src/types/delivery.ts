import { BaseEntity } from './common';
import { DeliveryStatus, DeliverySource, VatRate } from './enums';

export interface Supplier extends BaseEntity {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface Delivery extends BaseEntity {
  delivery_number: string;
  warehouse_id: string;
  supplier_id: string | null;
  document_number: string | null;
  document_date: string | null;
  source: DeliverySource;
  source_image_url: string | null;
  notes: string | null;
  status: DeliveryStatus;
}

export interface DeliveryItem extends BaseEntity {
  delivery_id: string;
  stock_item_id: string;
  quantity_ordered: number | null;
  quantity_received: number;
  supplier_quantity_received?: number | null;
  supplier_unit?: string | null;
  unit_price_net: number | null;
  price_per_kg_net?: number | null;
  vat_rate: VatRate | null;
  expiry_date: string | null;
  ai_matched_name: string | null;
  ai_confidence: number | null;
  notes: string | null;
}

export interface DeliveryItemWithDetails extends DeliveryItem {
  stock_item_name: string;
  stock_item_sku: string;
  stock_item_unit: string;
}

export interface DeliveryWithDetails extends Delivery {
  supplier_name: string | null;
  warehouse_name: string;
  item_count: number;
  total_net: number | null;
}

export interface AIScanLineItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  unit_price_net: number | null;
  vat_rate: string | null;
  expiry_date: string | null;
}

export interface AIScanResult {
  document_number: string | null;
  document_date: string | null;
  supplier_name: string | null;
  items: AIScanLineItem[];
}

export interface AIScanMatchedItem extends AIScanLineItem {
  matched_stock_item_id: string | null;
  matched_stock_item_name: string | null;
  confidence: number;
}
