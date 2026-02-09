/**
 * Recipe Validation Schemas
 *
 * Zod schemas for recipe creation, update, and validation.
 */

import { z } from 'zod';
import { ProductCategory, Allergen } from '@/types/enums';

/**
 * Recipe Ingredient Schema
 */
export const RecipeIngredientSchema = z.object({
  stock_item_id: z.string().uuid('ID składnika musi być prawidłowym UUID'),
  quantity: z
    .number()
    .positive('Ilość musi być większa od 0')
    .describe('Ilość składnika potrzebna w recepturze'),
  unit: z
    .string()
    .min(1, 'Jednostka jest wymagana')
    .describe('Jednostka miary (g, ml, szt)'),
  notes: z.string().optional().describe('Dodatkowe notatki do składnika'),
});

/**
 * Create Recipe Schema
 */
export const CreateRecipeSchema = z.object({
  product_id: z
    .string()
    .uuid('ID produktu musi być prawidłowym UUID')
    .describe('Produkt, który ta receptura wytwarza'),
  name: z
    .string()
    .min(3, 'Nazwa musi mieć minimum 3 znaki')
    .max(100, 'Nazwa może mieć maksymalnie 100 znaków')
    .describe('Nazwa receptury'),
  description: z
    .string()
    .max(500, 'Opis może mieć maksymalnie 500 znaków')
    .optional()
    .describe('Opcjonalny opis receptury'),
  product_category: z
    .nativeEnum(ProductCategory)
    .describe('Kategoria produktu (surowiec/półprodukt/gotowe)'),
  ingredients: z
    .array(RecipeIngredientSchema)
    .min(1, 'Receptura musi zawierać przynajmniej jeden składnik')
    .describe('Lista składników'),
  yield_quantity: z
    .number()
    .positive('Wydajność musi być większa od 0')
    .describe('Ile sztuk/kg/litrów produkuje receptura'),
  yield_unit: z
    .string()
    .min(1, 'Jednostka wydajności jest wymagana')
    .describe('Jednostka wydajności (szt, kg, l)'),
  preparation_time_minutes: z
    .number()
    .int('Czas przygotowania musi być liczbą całkowitą')
    .nonnegative('Czas przygotowania nie może być ujemny')
    .max(1440, 'Czas przygotowania nie może przekraczać 24 godzin')
    .describe('Czas przygotowania w minutach'),
  instructions: z
    .string()
    .max(2000, 'Instrukcje mogą mieć maksymalnie 2000 znaków')
    .optional()
    .describe('Instrukcje krok po kroku'),
  created_by: z
    .string()
    .uuid('ID użytkownika musi być prawidłowym UUID')
    .describe('Użytkownik tworzący recepturę'),
});

/**
 * Update Recipe Schema
 * All fields optional for partial updates
 */
export const UpdateRecipeSchema = CreateRecipeSchema.partial().extend({
  last_updated_by: z
    .string()
    .uuid('ID użytkownika musi być prawidłowym UUID')
    .optional(),
  version: z.number().int().positive().optional(),
});

/**
 * Calculate Recipe Cost Schema
 */
export const CalculateRecipeCostSchema = z.object({
  recipe_id: z
    .string()
    .uuid('ID receptury musi być prawidłowym UUID')
    .optional()
    .describe('ID receptury (jeśli już istnieje)'),
  ingredients: z
    .array(RecipeIngredientSchema)
    .min(1, 'Lista składników nie może być pusta')
    .describe('Lista składników do kalkulacji'),
  yield_quantity: z
    .number()
    .positive('Wydajność musi być większa od 0')
    .describe('Ile sztuk produkuje receptura'),
  selling_price: z
    .number()
    .positive('Cena sprzedaży musi być większa od 0')
    .optional()
    .describe('Opcjonalna cena sprzedaży dla food cost %'),
});

/**
 * Production Log Schema
 */
export const ProductionLogSchema = z.object({
  recipe_id: z
    .string()
    .uuid('ID receptury musi być prawidłowym UUID')
    .describe('Receptura używana do produkcji'),
  quantity_produced: z
    .number()
    .positive('Ilość wyprodukowana musi być większa od 0')
    .describe('Ile sztuk wyprodukowano'),
  produced_by: z
    .string()
    .uuid('ID użytkownika musi być prawidłowym UUID')
    .describe('Użytkownik rejestrujący produkcję'),
  notes: z
    .string()
    .max(500, 'Notatki mogą mieć maksymalnie 500 znaków')
    .optional()
    .describe('Opcjonalne notatki do produkcji'),
});

/**
 * Allergen Filter Schema
 */
export const AllergenFilterSchema = z.object({
  allergens: z
    .array(z.nativeEnum(Allergen))
    .min(1, 'Musisz wybrać przynajmniej jeden alergen')
    .describe('Alergeny do odfiltrowania'),
  exclude_mode: z
    .boolean()
    .default(true)
    .describe('True = wyklucz produkty Z alergenami, False = pokaż tylko Z alergenami'),
});

/**
 * Type exports
 */
export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;
export type RecipeIngredientInput = z.infer<typeof RecipeIngredientSchema>;
export type CalculateRecipeCostInput = z.infer<typeof CalculateRecipeCostSchema>;
export type ProductionLogInput = z.infer<typeof ProductionLogSchema>;
export type AllergenFilterInput = z.infer<typeof AllergenFilterSchema>;
