import { WastageRecord } from '@/types/inventory';
import { WastageCategory } from '@/types/enums';
import { WAREHOUSE_IDS, STOCK_ITEM_IDS } from './inventory';

/**
 * Example wastage/shrinkage records demonstrating all categories:
 * - EXPIRY: Past expiration date
 * - DAMAGE: Physical damage to product
 * - HUMAN_ERROR: Mistakes (dropped, spilled, wrong prep)
 * - THEFT: Stolen inventory
 * - PRODUCTION: Waste during production process
 * - OTHER: Miscellaneous losses
 */

const today = new Date();
const formatDate = (date: Date) => date.toISOString();

const daysAgo = (days: number): string => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return formatDate(date);
};

const hoursAgo = (hours: number): string => {
  const date = new Date(today);
  date.setHours(date.getHours() - hours);
  return formatDate(date);
};

export const wastageRecords: WastageRecord[] = [
  // EXPIRY - Expired lettuce
  {
    id: 'wastage-001',
    stock_item_id: STOCK_ITEM_IDS.LETTUCE,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_id: 'batch-009',            // Reference to expired batch from batches.ts
    category: WastageCategory.EXPIRY,
    quantity: 5,                       // 5 heads of lettuce
    cost_value: 17.5,                  // 5 × 3.5 PLN
    reason: 'Przeterminowane - data ważności: 2 dni temu. Sałata zwiędła.',
    reported_by: 'user-002',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },

  // EXPIRY - Expired milk
  {
    id: 'wastage-002',
    stock_item_id: STOCK_ITEM_IDS.MILK,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    category: WastageCategory.EXPIRY,
    quantity: 2000,                    // 2L milk
    cost_value: 6.0,                   // 2000ml × 0.003 PLN
    reason: 'Mleko po terminie ważności. Nieprzyjemny zapach.',
    reported_by: 'user-002',
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },

  // DAMAGE - Broken bottles
  {
    id: 'wastage-003',
    stock_item_id: STOCK_ITEM_IDS.COLA,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    category: WastageCategory.DAMAGE,
    quantity: 12,                      // 12 cans
    cost_value: 21.6,                  // 12 × 1.8 PLN
    reason: 'Uszkodzona paczka podczas rozładunku. Puszki wgniecione.',
    reported_by: 'user-002',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },

  // DAMAGE - Torn packaging
  {
    id: 'wastage-004',
    stock_item_id: STOCK_ITEM_IDS.BEEF,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    batch_id: 'batch-001',
    category: WastageCategory.DAMAGE,
    quantity: 500,                     // 500g beef
    cost_value: 16.0,                  // 500 × 0.032 PLN
    reason: 'Rozdarcie opakowania próżniowego. Mięso nie nadaje się do sprzedaży.',
    reported_by: 'user-002',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(6),
  },

  // HUMAN_ERROR - Dropped tray
  {
    id: 'wastage-005',
    stock_item_id: STOCK_ITEM_IDS.TOMATOES,
    warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    category: WastageCategory.HUMAN_ERROR,
    quantity: 1000,                    // 1kg tomatoes
    cost_value: 8.0,                   // 1000 × 0.008 PLN
    reason: 'Upuszczenie tacki z pomidorami. Pomidory zmiażdżone.',
    reported_by: 'user-003',
    created_at: hoursAgo(12),
    updated_at: hoursAgo(12),
  },

  // HUMAN_ERROR - Wrong temperature
  {
    id: 'wastage-006',
    stock_item_id: STOCK_ITEM_IDS.CHICKEN,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    category: WastageCategory.HUMAN_ERROR,
    quantity: 2000,                    // 2kg chicken
    cost_value: 36.0,                  // 2000 × 0.018 PLN
    reason: 'Pozostawione poza lodówką przez 4 godziny. Temperatura >8°C - konieczna utylizacja.',
    reported_by: 'user-002',
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },

  // THEFT - Missing inventory
  {
    id: 'wastage-007',
    stock_item_id: STOCK_ITEM_IDS.BACON,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    category: WastageCategory.THEFT,
    quantity: 500,                     // 500g bacon
    cost_value: 22.5,                  // 500 × 0.045 PLN
    reason: 'Brak towaru po inwentaryzacji. Podejrzenie kradzieży. Zgłoszono do przełożonego.',
    reported_by: 'user-002',
    approved_by: 'user-001',
    approved_at: daysAgo(6),
    created_at: daysAgo(7),
    updated_at: daysAgo(6),
  },

  // PRODUCTION - Trimming waste
  {
    id: 'wastage-008',
    stock_item_id: STOCK_ITEM_IDS.BEEF,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_SEMI,
    category: WastageCategory.PRODUCTION,
    quantity: 1500,                    // 1.5kg beef trimmings
    cost_value: 48.0,                  // 1500 × 0.032 PLN
    reason: 'Odpady produkcyjne - tłuszcz i ścięgna podczas przygotowania mięsa mielonego.',
    reported_by: 'user-002',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },

  // PRODUCTION - Cooking waste
  {
    id: 'wastage-009',
    stock_item_id: STOCK_ITEM_IDS.CHICKEN,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_SEMI,
    category: WastageCategory.PRODUCTION,
    quantity: 800,                     // 800g chicken
    cost_value: 14.4,                  // 800 × 0.018 PLN
    reason: 'Naturalna redukcja masy podczas gotowania (woda). Normalny proces produkcyjny.',
    reported_by: 'user-002',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },

  // OTHER - Power outage
  {
    id: 'wastage-010',
    stock_item_id: STOCK_ITEM_IDS.MILK,
    warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    category: WastageCategory.OTHER,
    quantity: 5000,                    // 5L milk
    cost_value: 15.0,                  // 5000 × 0.003 PLN
    reason: 'Awaria agregatu chłodniczego w food trucku (3h). Mleko osiągnęło temperaturę >10°C.',
    reported_by: 'user-003',
    approved_by: 'user-001',
    approved_at: daysAgo(8),
    created_at: daysAgo(9),
    updated_at: daysAgo(8),
  },

  // OTHER - Contamination
  {
    id: 'wastage-011',
    stock_item_id: STOCK_ITEM_IDS.LETTUCE,
    warehouse_id: WAREHOUSE_IDS.CENTRAL_RAW,
    category: WastageCategory.OTHER,
    quantity: 8,                       // 8 heads
    cost_value: 28.0,                  // 8 × 3.5 PLN
    reason: 'Zanieczyszczenie chemiczne - przypadkowe spryskanie środkiem czyszczącym.',
    reported_by: 'user-002',
    approved_by: 'user-001',
    approved_at: daysAgo(5),
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },

  // Recent DAMAGE - Today
  {
    id: 'wastage-012',
    stock_item_id: STOCK_ITEM_IDS.BUNS,
    warehouse_id: WAREHOUSE_IDS.FOOD_TRUCK,
    category: WastageCategory.DAMAGE,
    quantity: 10,                      // 10 buns
    cost_value: 12.0,                  // 10 × 1.2 PLN
    reason: 'Zgniecion podczas transportu w food trucku.',
    reported_by: 'user-003',
    created_at: hoursAgo(2),
    updated_at: hoursAgo(2),
  },
];
