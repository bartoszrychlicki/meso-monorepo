/**
 * Table name mapping: Delivery (old) → POS (new)
 *
 * After migration, Delivery uses POS's Supabase database.
 * POS uses prefixed table names (menu_, crm_, orders_, users_).
 *
 * This file documents the mapping and exports constants
 * for use in queries.
 */

// === TABLE NAMES ===
export const Tables = {
  // Menu
  categories: 'menu_categories',
  products: 'menu_products',
  modifierGroups: 'menu_modifier_groups',

  // CRM / Customers
  customers: 'crm_customers',
  customerAddresses: 'crm_customer_addresses',
  loyaltyTransactions: 'crm_loyalty_transactions',
  loyaltyRewards: 'crm_loyalty_rewards',
  promotions: 'crm_promotions',
  customerCoupons: 'crm_customer_coupons',

  // Orders
  orders: 'orders_orders',
  orderItems: 'orders_order_items',
  deliveryConfig: 'orders_delivery_config',
  kitchenTickets: 'orders_kitchen_tickets',

  // Users / Locations
  locations: 'users_locations',

  // Delivery-specific (no prefix, kept as-is)
  appConfig: 'app_config',
  promoBanners: 'promo_banners',
} as const

/**
 * Column mapping notes:
 *
 * crm_customers:
 *   - Delivery had `name` (single field) → POS has `first_name` + `last_name`
 *   - `loyalty_points` → same name
 *   - `is_anonymous` → REMOVED (no anonymous customers)
 *   - `referral_code`, `referred_by`, `lifetime_points` → same (delivery extension)
 *
 * users_locations:
 *   - Delivery had flat: name, address, city, postal_code, phone
 *   - POS has: name, address (JSONB: {street, city, postal_code, country, lat, lng}), phone
 *   - Delivery had: delivery_fee, delivery_radius_km, min_order_amount, is_ordering_enabled
 *   - POS has these in separate `orders_delivery_config` table
 *
 * menu_products:
 *   - Delivery had separate `product_variants` table
 *   - POS stores variants as JSONB in `menu_products.variants`
 *   - POS also has `modifier_groups` as JSONB
 *   - `sku` is required in POS (NOT NULL)
 *
 * crm_promotions (replaces promo_codes):
 *   - `code` → same
 *   - `discount_type` → same (percent, fixed, free_item, free_delivery)
 *   - `discount_value` → same
 *   - `min_order_amount` → same
 *   - `first_order_only` → same
 *   - `max_uses` → same
 *   - `current_uses` → same
 *   - `is_active` → same
 *   - NEW: `channels`, `trigger_scenario`, `required_loyalty_tier`
 *
 * crm_customer_coupons (replaces loyalty_coupons):
 *   - `customer_id` → same
 *   - `code` → same
 *   - `coupon_type` → same (free_delivery, discount, free_product)
 *   - `discount_value` → same
 *   - `status` → same (active, used, expired)
 *   - `points_spent` → same
 *   - `used_at` → same
 *   - `order_id` → same
 *   - `activated_at` → was created_at
 *   - NEW: `promotion_id`, `source`, `expires_at`
 *
 * crm_loyalty_transactions (replaces loyalty_history):
 *   - `customer_id` → same
 *   - `amount` → was `points`
 *   - `reason` → was `type` (earned, spent, bonus, referral, registration)
 *   - `description` → was `description`
 *   - `related_order_id` → was `order_id`
 *   - NEW: `multiplier`, `created_by`
 */
