/**
 * CRM Module Validation Schemas
 *
 * Zod schemas for customer and loyalty data validation.
 */

import { z } from 'zod';
import { LoyaltyTier, CustomerSource, LoyaltyPointReason } from '@/types/enums';

const RewardTypeSchema = z.enum(['free_delivery', 'discount', 'free_product']);
const PromotionalCodeDiscountTypeSchema = z.enum(['percent', 'fixed', 'free_item', 'free_delivery']);
const PromotionalCodeChannelSchema = z.enum(['delivery', 'pickup']);

/**
 * Customer Address Schema
 */
export const CustomerAddressSchema = z.object({
  label: z.string()
    .min(1, 'Etykieta wymagana')
    .max(50, 'Etykieta za długa')
    .describe('Address label (e.g., Home, Office)'),

  street: z.string()
    .min(1, 'Ulica wymagana')
    .max(100, 'Nazwa ulicy za długa')
    .describe('Street name'),

  building_number: z.string()
    .min(1, 'Numer budynku wymagany')
    .max(10, 'Numer budynku za długi')
    .describe('Building number'),

  apartment_number: z.string()
    .max(10, 'Numer mieszkania za długi')
    .optional()
    .describe('Apartment number (optional)'),

  postal_code: z.string()
    .regex(/^\d{2}-\d{3}$/, 'Format kodu pocztowego: 00-000')
    .describe('Postal code in format XX-XXX'),

  city: z.string()
    .min(1, 'Miasto wymagane')
    .max(100, 'Nazwa miasta za długa')
    .describe('City name'),

  is_default: z.boolean()
    .default(false)
    .describe('Whether this is the default delivery address'),

  delivery_instructions: z.string()
    .max(500, 'Instrukcje za długie')
    .optional()
    .describe('Special delivery instructions'),
});

/**
 * Customer Preferences Schema
 */
export const CustomerPreferencesSchema = z.object({
  favorite_products: z.array(z.string().uuid())
    .optional()
    .describe('List of favorite product IDs'),

  dietary_restrictions: z.array(z.string())
    .optional()
    .describe('Dietary restrictions and allergens'),

  default_payment_method: z.string()
    .optional()
    .describe('Preferred payment method'),
});

/**
 * Create Customer Schema
 */
export const CreateCustomerSchema = z.object({
  first_name: z.string()
    .min(2, 'Imię musi mieć co najmniej 2 znaki')
    .max(50, 'Imię za długie')
    .describe('Customer first name'),

  last_name: z.string()
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki')
    .max(50, 'Nazwisko za długie')
    .describe('Customer last name'),

  email: z.string()
    .email('Niepoprawny adres email')
    .optional()
    .nullable()
    .describe('Customer email (optional for walk-in customers)'),

  phone: z.string()
    .regex(/^\+?[0-9\s\-()]{9,}$/, 'Niepoprawny numer telefonu')
    .describe('Customer phone number (required)'),

  birth_date: z.string()
    .datetime()
    .optional()
    .nullable()
    .describe('Customer birth date for birthday bonuses'),

  source: z.nativeEnum(CustomerSource)
    .default(CustomerSource.POS_TERMINAL)
    .describe('Customer registration source'),

  marketing_consent: z.boolean()
    .default(false)
    .describe('GDPR marketing consent'),

  addresses: z.array(CustomerAddressSchema)
    .default([])
    .describe('List of customer addresses'),

  preferences: CustomerPreferencesSchema
    .optional()
    .describe('Customer preferences and favorites'),

  notes: z.string()
    .max(1000, 'Notatki za długie')
    .optional()
    .nullable()
    .describe('Internal notes about the customer'),
});

/**
 * Update Customer Schema
 * All fields are optional for partial updates
 */
export const UpdateCustomerSchema = CreateCustomerSchema.partial();

/**
 * Add Loyalty Points Schema
 */
