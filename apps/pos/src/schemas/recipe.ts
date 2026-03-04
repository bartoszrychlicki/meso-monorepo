/**
 * Recipe Validation Schemas
 *
 * Zod schemas for recipe creation, update, and validation.
 */

import { z } from 'zod';
import { Allergen } from '@/types/enums';
import { RECIPE_PRODUCT_CATEGORIES } from '@/types/recipe';

/**
 * Recipe Ingredient Schema (discriminated union: stock_item | recipe)
 */
const StockItemIngredientSchema = z.object({
  type: z.literal('stock_item'),
  reference_id: z.string().uuid('ID skladnika musi byc prawidlowym UUID'),
  reference_name: z.string().optional(),
  quantity: z
    .number()
    .positive('Ilosc musi byc wieksza od 0')
    .describe('Ilosc skladnika potrzebna w recepturze'),
  unit: z
    .string()
    .min(1, 'Jednostka jest wymagana')
    .describe('Jednostka miary (g, ml, szt)'),
  notes: z.string().optional().describe('Dodatkowe notatki do skladnika'),
});

const RecipeRefIngredientSchema = z.object({
  type: z.literal('recipe'),
  reference_id: z.string().uuid('ID receptury musi byc prawidlowym UUID'),
  reference_name: z.string().optional(),
  quantity: z
    .number()
    .positive('Ilosc musi byc wieksza od 0')
    .describe('Ilosc polproduktu potrzebna w recepturze'),
  unit: z
    .string()
    .min(1, 'Jednostka jest wymagana')
    .describe('Jednostka miary'),
  notes: z.string().optional().describe('Dodatkowe notatki'),
});

export const RecipeIngredientSchema = z.discriminatedUnion('type', [
  StockItemIngredientSchema,
  RecipeRefIngredientSchema,
]);

/**
 * Create Recipe Schema
 */
export const CreateRecipeSchema = z.object({
  product_id: z
    .string()
    .min(1, 'ID produktu jest wymagane')
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
    .enum(RECIPE_PRODUCT_CATEGORIES)
    .describe('Kategoria produktu (półprodukt/produkt finalny)'),
  ingredients: z
    .array(RecipeIngredientSchema)
    .min(1, 'Receptura musi zawierać przynajmniej jeden składnik')
    .describe('Lista składników'),
  yield_quantity: z
    .number()
    .positive('Wydajność musi być większa od 0')
    .describe('Ile jednostek produkuje receptura (np. 1.5 szt lub 2.7 kg)'),
  yield_unit: z
    .enum(['szt', 'kg'])
    .describe('Jednostka wydajności — szt dla produktów finalnych, kg dla półproduktów'),
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
    .min(1, 'ID użytkownika jest wymagane')
    .describe('Użytkownik tworzący recepturę'),
});

/**
 * Update Recipe Schema
 * All fields optional for partial updates
 */
export const UpdateRecipeSchema = CreateRecipeSchema.partial().extend({
  last_updated_by: z
    .string()
    .min(1, 'ID użytkownika jest wymagane')
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
