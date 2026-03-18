import { z } from 'zod';
import {
  Allergen,
  ModifierType,
  ModifierAction,
  ProductType,
  VariantType,
  SalesChannel,
  PromotionType,
} from '@/types/enums';

const ModifierSchema = z.object({
  name: z.string().min(1, 'Nazwa modyfikatora jest wymagana'),
  price: z.number().min(0, 'Cena nie może być ujemna'),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  modifier_action: z.nativeEnum(ModifierAction).default(ModifierAction.ADD), // NOWE
});

/** Schema for standalone menu_modifiers table */
export const MenuModifierSchema = z.object({
  name: z.string().min(1, 'Nazwa modyfikatora jest wymagana'),
  price: z.number(),
  modifier_action: z.nativeEnum(ModifierAction).default(ModifierAction.ADD),
  recipe_id: z.string().uuid().nullable().optional(),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type CreateMenuModifierInput = z.infer<typeof MenuModifierSchema>;

const _ModifierGroupSchema = z.object({
  name: z.string().min(1, 'Nazwa grupy jest wymagana'),
  type: z.nativeEnum(ModifierType),
  required: z.boolean().default(false),
  min_selections: z.number().int().min(0).default(0),
  max_selections: z.number().int().min(0).default(1),
  modifiers: z.array(ModifierSchema).default([]),
});

const ProductVariantSchema = z.object({
  name: z.string().min(1, 'Nazwa wariantu jest wymagana'),
  sku: z.string().optional(),
  price: z.number().min(0, 'Cena nie może być ujemna'),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  variant_type: z.nativeEnum(VariantType).default(VariantType.SIZE), // NOWE
});

const NutritionalInfoSchema = z.object({
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
});

const RecipeIngredientSchema = z.object({
  type: z.enum(['stock_item', 'recipe']),
  reference_id: z.string().min(1),
  reference_name: z.string().min(1),
  quantity: z.number().positive('Ilosc musi byc wieksza niz 0'),
  unit: z.string().min(1),
});

// Product image schema with resolution validation
const MIN_IMAGE_WIDTH = 400;
const MIN_IMAGE_HEIGHT = 300;

export const ProductImageSchema = z.object({
  id: z.string().min(1),
  url: z.string().url('Nieprawidłowy URL zdjęcia'),
  alt: z.string().optional(),
  width: z.number().int().min(MIN_IMAGE_WIDTH, `Minimalna szerokość zdjęcia to ${MIN_IMAGE_WIDTH}px`),
  height: z.number().int().min(MIN_IMAGE_HEIGHT, `Minimalna wysokość zdjęcia to ${MIN_IMAGE_HEIGHT}px`),
  sort_order: z.number().int().default(0),
  storage_path: z.string().optional(),
});

export { MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT };

// NOWE: Multi-channel pricing schema
const ProductPricingSchema = z.object({
  channel: z.nativeEnum(SalesChannel),
  price: z.number().positive('Cena musi być większa niż 0'),
});

const ProductBaseSchema = z.object({
  name: z.string().min(1, 'Nazwa produktu jest wymagana'),
  slug: z.string().min(1, 'Slug jest wymagany'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Kategoria jest wymagana'),
  type: z.nativeEnum(ProductType).default(ProductType.SINGLE),
  price: z.number().min(0, 'Cena nie może być ujemna'),
  original_price: z.number().min(0, 'Cena regularna nie może być ujemna').nullable().optional(),
  promo_label: z.string().trim().min(1, 'Label promocji nie może być pusty').max(64, 'Label promocji może mieć maksymalnie 64 znaki').nullable().optional(),
  promo_starts_at: z.string().datetime({ offset: true }).nullable().optional(),
  promo_ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  image_url: z.string().optional(), // @deprecated - use images[]
  images: z.array(ProductImageSchema).max(3, 'Maksymalnie 3 zdjęcia').default([]),
  is_available: z.boolean().default(true),
  is_hidden_in_menu: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  allergens: z.array(z.nativeEnum(Allergen)).default([]),
  nutritional_info: NutritionalInfoSchema.optional(),
  variants: z.array(ProductVariantSchema).default([]),
  modifier_group_ids: z.array(z.string().uuid()).default([]),
  ingredients: z.array(RecipeIngredientSchema).default([]),
  preparation_time_minutes: z.number().int().min(0).optional(),
  sort_order: z.number().int().default(0),
  color: z.string().optional(),

  // NOWE POLA - spec zgodność:
  sku: z.string().min(1, 'SKU jest wymagane'),
  tax_rate: z.number().min(0).max(100).default(8),
  is_active: z.boolean().default(true),
  point_ids: z.array(z.string().uuid()).default([]),
  pricing: z.array(ProductPricingSchema).min(1, 'Przynajmniej jedna cena jest wymagana'),
  active_promotions: z.array(z.string().uuid()).optional(),
});

export const CreateProductSchema = ProductBaseSchema.superRefine((product, ctx) => {
  if (product.original_price != null && product.original_price < product.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['original_price'],
      message: 'Cena regularna musi być większa lub równa cenie sprzedaży',
    });
  }

  if (product.promo_starts_at && product.promo_ends_at) {
    const start = new Date(product.promo_starts_at);
    const end = new Date(product.promo_ends_at);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['promo_ends_at'],
        message: 'Data zakończenia promocji musi być późniejsza niż data startu',
      });
    }
  }
});