export const AddLoyaltyPointsSchema = z.object({
  customer_id: z.string()
    .uuid('Niepoprawny ID klienta')
    .describe('Customer ID to add points to'),

  amount: z.number()
    .int('Punkty muszą być liczbą całkowitą')
    .describe('Points amount (can be negative for redemptions)'),

  reason: z.nativeEnum(LoyaltyPointReason)
    .describe('Reason for points adjustment'),

  description: z.string()
    .max(500, 'Opis za długi')
    .optional()
    .nullable()
    .describe('Additional description'),

  related_order_id: z.string()
    .uuid('Niepoprawny ID zamówienia')
    .optional()
    .nullable()
    .describe('Related order ID if applicable'),

  created_by: z.string()
    .uuid('Niepoprawny ID użytkownika')
    .optional()
    .nullable()
    .describe('User ID for manual adjustments'),
});

/**
 * Customer Search/Filter Schema
 */
export const CustomerFilterSchema = z.object({
  search_query: z.string()
    .optional()
    .describe('Search by name, email, or phone'),

  tier: z.nativeEnum(LoyaltyTier)
    .optional()
    .describe('Filter by loyalty tier'),

  min_points: z.number()
    .int()
    .min(0)
    .optional()
    .describe('Minimum loyalty points'),

  max_points: z.number()
    .int()
    .min(0)
    .optional()
    .describe('Maximum loyalty points'),

  registration_date_from: z.string()
    .datetime()
    .optional()
    .describe('Registration date from'),

  registration_date_to: z.string()
    .datetime()
    .optional()
    .describe('Registration date to'),

  has_orders: z.boolean()
    .optional()
    .describe('Filter customers with/without orders'),

  marketing_consent: z.boolean()
    .optional()
    .describe('Filter by marketing consent'),

  is_active: z.boolean()
    .default(true)
    .describe('Filter by active status'),
});

const RewardSchemaBase = z.object({
  name: z.string()
    .min(1, 'Nazwa nagrody jest wymagana')
    .max(255, 'Nazwa nagrody jest za długa'),
  description: z.string()
    .max(1000, 'Opis jest za długi')
    .nullish()
    .transform((value) => value?.trim() || null),
  points_cost: z.number()
    .int('Koszt w punktach musi być liczbą całkowitą')
    .min(1, 'Koszt w punktach musi być większy od zera'),
  reward_type: RewardTypeSchema,
  discount_value: z.number()
    .min(0, 'Wartość rabatu nie może być ujemna')
    .nullish(),
  free_product_id: z.string()
    .uuid('Niepoprawne ID produktu')
    .nullish()
    .or(z.literal(''))
    .transform((value) => value || null),
  icon: z.string()
    .max(50, 'Ikona jest za długa')
    .nullish()
    .transform((value) => value?.trim() || null),
  min_tier: z.nativeEnum(LoyaltyTier).default(LoyaltyTier.BRONZE),
  sort_order: z.number()
    .int('Kolejność musi być liczbą całkowitą')
    .min(0, 'Kolejność nie może być ujemna')
    .default(0),
  is_active: z.boolean().default(true),
});

export const CreateRewardSchema = RewardSchemaBase.superRefine((value, ctx) => {
  if (value.reward_type === 'discount' && (value.discount_value == null || value.discount_value <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount_value'],
      message: 'Dla rabatu podaj wartość większą od zera',
    });
  }
});

export const UpdateRewardSchema = RewardSchemaBase.partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Podaj przynajmniej jedno pole do aktualizacji',
      });
    }

    if (value.reward_type === 'discount') {
      if (value.discount_value == null || value.discount_value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discount_value'],
          message: 'Dla rabatu podaj wartość większą od zera',
        });
      }
    }
  });

