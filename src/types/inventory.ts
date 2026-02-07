import {
  BatchStatus,
  StockMovementType,
  StorageZone,
  WarehouseType,
  WarehouseSubtype,
  ProductCategory,
  TransferStatus,
  WastageCategory,
  StockCountType,
  StockCountStatus,
  PurchaseOrderStatus,
  QualityCheckResult,
  Allergen,
} from './enums';
import { BaseEntity } from './common';

// Storage Zone Configuration (Spec 5.1)
export interface StorageZoneConfig {
  zone: StorageZone;
  name: string;
  min_temp?: number;           // °C (np. 0 dla chłodni)
  max_temp?: number;           // °C (np. 4 dla chłodni)
}

export interface Warehouse extends BaseEntity {
  name: string;
  type: WarehouseType;
  subtype: WarehouseSubtype;   // NOWE (Spec 5.1): RAW_MATERIALS, SEMI_FINISHED, OUTLET_STORAGE
  location_id: string;
  zones: StorageZoneConfig[];  // NOWE (Spec 5.1): Strefy z temperaturami
  is_active: boolean;
}

export interface StockItem extends BaseEntity {
  name: string;
  sku: string;
  product_category: ProductCategory;  // NOWE (Spec 4.1): RAW_MATERIAL, SEMI_FINISHED, FINISHED_GOOD
  unit: string;                       // Jednostka magazynowa (g, ml, szt)
  purchase_unit: string;              // NOWE (Spec 4.2): Jednostka zakupu (karton, paleta, kg)
  conversion_rate: number;            // NOWE (Spec 4.2): Przelicznik (1 karton = 24 szt)

  // Stany magazynowe (Spec 5.2)
  quantity_physical: number;          // NOWE: Stan fizyczny (faktycznie w magazynie)
  quantity_available: number;         // NOWE: Dostępne = physical - reserved
  quantity_reserved: number;          // NOWE: Zarezerwowane dla zamówień
  quantity_in_transit: number;        // NOWE: W drodze (przesunięcia)

  min_quantity: number;
  max_quantity?: number;
  warehouse_id: string;
  storage_zone: StorageZone;
  cost_per_unit: number;
  supplier_id?: string;
  allergens: Allergen[];              // NOWE (Spec 4.2, 4.3): Alergeny UE
  is_active: boolean;
}

export interface Batch extends BaseEntity {
  stock_item_id: string;
  warehouse_id: string;               // NOWE: W którym magazynie jest partia
  batch_number: string;
  production_date: string;            // NOWE (Spec 5.3): Data produkcji
  quantity_initial: number;           // ZMIANA: Początkowa ilość (było: quantity)
  quantity_current: number;           // ZMIANA: Aktualna ilość (było: remaining_quantity)
  cost_per_unit: number;
  received_date: string;
  expiry_date?: string;
  status: BatchStatus;                // ZMIANA: FRESH, WARNING, CRITICAL, EXPIRED, DEPLETED
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

// ==================== STOCK TRANSFER (Spec 5.6) ====================

export interface StockTransfer extends BaseEntity {
  transfer_number: string;         // Auto-generowany (TR-2024-001)
  from_warehouse_id: string;       // Z magazynu (KC)
  to_warehouse_id: string;         // Do magazynu (Punkt)
  items: TransferItem[];
  status: TransferStatus;
  requested_by: string;            // Kto zlecił
  requested_at: string;
  picked_by?: string;              // Kto skompletował (KC)
  picked_at?: string;
  shipped_by?: string;             // Kto wysłał (KC)
  shipped_at?: string;
  received_by?: string;            // Kto odebrał (Punkt)
  received_at?: string;
  notes?: string;
}

export interface TransferItem {
  stock_item_id: string;
  quantity_requested: number;
  quantity_picked?: number;        // Faktycznie skompletowana
  quantity_received?: number;      // Faktycznie odebrana
  batch_id?: string;               // Która partia (FEFO)
}

// ==================== WASTAGE (Spec 5.7) ====================

export interface WastageRecord extends BaseEntity {
  stock_item_id: string;
  warehouse_id: string;
  batch_id?: string;
  category: WastageCategory;
  quantity: number;
  cost_value: number;              // Auto: quantity × cost_per_unit
  reason: string;
  reported_by: string;
  photo_url?: string;              // Zdjęcie straty (opcjonalnie)
  approved_by?: string;
  approved_at?: string;
}

// ==================== STOCK COUNT (Spec 5.8) ====================

export interface StockCount extends BaseEntity {
  count_number: string;            // Auto: INV-2024-001
  warehouse_id: string;
  type: StockCountType;
  status: StockCountStatus;
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  counted_by: string[];            // Lista osób liczących
  approved_by?: string;
  approved_at?: string;
  items: StockCountItem[];
  notes?: string;
}

export interface StockCountItem {
  stock_item_id: string;
  batch_id?: string;
  quantity_system: number;         // Stan systemowy
  quantity_counted?: number;       // Stan policzony
  variance?: number;               // Różnica (counted - system)
  variance_cost?: number;          // Wartość różnicy
  notes?: string;
}

// ==================== PURCHASE ORDER (Spec 5.10 - MAG-003) ====================

export interface PurchaseOrder extends BaseEntity {
  po_number: string;               // Auto: PO-2024-001
  supplier_id: string;
  warehouse_id: string;            // Do którego magazynu
  status: PurchaseOrderStatus;
  order_date: string;
  expected_delivery_date: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  stock_item_id: string;
  quantity_ordered: number;
  quantity_received: number;       // Faktycznie odebrana (aktualizowane przy odbiorze)
  unit_price: number;
  total_price: number;             // Auto: quantity × unit_price
}

// ==================== DELIVERY RECEIPT (Spec 5.10 - MAG-004) ====================

export interface DeliveryReceipt extends BaseEntity {
  po_id: string;                   // Powiązane PO
  warehouse_id: string;
  delivery_date: string;
  received_by: string;
  items: DeliveryReceiptItem[];
  quality_check_passed: boolean;
  quality_notes?: string;
  attachments?: string[];          // Zdjęcia, dokumenty
}

export interface DeliveryReceiptItem {
  po_item_id: string;
  stock_item_id: string;
  quantity_received: number;
  batch_number: string;            // Auto-generowany lub ze skanera
  production_date: string;
  expiry_date?: string;
  cost_per_unit: number;
  quality_check: QualityCheckResult;
  quality_notes?: string;
}

// ==================== HACCP LOG (Spec 5.10 - MAG-008) ====================

export interface HACCPLog extends BaseEntity {
  warehouse_id: string;
  storage_zone: StorageZone;
  temperature: number;             // °C
  measured_at: string;
  measured_by: string;
  is_within_range: boolean;        // Auto: temp >= min_temp && temp <= max_temp
  notes?: string;
  corrective_action?: string;      // Jeśli out of range
}

// ==================== AUTO ORDER RULE (Spec 5.10 - MAG-012) ====================

export interface AutoOrderRule extends BaseEntity {
  stock_item_id: string;
  warehouse_id: string;
  reorder_point: number;           // Punkt zamówienia
  reorder_quantity: number;        // Ile zamówić
  supplier_id: string;
  is_active: boolean;
  lead_time_days: number;          // Czas dostawy (dni)
}
