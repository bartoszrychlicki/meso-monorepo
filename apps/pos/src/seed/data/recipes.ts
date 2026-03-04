/**
 * Recipe Seed Data
 *
 * Sample recipes for the MESO POS system demonstrating:
 * - RAW_MATERIAL → SEMI_FINISHED → FINISHED_GOOD hierarchy
 * - Allergen tracking
 * - Cost calculation
 * - Integration with Product (via product_id ↔ recipe_id)
 */

import { Recipe } from '@/types/recipe';
import { ProductCategory, Allergen } from '@/types/enums';
import { STOCK_ITEM_IDS } from './inventory';
import { PRODUCT_IDS } from './products';

export const RECIPE_IDS = {
  BEEF_PATTY: '77777777-7777-7777-7777-777777770001',
  CHEESEBURGER: '77777777-7777-7777-7777-777777770002',
  FRIES: '77777777-7777-7777-7777-777777770003',
  BACON_BURGER: '77777777-7777-7777-7777-777777770004',
  TRUFFLE_BURGER: '77777777-7777-7777-7777-777777770005',
  DOUBLE_SMASH: '77777777-7777-7777-7777-777777770006',
  CAESAR_SALAD: '77777777-7777-7777-7777-777777770007',
  CHICKEN_SALAD: '77777777-7777-7777-7777-777777770008',
  COLA: '77777777-7777-7777-7777-777777770009',
  LEMONADE: '77777777-7777-7777-7777-777777770010',
  WATER: '77777777-7777-7777-7777-777777770011',
  LATTE: '77777777-7777-7777-7777-777777770012',
  BROWNIE: '77777777-7777-7777-7777-777777770013',
  ICE_CREAM: '77777777-7777-7777-7777-777777770014',
} as const;