const PromotionalCodeSchemaBase = z.object({
  code: z.string()
    .min(2, 'Kod promocyjny jest za krótki')
    .max(50, 'Kod promocyjny jest za długi')
    .trim()
    .transform((value) => value.toUpperCase()),
  name: z.string()
    .min(1, 'Nazwa kodu promocyjnego jest wymagana')
    .max(200, 'Nazwa kodu promocyjnego jest za długa'),
  description: z.string()
    .max(1000, 'Opis jest za długi')
    .nullish()
    .transform((value) => value?.trim() || null),
  discount_type: PromotionalCodeDiscountTypeSchema,
  discount_value: z.number()
    .min(0, 'Wartość rabatu nie może być ujemna')
    .nullish(),
  free_item_id: z.string()
    .uuid('Niepoprawne ID produktu')
    .nullish()
    .or(z.literal(''))
    .transform((value) => value || null),
  min_order_amount: z.number()
    .min(0, 'Minimalna kwota nie może być ujemna')
    .nullish(),
  first_order_only: z.boolean().default(false),
  required_loyalty_tier: z.nativeEnum(LoyaltyTier)
    .nullish()
    .or(z.literal(''))
    .transform((value) => value || null),
  max_uses: z.number()
    .int('Limit użyć musi być liczbą całkowitą')
    .min(1, 'Limit użyć musi być większy od zera')
    .nullish(),
  max_uses_per_customer: z.number()
    .int('Limit na klienta musi być liczbą całkowitą')
    .min(1, 'Limit na klienta musi być większy od zera')
    .nullish(),
  valid_from: z.string()
    .datetime('Niepoprawna data rozpoczęcia'),
  valid_until: z.string()
    .datetime('Niepoprawna data zakończenia')
    .nullish()
    .or(z.literal(''))
    .transform((value) => value || null),
  is_active: z.boolean().default(true),
  channels: z.array(PromotionalCodeChannelSchema)
    .min(1, 'Wybierz przynajmniej jeden kanał'),
});

export const CreatePromotionalCodeSchema = PromotionalCodeSchemaBase.superRefine((value, ctx) => {
  if (
    (value.discount_type === 'percent' || value.discount_type === 'fixed') &&
    (value.discount_value == null || value.discount_value <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount_value'],
      message: 'Dla tego typu kodu podaj wartość rabatu większą od zera',
    });
  }

  if (value.discount_type === 'percent' && value.discount_value != null && value.discount_value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount_value'],
      message: 'Rabat procentowy nie może przekraczać 100%',
    });
  }

  if (value.discount_type === 'free_item' && !value.free_item_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['free_item_id'],
      message: 'Dla darmowego produktu wybierz produkt',
    });
  }

  if (value.valid_until && new Date(value.valid_until).getTime() < new Date(value.valid_from).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valid_until'],
      message: 'Data zakończenia musi być późniejsza niż data rozpoczęcia',
    });
  }
});

export const UpdatePromotionalCodeSchema = PromotionalCodeSchemaBase.partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Podaj przynajmniej jedno pole do aktualizacji',
      });
    }

    if (
      (value.discount_type === 'percent' || value.discount_type === 'fixed') &&
      (value.discount_value == null || value.discount_value <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
        message: 'Dla tego typu kodu podaj wartość rabatu większą od zera',
      });
    }

    if (value.discount_type === 'percent' && value.discount_value != null && value.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
      message: 'Rabat procentowy nie może przekraczać 100%',
      });
    }

    if (value.discount_type === 'free_item' && !value.free_item_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['free_item_id'],
        message: 'Dla darmowego produktu wybierz produkt',
      });
    }

    if (
      value.valid_from &&
      value.valid_until &&
      new Date(value.valid_until).getTime() < new Date(value.valid_from).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valid_until'],
        message: 'Data zakończenia musi być późniejsza niż data rozpoczęcia',
      });
    }
  });

// Type exports
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type AddLoyaltyPointsInput = z.infer<typeof AddLoyaltyPointsSchema>;
export type CustomerFilterInput = z.infer<typeof CustomerFilterSchema>;
export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;
export type CustomerPreferencesInput = z.infer<typeof CustomerPreferencesSchema>;
export type CreateRewardInput = z.infer<typeof CreateRewardSchema>;
export type UpdateRewardInput = z.infer<typeof UpdateRewardSchema>;
export type CreatePromotionalCodeInput = z.infer<typeof CreatePromotionalCodeSchema>;
export type UpdatePromotionalCodeInput = z.infer<typeof UpdatePromotionalCodeSchema>;
