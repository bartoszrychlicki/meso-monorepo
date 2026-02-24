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

export enum ProductCategory {
  RAW_MATERIAL = 'raw_material',       // Surowce (mięso, warzywa)
  SEMI_FINISHED = 'semi_finished',     // Półprodukty (sosy, marynaty)
  FINISHED_GOOD = 'finished_good',     // Gotowe dania (burgery, zupy)
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
