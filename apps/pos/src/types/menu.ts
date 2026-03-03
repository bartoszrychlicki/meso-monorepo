import {
  Allergen,
  ModifierType,
  ModifierAction,
  ProductType,
  VariantType,
  SalesChannel,
  PromotionType,
} from './enums';
import { BaseEntity } from './common';

export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  color?: string;
  icon?: string;
}

export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

// Multi-channel pricing (spec 3.2, 3.6 MENU-004)
export interface ProductPricing {
  channel: SalesChannel;
  price: number;
}

export interface Modifier extends BaseEntity {
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
  modifier_action: ModifierAction; // NOWE: spec 3.4 - typ modyfikatora
}

/** Standalone modifier entity (stored in menu_modifiers table) */
export interface MenuModifier extends BaseEntity {
  name: string;
  price: number;
  modifier_action: ModifierAction;
  recipe_id?: string | null;
  is_available: boolean;
  sort_order: number;
}

export interface ModifierGroup extends BaseEntity {
  name: string;
  type: ModifierType;
  required: boolean;
  min_selections: number;
  max_selections: number;
  modifiers: Modifier[];
}

export interface ProductVariant extends BaseEntity {
  name: string;
  sku?: string;
  price: number;
  is_available: boolean;
  sort_order: number;
  variant_type: VariantType; // NOWE: spec 3.3 - typ wariantu (size/version/weight)
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  width: number;
  height: number;
  sort_order: number;
  storage_path?: string; // Path in Supabase Storage for deletion
}

export interface Product extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  category_id: string;
  type: ProductType;
  price: number; // Cena bazowa (backward compatibility)
  original_price?: number | null; // Cena regularna przed promocją
  promo_label?: string | null; // Etykieta promocji (np. "Happy Hour")
  promo_starts_at?: string | null; // ISO datetime
  promo_ends_at?: string | null; // ISO datetime
  image_url?: string; // @deprecated - use images[]
  images: ProductImage[];
  is_available: boolean; // Czy dostępny do zamówienia (tymczasowo niedostępny)
  is_featured: boolean;
  allergens: Allergen[];
  nutritional_info?: NutritionalInfo;
  variants: ProductVariant[];
  modifier_groups: ModifierGroup[];
  ingredients: RecipeIngredient[]; // @deprecated - use recipe_id → Recipe
  recipe_id?: string; // Reference to Recipe (BOM) - replaces inline ingredients
  preparation_time_minutes?: number;
  sort_order: number;
  color?: string;

  // NOWE POLA - spec zgodność:
  sku: string; // spec 3.2 - Kod SKU (wymagane)
  tax_rate: number; // spec 3.2 - Stawka VAT (domyślnie 8%)
  is_active: boolean; // spec 3.2 - Czy produkt aktywny w systemie (vs is_available)
  point_ids: string[]; // spec 3.2 - Dostępność w punktach sprzedaży
  pricing: ProductPricing[]; // spec 3.2, 3.6 MENU-004 - Ceny wielokanałowe
  active_promotions?: string[]; // spec 3.5 - ID aktywnych promocji (Sprint 2)
}

export interface RecipeIngredient {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name: string;
  quantity: number;
  unit: string;
}

// Recipe type moved to @/types/recipe.ts — use Recipe from there

// Promotion types (spec 3.5, 3.6 MENU-006, MENU-007)
export interface PromotionConditions {
  min_order_value?: number; // Dla type='amount' - min kwota zamówienia
  buy_quantity?: number; // Dla type='buy_x_get_y' - kup X
  get_quantity?: number; // Dla type='buy_x_get_y' - dostaniesz Y
}

export interface TimeConstraints {
  time_start: string; // HH:mm format
  time_end: string; // HH:mm format
  days_of_week: number[]; // 0=niedziela, 1=poniedziałek, ..., 6=sobota
}

export interface Promotion extends BaseEntity {
  name: string;
  description?: string;
  type: PromotionType;
  value: number; // Wartość zniżki (procent lub kwota)
  conditions?: PromotionConditions;
  applicable_products?: string[]; // null/undefined = wszystkie produkty
  applicable_categories?: string[]; // null/undefined = wszystkie kategorie
  start_date: string; // ISO date
  end_date: string; // ISO date
  time_constraints?: TimeConstraints; // Dla type='happy_hour'
  is_active: boolean;
  priority: number; // Kolejność stosowania promocji (wyższa = wcześniej)
}
