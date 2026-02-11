// Order-related enums
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderChannel {
  POS = 'pos',
  ONLINE = 'online',
  PHONE = 'phone',
  DELIVERY_APP = 'delivery_app',
}

export enum OrderSource {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
}

// Payment-related enums
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BLIK = 'blik',
  ONLINE = 'online',
  VOUCHER = 'voucher',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

// Product-related enums
export enum ProductType {
  SINGLE = 'single',
  WITH_VARIANTS = 'with_variants',
  COMBO = 'combo',
}

// User/Employee enums
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CHEF = 'chef',
  CASHIER = 'cashier',
  DELIVERY = 'delivery',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
}

export enum WorkTimeStatus {
  CLOCKED_IN = 'clocked_in',
  ON_BREAK = 'on_break',
  CLOCKED_OUT = 'clocked_out',
}

// Location enums
export enum LocationType {
  CENTRAL_KITCHEN = 'central_kitchen',
  FOOD_TRUCK = 'food_truck',
  KIOSK = 'kiosk',
  RESTAURANT = 'restaurant',
}

// Inventory enums
export enum WarehouseType {
  CENTRAL = 'central',        // Kuchnia Centralna (KC)
  POINT = 'point',            // Punkt sprzedaży (Food Truck, Kiosk)
  STORAGE = 'storage',        // Magazyn składowy
}

export enum WarehouseSubtype {
  RAW_MATERIALS = 'raw_materials',     // Magazyn surowców (KC)
  SEMI_FINISHED = 'semi_finished',     // Magazyn półproduktów (KC)
  OUTLET_STORAGE = 'outlet_storage',   // Magazyn punktu sprzedaży
}

export enum StorageZone {
  DRY = 'dry',
  COLD = 'cold',
  FROZEN = 'frozen',
  AMBIENT = 'ambient',
}

export enum BatchStatus {
  FRESH = 'fresh',           // > 50% okresu przydatności
  WARNING = 'warning',       // 25-50% okresu przydatności
  CRITICAL = 'critical',     // < 25% okresu przydatności
  EXPIRED = 'expired',       // Przekroczona data przydatności
  DEPLETED = 'depleted',     // Wyczerpana (quantity = 0)
}

export enum ProductCategory {
  RAW_MATERIAL = 'raw_material',       // Surowce (mięso, warzywa)
  SEMI_FINISHED = 'semi_finished',     // Półprodukty (sosy, marynaty)
  FINISHED_GOOD = 'finished_good',     // Gotowe dania (burgery, zupy)
}

export enum StockMovementType {
  DELIVERY = 'delivery',
  TRANSFER = 'transfer',
  USAGE = 'usage',
  WASTE = 'waste',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
}

// Stock Transfer enums (Spec 5.6)
export enum TransferStatus {
  DRAFT = 'draft',                     // Zlecenie utworzone
  PENDING = 'pending',                 // Oczekuje na kompletację
  IN_TRANSIT = 'in_transit',           // Wysłane, w drodze
  COMPLETED = 'completed',             // Odebrane w punkcie
  CANCELLED = 'cancelled',             // Anulowane
}

// Wastage enums (Spec 5.7)
export enum WastageCategory {
  EXPIRY = 'expiry',                   // Przeterminowanie
  DAMAGE = 'damage',                   // Uszkodzenie
  SPOILAGE = 'spoilage',               // Zepsucie
  HUMAN_ERROR = 'human_error',         // Błąd ludzki
  THEFT = 'theft',                     // Kradzież
  PRODUCTION = 'production',           // Produkcyjne
  PRODUCTION_ERROR = 'production_error', // Błąd produkcji
  OTHER = 'other',                     // Inne
}

// Stock Count enums (Spec 5.8)
export enum StockCountType {
  DAILY = 'daily',                     // Dzienna (rotacyjna)
  WEEKLY = 'weekly',                   // Tygodniowa
  MONTHLY = 'monthly',                 // Miesięczna
  AD_HOC = 'ad_hoc',                   // Ad-hoc (na żądanie)
}

export enum StockCountStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
}

// Purchase Order enums (Spec 5.10 - MAG-003)
export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT_TO_SUPPLIER = 'sent_to_supplier',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

// Quality Check enums (Spec 5.10 - MAG-004)
export enum QualityCheckResult {
  PASS = 'pass',
  FAIL = 'fail',
  PARTIAL = 'partial',
}

// Valuation Method enums (Spec 5.9)
export enum ValuationMethod {
  FIFO = 'fifo',                       // First In First Out
  WEIGHTED_AVERAGE = 'weighted_average', // Średnia ważona
  UNIT_COST = 'unit_cost',             // Cena jednostkowa
}

// EU 14 allergens
export enum Allergen {
  GLUTEN = 'gluten',
  CRUSTACEANS = 'crustaceans',
  EGGS = 'eggs',
  FISH = 'fish',
  PEANUTS = 'peanuts',
  SOYBEANS = 'soybeans',
  MILK = 'milk',
  NUTS = 'nuts',
  CELERY = 'celery',
  MUSTARD = 'mustard',
  SESAME = 'sesame',
  SULPHITES = 'sulphites',
  LUPIN = 'lupin',
  MOLLUSCS = 'molluscs',
}

export enum ModifierType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

// Variant types (spec 3.3)
export enum VariantType {
  SIZE = 'size',           // Rozmiar: Mały, Średni, Duży
  VERSION = 'version',     // Wersja: Standard, Menu, Premium
  WEIGHT = 'weight',       // Waga: 200g, 300g, 500g
}

// Modifier action types (spec 3.4)
export enum ModifierAction {
  ADD = 'add',                     // Dodatek (+ Ser, + Bekon)
  REMOVE = 'remove',               // Usunięcie (- Cebula, - Sos)
  SUBSTITUTE = 'substitute',       // Zamiana (Zamień bułkę na bezglutenową)
  PREPARATION = 'preparation',     // Wariant przygotowania (Dobrze wysmażony)
}

// Sales channels for multi-channel pricing (spec 3.2)
export enum SalesChannel {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  EAT_IN = 'eat_in',
}

// Promotion types (spec 3.5)
export enum PromotionType {
  PERCENTAGE = 'percentage',       // Procentowa (-20%)
  AMOUNT = 'amount',               // Kwotowa (-10 zł)
  BUY_X_GET_Y = 'buy_x_get_y',    // 2 za 1
  BUNDLE = 'bundle',               // Zestaw (Burger + frytki + napój)
  HAPPY_HOUR = 'happy_hour',       // Happy Hour (czasowe zniżki)
}

// CRM and Loyalty enums
export enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
}

export enum RFMSegment {
  CHAMPIONS = 'champions',
  LOYAL_CUSTOMERS = 'loyal_customers',
  POTENTIAL_LOYALISTS = 'potential_loyalists',
  NEW_CUSTOMERS = 'new_customers',
  AT_RISK = 'at_risk',
  LOST = 'lost',
  UNCATEGORIZED = 'uncategorized',
}

export enum CouponDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_DELIVERY = 'free_delivery',
  FREE_ITEM = 'free_item',
}

export enum LoyaltyPointReason {
  PURCHASE = 'purchase',
  FIRST_ORDER = 'first_order',
  BIRTHDAY = 'birthday',
  REFERRAL = 'referral',
  REDEMPTION = 'redemption',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
}

export enum CustomerSource {
  MOBILE_APP = 'mobile_app',
  POS_TERMINAL = 'pos_terminal',
  WEBSITE = 'website',
  MANUAL_IMPORT = 'manual_import',
}