export const recipes: Recipe[] = [
  // ── SEMI-FINISHED ─────────────────────────────────────────────────

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
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BEEF,
        quantity: 150,
        unit: 'g',
        notes: 'Świeża wołowina mielona',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 5,
    instructions: '1. Uformuj patty 150g\n2. Grilluj 3 min z każdej strony\n3. Dopraw solą i pieprzem',

    allergens: [],
    total_cost: 4.80, // 150g × 0.032 PLN/g
    cost_per_unit: 4.80,
    food_cost_percentage: null,

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // ── BURGERY ───────────────────────────────────────────────────────

  // Cheeseburger
  {
    id: RECIPE_IDS.CHEESEBURGER,
    product_id: PRODUCT_IDS.CHEESEBURGER,
    name: 'Cheeseburger Classic',
    description: 'Klasyczny cheeseburger z wołowiną',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BUNS,
        quantity: 1,
        unit: 'szt',
        notes: 'Bułka sezamowa',
      },
      {
        id: crypto.randomUUID(),
        type: 'recipe' as const,
        reference_id: RECIPE_IDS.BEEF_PATTY,
        reference_name: 'Patty wołowy',
        quantity: 1,
        unit: 'szt',
        notes: 'Patty wołowy z receptury',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.CHEDDAR,
        quantity: 40,
        unit: 'g',
        notes: 'Cheddar topiony',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.LETTUCE,
        quantity: 30,
        unit: 'g',
        notes: 'Świeża sałata',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.TOMATOES,
        quantity: 50,
        unit: 'g',
        notes: 'Pomidory plastry',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.ONION,
        quantity: 30,
        unit: 'g',
        notes: 'Cebula karmelizowana',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 12,
    instructions:
      '1. Podgrzej bułkę\n2. Usmaż patty\n3. Dodaj ser w ostatniej minucie\n4. Złóż: bułka dolna → sałata → pomidor → patty+ser → cebula → bułka górna',

    allergens: [Allergen.GLUTEN, Allergen.MILK, Allergen.EGGS],
    total_cost: 7.57, // 1×1.20 + 150×0.032 + 40×0.028 + 30×3.50(szt→g approx) + 50×0.008 + 30×0.015
    cost_per_unit: 7.57,
    food_cost_percentage: 30.3, // 7.57 / 24.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Bacon Burger
  {
    id: RECIPE_IDS.BACON_BURGER,
    product_id: PRODUCT_IDS.BACON_BURGER,
    name: 'Bacon Burger',
    description: 'Soczysty burger z chrupiącym bekonem i sosem BBQ',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BUNS,
        quantity: 1,
        unit: 'szt',
        notes: 'Bułka burgerowa',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BEEF,
        quantity: 150,
        unit: 'g',
        notes: 'Patty wołowy 150g',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BACON,
        quantity: 50,
        unit: 'g',
        notes: 'Bekon chrupiący',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.CHEDDAR,
        quantity: 40,
        unit: 'g',
        notes: 'Ser cheddar',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BBQ_SAUCE,
        quantity: 30,
        unit: 'ml',
        notes: 'Sos BBQ',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.ONION,
        quantity: 30,
        unit: 'g',
        notes: 'Cebula karmelizowana',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 14,
    instructions:
      '1. Usmaż bekon do chrupkości\n2. Grilluj patty\n3. Dodaj ser na patty\n4. Złóż: bułka → sos BBQ → patty+ser → bekon → cebula → bułka',

    allergens: [Allergen.GLUTEN, Allergen.MILK, Allergen.EGGS, Allergen.SULPHITES],
    total_cost: 9.63, // 1×1.20 + 150×0.032 + 50×0.045 + 40×0.028 + 30×0.012 + 30×0.015
    cost_per_unit: 9.63,
    food_cost_percentage: 32.1, // 9.63 / 29.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Truffle Burger
  {
    id: RECIPE_IDS.TRUFFLE_BURGER,
    product_id: PRODUCT_IDS.TRUFFLE_BURGER,
    name: 'Truffle Burger',
    description: 'Wyjątkowy burger z truflowym majonezem i serem brie',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BUNS,
        quantity: 1,
        unit: 'szt',
        notes: 'Bułka brioche',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BEEF,
        quantity: 180,
        unit: 'g',
        notes: 'Patty wołowy premium 180g',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BUTTER,
        quantity: 20,
        unit: 'g',
        notes: 'Masło truflowe',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.ONION,
        quantity: 50,
        unit: 'g',
        notes: 'Cebula karmelizowana w masle',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 15,
    instructions:
      '1. Karmelizuj cebulę w masle\n2. Grilluj patty 180g\n3. Smaruj bułkę masłem truflowym\n4. Złóż burger',

    allergens: [Allergen.GLUTEN, Allergen.MILK, Allergen.EGGS],
    total_cost: 8.27, // 1×1.20 + 180×0.032 + 20×0.028 + 50×0.015
    cost_per_unit: 8.27,
    food_cost_percentage: 20.7, // 8.27 / 39.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Double Smash Burger
  {
    id: RECIPE_IDS.DOUBLE_SMASH,
    product_id: PRODUCT_IDS.DOUBLE_SMASH_BURGER,
    name: 'Double Smash Burger',
    description: 'Podwójny smash burger z chrupiącymi krawędziami',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BUNS,
        quantity: 1,
        unit: 'szt',
        notes: 'Bułka burgerowa',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BEEF,
        quantity: 300,
        unit: 'g',
        notes: '2× patty smash 150g',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.CHEDDAR,
        quantity: 60,
        unit: 'g',
        notes: '2× plaster cheddar',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.ONION,
        quantity: 30,
        unit: 'g',
        notes: 'Cebula karmelizowana',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 14,
    instructions:
      '1. Podziel mięso na 2 kulki po 150g\n2. Smash na gorącej płycie\n3. Dodaj ser na każdy patty\n4. Złóż: bułka → patty1+ser → patty2+ser → pikle → cebula → bułka',

    allergens: [Allergen.GLUTEN, Allergen.MILK, Allergen.EGGS],
    total_cost: 12.33, // 1×1.20 + 300×0.032 + 60×0.028 + 30×0.015
    cost_per_unit: 12.33,
    food_cost_percentage: 35.2, // 12.33 / 34.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // ── FRYTKI ────────────────────────────────────────────────────────

  // Classic Fries
  {
    id: RECIPE_IDS.FRIES,
    product_id: PRODUCT_IDS.CLASSIC_FRIES,
    name: 'Frytki klasyczne',
    description: 'Złociste, chrupiące frytki z solą morską',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.POTATOES,
        quantity: 250,
        unit: 'g',
        notes: 'Ziemniaki obrane i pokrojone',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.OIL,
        quantity: 50,
        unit: 'ml',
        notes: 'Olej do frytownicy',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 5,
    instructions: '1. Pokrój ziemniaki\n2. Smaż w 180°C przez 5-6 min\n3. Odsącz i posyp solą',

    allergens: [],
    total_cost: 1.15, // 250×0.003 + 50×0.008
    cost_per_unit: 1.15,
    food_cost_percentage: 8.9, // 1.15 / 12.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // ── SAŁATKI ───────────────────────────────────────────────────────

  // Caesar Salad
  {
    id: RECIPE_IDS.CAESAR_SALAD,
    product_id: PRODUCT_IDS.CAESAR_SALAD,
    name: 'Sałatka Cezar',
    description: 'Klasyczna sałatka Cezar z kurczakiem i parmezanem',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.LETTUCE,
        quantity: 150,
        unit: 'g',
        notes: 'Sałata rzymska',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.CHICKEN,
        quantity: 100,
        unit: 'g',
        notes: 'Grillowany filet z kurczaka',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.CHEDDAR,
        quantity: 20,
        unit: 'g',
        notes: 'Parmezan (zamiennik cheddar)',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 8,
    instructions:
      '1. Grilluj kurczaka\n2. Porwij sałatę\n3. Dodaj grzanki i ser\n4. Polej dressingiem cezar',

    allergens: [Allergen.GLUTEN, Allergen.MILK, Allergen.EGGS, Allergen.FISH],
    total_cost: 2.92, // 150×0.003(szt→approx) + 100×0.018 + 20×0.028
    cost_per_unit: 2.92,
    food_cost_percentage: 10.8, // 2.92 / 26.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Chicken Salad
  {
    id: RECIPE_IDS.CHICKEN_SALAD,
    product_id: PRODUCT_IDS.CHICKEN_SALAD,
    name: 'Sałatka z kurczakiem',
    description: 'Sałatka z grillowanym kurczakiem i dressingiem miodowo-musztardowym',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.CHICKEN,
        quantity: 150,
        unit: 'g',
        notes: 'Grillowany filet z kurczaka',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.LETTUCE,
        quantity: 100,
        unit: 'g',
        notes: 'Mix sałat',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.TOMATOES,
        quantity: 50,
        unit: 'g',
        notes: 'Pomidorki koktajlowe',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 10,
    instructions:
      '1. Grilluj kurczaka\n2. Pokrój warzywa\n3. Ułóż na talerzu\n4. Polej dressingiem',

    allergens: [],
    total_cost: 3.10, // 150×0.018 + 100×0.003 + 50×0.008
    cost_per_unit: 3.10,
    food_cost_percentage: 10.7, // 3.10 / 28.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // ── NAPOJE ────────────────────────────────────────────────────────

  // Cola
  {
    id: RECIPE_IDS.COLA,
    product_id: PRODUCT_IDS.COLA,
    name: 'Cola 0.5l',
    description: 'Klasyczna cola w puszce',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.COLA,
        quantity: 1,
        unit: 'szt',
        notes: 'Puszka cola 330ml',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 0,
    instructions: '1. Podaj schłodzoną',

    allergens: [],
    total_cost: 1.80,
    cost_per_unit: 1.80,
    food_cost_percentage: 25.8, // 1.80 / 6.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Lemonade
  {
    id: RECIPE_IDS.LEMONADE,
    product_id: PRODUCT_IDS.LEMONADE,
    name: 'Lemoniada domowa',
    description: 'Świeża lemoniada z cytryną i miętą',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.LEMONS,
        quantity: 2,
        unit: 'szt',
        notes: 'Cytryny świeże',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.WATER,
        quantity: 1,
        unit: 'szt',
        notes: 'Woda mineralna',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 2,
    instructions: '1. Wyciśnij cytryny\n2. Zmieszaj z wodą i cukrem\n3. Dodaj miętę i lód',

    allergens: [],
    total_cost: 2.80, // 2×0.80 + 1×1.20
    cost_per_unit: 2.80,
    food_cost_percentage: 28.0, // 2.80 / 9.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Water
  {
    id: RECIPE_IDS.WATER,
    product_id: PRODUCT_IDS.WATER,
    name: 'Woda mineralna 0.5l',
    description: 'Naturalna woda mineralna',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.WATER,
        quantity: 1,
        unit: 'szt',
        notes: 'Butelka wody 500ml',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 0,
    instructions: '1. Podaj schłodzoną',

    allergens: [],
    total_cost: 1.20,
    cost_per_unit: 1.20,
    food_cost_percentage: 24.0, // 1.20 / 4.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Latte
  {
    id: RECIPE_IDS.LATTE,
    product_id: PRODUCT_IDS.LATTE,
    name: 'Kawa latte',
    description: 'Aromatyczna kawa latte z mleczną pianką',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.MILK,
        quantity: 250,
        unit: 'ml',
        notes: 'Mleko spienione',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 3,
    instructions: '1. Zaparz espresso\n2. Spień mleko\n3. Polej espresso mlekiem',

    allergens: [Allergen.MILK],
    total_cost: 0.75, // 250×0.003
    cost_per_unit: 0.75,
    food_cost_percentage: 5.8, // 0.75 / 12.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // ── DESERY ────────────────────────────────────────────────────────

  // Brownie
  {
    id: RECIPE_IDS.BROWNIE,
    product_id: PRODUCT_IDS.BROWNIE,
    name: 'Brownie czekoladowe',
    description: 'Ciepłe, wilgotne brownie z belgijskiej czekolady',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.CHOCOLATE,
        quantity: 80,
        unit: 'g',
        notes: 'Czekolada deserowa belgijska',
      },
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.BUTTER,
        quantity: 50,
        unit: 'g',
        notes: 'Masło',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 2,
    instructions: '1. Podgrzej brownie\n2. Podaj z lodami waniliowymi',

    allergens: [Allergen.GLUTEN, Allergen.MILK, Allergen.EGGS, Allergen.SOYBEANS],
    total_cost: 4.20, // 80×0.035 + 50×0.028
    cost_per_unit: 4.20,
    food_cost_percentage: 28.0, // 4.20 / 14.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },

  // Ice Cream
  {
    id: RECIPE_IDS.ICE_CREAM,
    product_id: PRODUCT_IDS.ICE_CREAM,
    name: 'Lody 2 gałki',
    description: 'Dwie gałki rzemieślniczych lodów',
    product_category: ProductCategory.FINISHED_GOOD,

    ingredients: [
      {
        id: crypto.randomUUID(),
        type: 'stock_item' as const,
        reference_id: STOCK_ITEM_IDS.ICE_CREAM,
        quantity: 150,
        unit: 'ml',
        notes: 'Lody waniliowe/czekoladowe/truskawkowe',
      },
    ],

    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 2,
    instructions: '1. Nałóż 2 gałki lodów\n2. Podaj w pucharku',

    allergens: [Allergen.MILK, Allergen.EGGS],
    total_cost: 2.70, // 150×0.018
    cost_per_unit: 2.70,
    food_cost_percentage: 20.8, // 2.70 / 12.99

    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];
