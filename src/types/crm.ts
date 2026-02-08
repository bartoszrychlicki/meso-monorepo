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
  created_at: Date;
}

/**
 * Customer Preferences
 * Stores customer preferences for personalization
 */
export interface CustomerPreferences {
  favorite_products?: string[];      // Product IDs
  dietary_restrictions?: string[];   // Allergen codes
  default_payment_method?: string;
}

/**
 * Customer Order History Statistics
 * Denormalized stats for quick access
 */
export interface CustomerOrderHistory {
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_date: Date | null;
  first_order_date: Date | null;
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
  birth_date: Date | null;           // For birthday bonuses

  // Registration
  registration_date: Date;
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
  rfm_last_calculated: Date | null;

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
