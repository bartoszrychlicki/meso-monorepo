/**
 * Recipe Seed Data
 *
 * Sample recipes for the MESO POS system demonstrating:
 * - RAW_MATERIAL → SEMI_FINISHED → FINISHED_GOOD hierarchy
 * - Allergen tracking
 * - Cost calculation
 */

import { Recipe } from '@/types/recipe';
import { ProductCategory, Allergen } from '@/types/enums';
import { STOCK_ITEM_IDS } from './inventory';

export const RECIPE_IDS = {
  BEEF_PATTY: '77777777-7777-7777-7777-777777770001',
  CHEESEBURGER: '77777777-7777-7777-7777-777777770002',
  FRIES: '77777777-7777-7777-7777-777777770003',
} as const;

export const recipes: Recipe[] = [
  // Semi-finished: Beef Patty
  {
    id: RECIPE_IDS.BEEF_PATTY,
    product_id: 'product-beef-patty',
    name: 'Patty wołowy',
    description: 'Grillowany patty z wołowiny 150g',
    product_category: ProductCategory.SEMI_FINISHED,

    ingredients: [
      {
        id: crypto.randomUUID(),
        stock_item_id: STOCK_ITEM_IDS.BEEF, // Beef (raw material)
        quantity: 150,
        unit: 'g',
        notes: 'Świeża wołowina mielona',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 5,
    instructions: '1. Uformuj patty 150g\n2. Grilluj 3 min z każdej strony\n3. Dopraw solą i pieprzem',

    allergens: [], // No direct allergens (beef itself is not a major allergen)
    total_cost: 4.50, // 150g @ 30 zł/kg = 4.50 zł
    cost_per_unit: 4.50,
    food_cost_percentage: null,

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },

  // Finished good: Cheeseburger
  {
    id: RECIPE_IDS.CHEESEBURGER,
    product_id: 'product-cheeseburger',
    name: 'Cheeseburger Classic',
    description: 'Klasyczny cheeseburger z wołowiną',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        stock_item_id: STOCK_ITEM_IDS.BUNS, // Buns
        quantity: 1,
        unit: 'szt',
        notes: 'Bułka sezamowa',
      },
      {
        id: crypto.randomUUID(),
        stock_item_id: STOCK_ITEM_IDS.BEEF, // Beef for patty (alternatively: use BEEF_PATTY semi-finished)
        quantity: 150,
        unit: 'g',
        notes: 'Patty wołowy',
      },
      {
        id: crypto.randomUUID(),
        stock_item_id: STOCK_ITEM_IDS.CHEDDAR, // Cheddar cheese
        quantity: 30,
        unit: 'g',
        notes: 'Cheddar topiony',
      },
      {
        id: crypto.randomUUID(),
        stock_item_id: STOCK_ITEM_IDS.LETTUCE, // Lettuce
        quantity: 20,
        unit: 'g',
        notes: 'Świeża sałata',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 10,
    instructions:
      '1. Podgrzej bułkę\n2. Usmażmy patty\n3. Dodaj ser w ostatniej minucie\n4. Złóż: bułka dolna → sałata → patty+ser → bułka górna',

    allergens: [Allergen.GLUTEN, Allergen.MILK, Allergen.SESAME],
    total_cost: 6.20, // Bułka 0.80 + Beef 4.50 + Cheddar 0.60 + Lettuce 0.30
    cost_per_unit: 6.20,
    food_cost_percentage: 24.8, // Assuming selling price ~25 zł

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },

  // Finished good: French Fries
  {
    id: RECIPE_IDS.FRIES,
    product_id: 'product-fries',
    name: 'Frytki belgijskie',
    description: 'Chrupiące frytki z ziemniaków',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        stock_item_id: STOCK_ITEM_IDS.POTATOES, // Potatoes
        quantity: 200,
        unit: 'g',
        notes: 'Ziemniaki obrane i pokrojone',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'porcja',
    preparation_time_minutes: 8,
    instructions: '1. Obierz i pokrój ziemniaki\n2. Smażymy w głębokim tłuszczu 180°C przez 5-6 min\n3. Odsącz i posyp solą',

    allergens: [], // No major allergens (unless fried in shared oil with allergens)
    total_cost: 1.20, // 200g @ 6 zł/kg = 1.20 zł
    cost_per_unit: 1.20,
    food_cost_percentage: 15.0, // Assuming selling price ~8 zł

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];
