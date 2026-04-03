/**
 * CRM Module Types
 *
 * Defines types for customer management, loyalty program, and CRM features.
 */

import { LoyaltyTier, RFMSegment, CustomerSource, LoyaltyPointReason } from './enums';
import { BaseEntity } from './common';

/**
 * Customer Address
 * Represents a delivery/billing address for a customer
 */
export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;                     // 'Home', 'Office', etc.
  street: string;
  building_number: string;
  apartment_number: string | null;
  postal_code: string;
  city: string;
  is_default: boolean;
  delivery_instructions: string | null;
  created_at: string;
}

/**
 * Customer Preferences
 * Stores customer preferences for personalization
 */
export interface CustomerPreferences {
  favorite_products?: string[];      // Product IDs
  dietary_restrictions?: string[];   // Allergen codes
  default_payment_method?: string;
  ui_language?: 'pl' | 'en';
}

/**
 * Top Ordered Product
 * Product frequently ordered by a customer (computed from order history)
 */
export interface TopOrderedProduct {
  product_id: string;
  product_name: string;
  order_count: number;
  image_url?: string;
}

/**
 * Customer Order History Statistics
 * Denormalized stats for quick access
 */
export interface CustomerOrderHistory {
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_date: string | null;
  first_order_date: string | null;
  top_ordered_products?: TopOrderedProduct[];
}

/**
 * Customer
 * Main customer entity with loyalty program integration
 */
export interface Customer extends BaseEntity {

  // Personal data
  first_name: string;
  last_name: string;
  email: string | null;              // Optional for walk-in customers
  phone: string;                     // Required (alternative key)
  birth_date: string | null;         // For birthday bonuses

  // Registration
  registration_date: string;
  source: CustomerSource;
  marketing_consent: boolean;        // GDPR compliance

  // Loyalty (MVP)
  loyalty_points: number;            // Current balance
  loyalty_tier: LoyaltyTier;

  // RFM (Phase 2)
  rfm_segment: RFMSegment | null;
  rfm_recency_score: number | null;  // 1-5
  rfm_frequency_score: number | null;
  rfm_monetary_score: number | null;
  rfm_last_calculated: string | null;

  // Delivery addresses
  addresses: CustomerAddress[];

  // Preferences
  preferences: CustomerPreferences;

  // Statistics (denormalized)
  order_history: CustomerOrderHistory;

  // Metadata
  notes: string | null;
  is_active: boolean;
}

/**
 * Loyalty Transaction
 * Records all loyalty points movements
 */
export interface LoyaltyTransaction extends BaseEntity {
  customer_id: string;

  amount: number;                    // Can be negative (redemption)
  reason: LoyaltyPointReason;
  description: string | null;

  related_order_id: string | null;
  multiplier: number;                // Tier multiplier at transaction time

  created_by: string | null;         // User ID for manual adjustments
}

/**
 * Coupon Discount Type
 */
export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_delivery' | 'free_item';

/**
 * Coupon Trigger Scenario
 */
export type CouponTriggerScenario = 'welcome' | 'birthday' | 're_engagement' | 'long_inactivity' | 'manual';

/**
 * Coupon
 * Phase 2 - Promotional coupons and discounts
 */
export interface Coupon extends BaseEntity {
  code: string;                      // Unique (e.g., 'WELCOME15')
  name: string;
  description: string | null;

  discount_type: CouponDiscountType;
  discount_value: number;
  free_item_id: string | null;

  max_usage: number | null;
  usage_count: number;

  valid_from: Date;
  valid_until: Date;

  applicable_products: string[] | null;
  minimum_order_value: number | null;
  customer_segment: string | null;   // 'silver+', 'champions'

  trigger_scenario: CouponTriggerScenario;

  is_active: boolean;
  created_by: string;
}

export type RewardType = 'free_delivery' | 'discount' | 'free_product';
export type PromotionalCodeDiscountType = 'percent' | 'fixed' | 'free_item' | 'free_delivery';
export type PromotionalCodeTriggerScenario =
  | 'manual'
  | 'birthday'
  | 'win_back'
  | 'new_customer'
  | 'referral'
  | 'tier_upgrade'
  | 'seasonal';
export type PromotionalCodeChannel = 'delivery' | 'pickup';

export interface LoyaltyRewardDefinition extends BaseEntity {
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: RewardType;
  discount_value: number | null;
  free_product_id: string | null;
  icon: string | null;
  min_tier: LoyaltyTier;
  sort_order: number;
  is_active: boolean;
}

export interface PromotionalCode extends BaseEntity {
  code: string | null;
  name: string;
  description: string | null;
  discount_type: PromotionalCodeDiscountType;
  discount_value: number | null;
  free_item_id: string | null;
  min_order_amount: number | null;
  first_order_only: boolean;
  required_loyalty_tier: LoyaltyTier | null;
  trigger_scenario: PromotionalCodeTriggerScenario;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  channels: PromotionalCodeChannel[];
  applicable_product_ids: string[] | null;
  created_by: string | null;
}

/**
 * Coupon Usage
 * Phase 2 - Tracks coupon redemptions
 */
export interface CouponUsage {
  id: string;
  coupon_id: string;
  customer_id: string;
  order_id: string;
  discount_applied: number;
  used_at: Date;
}
