import {
  BatchStatus,
  StockMovementType,
  StorageZone,
  WarehouseType,
} from './enums';
import { BaseEntity } from './common';

export interface Warehouse extends BaseEntity {
  name: string;
  type: WarehouseType;
  location_id: string;
  is_active: boolean;
}

export interface StockItem extends BaseEntity {
  name: string;
  sku: string;
  unit: string;
  current_quantity: number;
  min_quantity: number;
  max_quantity?: number;
  warehouse_id: string;
  storage_zone: StorageZone;
  cost_per_unit: number;
  supplier_id?: string;
  is_active: boolean;
}

export interface Batch extends BaseEntity {
  stock_item_id: string;
  batch_number: string;
  quantity: number;
  remaining_quantity: number;
  cost_per_unit: number;
  received_date: string;
  expiry_date?: string;
  status: BatchStatus;
}

export interface StockMovement extends BaseEntity {
  stock_item_id: string;
  batch_id?: string;
  type: StockMovementType;
  quantity: number;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  reason?: string;
  performed_by: string;
}

export interface Supplier extends BaseEntity {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}