export const UpdateProductSchema = ProductBaseSchema.partial().superRefine((product, ctx) => {
  if (
    product.original_price != null &&
    product.price != null &&
    product.original_price < product.price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['original_price'],
      message: 'Cena regularna musi być większa lub równa cenie sprzedaży',
    });
  }

  if (product.promo_starts_at && product.promo_ends_at) {
    const start = new Date(product.promo_starts_at);
    const end = new Date(product.promo_ends_at);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['promo_ends_at'],
        message: 'Data zakończenia promocji musi być późniejsza niż data startu',
      });
    }
  }
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nazwa kategorii jest wymagana'),
  slug: z.string().min(1, 'Slug jest wymagany'),
  description: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// NOWE: Promotion schemas (Sprint 2)
const PromotionConditionsSchema = z.object({
  min_order_value: z.number().min(0).optional(),
  buy_quantity: z.number().int().min(1).optional(),
  get_quantity: z.number().int().min(1).optional(),
});

const TimeConstraintsSchema = z.object({
  time_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:mm wymagany'),
  time_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:mm wymagany'),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1),
});

export const CreatePromotionSchema = z.object({
  name: z.string().min(1, 'Nazwa promocji jest wymagana'),
  description: z.string().optional(),
  type: z.nativeEnum(PromotionType),
  value: z.number().positive('Wartość musi być większa niż 0'),
  conditions: PromotionConditionsSchema.optional(),
  applicable_products: z.array(z.string().uuid()).optional(),
  applicable_categories: z.array(z.string().uuid()).optional(),
  start_date: z.string(),
  end_date: z.string(),
  time_constraints: TimeConstraintsSchema.optional(),
  is_active: z.boolean().default(true),
  priority: z.number().int().default(0),
});

export const UpdatePromotionSchema = CreatePromotionSchema.partial();

// Type inference exports
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export const UpdateCategorySchema = CreateCategorySchema.partial();
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreatePromotionInput = z.infer<typeof CreatePromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof UpdatePromotionSchema>;

export const ReorderMenuProductsSchema = z.object({
  category_id: z.string().uuid('Kategoria musi byc poprawnym UUID'),
  product_ids: z.array(z.string().uuid('Produkt musi byc poprawnym UUID')).min(1, 'Lista produktow nie moze byc pusta'),
}).superRefine((data, ctx) => {
  const uniqueIds = new Set(data.product_ids);
  if (uniqueIds.size !== data.product_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['product_ids'],
      message: 'Lista produktow nie moze zawierac duplikatow',
    });
  }
});

export type ReorderMenuProductsInput = z.infer<typeof ReorderMenuProductsSchema>;
