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

export enum StorageZone {
  DRY = 'dry',
  COLD = 'cold',
  FROZEN = 'frozen',
  AMBIENT = 'ambient',
}

export enum BatchStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DEPLETED = 'depleted',
}

export enum StockMovementType {
  DELIVERY = 'delivery',
  TRANSFER = 'transfer',
  USAGE = 'usage',
  WASTE = 'waste',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
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
