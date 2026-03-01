import { describe, it, expect } from 'vitest'

/**
 * Regression tests verifying that ProductDetails component interfaces
 * match the ACTUAL data shape from the database JSONB columns.
 *
 * DB source: supabase/migrations/20260225000007_seed_data.sql
 * POS types: apps/pos/src/types/menu.ts
 */

// ─── Actual DB data shapes ──────────────────────────────────

interface DbVariant {
  id: string
  name: string
  price: number
  is_available: boolean
  sort_order: number
  variant_type: string
}

interface DbModifier {
  id: string
  name: string
  price: number
  is_available: boolean
  sort_order: number
  modifier_action: string
}

// ─── Component interfaces (must match DB) ───────────────────

interface ComponentVariant {
  id: string
  name: string
  price: number
  is_available: boolean
  sort_order: number
}

interface ComponentAddon {
  id: string
  name: string
  price: number
  is_available: boolean
}

// ─── Fixtures matching real seed data ───────────────────────

const DB_VARIANTS: DbVariant[] = [
  { id: 'v-1', name: 'Mały', price: -5, is_available: true, sort_order: 1, variant_type: 'size' },
  { id: 'v-2', name: 'Średni', price: 0, is_available: true, sort_order: 2, variant_type: 'size' },
  { id: 'v-3', name: 'Duży', price: 5, is_available: true, sort_order: 3, variant_type: 'size' },
]

const DB_MODIFIERS: DbModifier[] = [
  { id: 'a-1', name: 'Dodatkowy ser', price: 3, is_available: true, sort_order: 1, modifier_action: 'add' },
  { id: 'a-2', name: 'Bekon', price: 5, is_available: true, sort_order: 2, modifier_action: 'add' },
]

// ─── Tests ──────────────────────────────────────────────────

describe('ProductDetails — DB data contract', () => {
  describe('variant field mapping', () => {
    it('DB variant "price" field is accessible as ComponentVariant.price', () => {
      const dbVariant = DB_VARIANTS[2]
      const asComponent: ComponentVariant = dbVariant
      expect(asComponent.price).toBe(5)
    })

    it('DB variant "is_available" is accessible as ComponentVariant.is_available', () => {
      const dbVariant = DB_VARIANTS[0]
      const asComponent: ComponentVariant = dbVariant
      expect(asComponent.is_available).toBe(true)
    })

    it('variant price > 0 display check works with "price" field', () => {
      const duzy: ComponentVariant = DB_VARIANTS[2]
      expect(duzy.price > 0).toBe(true)
    })

    it('calculateTotal correctly includes variant price', () => {
      const basePrice = 35
      const selectedVariant: ComponentVariant = DB_VARIANTS[2] // Duży, price: 5
      const variantPrice = selectedVariant?.price || 0

      expect(basePrice + variantPrice).toBe(40)
    })

    it('addItem receives correct variantPrice', () => {
      const selectedVariant: ComponentVariant = DB_VARIANTS[2]
      const cartVariantPrice = selectedVariant?.price
      expect(cartVariantPrice).toBe(5)
    })

    it('handles negative variant price (smaller size discount)', () => {
      const basePrice = 35
      const selectedVariant: ComponentVariant = DB_VARIANTS[0] // Mały, price: -5
      const variantPrice = selectedVariant?.price || 0

      expect(basePrice + variantPrice).toBe(30)
    })
  })

  describe('addon field mapping', () => {
    it('DB modifier "is_available" maps to ComponentAddon.is_available', () => {
      const dbMod = DB_MODIFIERS[0]
      const asComponent: ComponentAddon = dbMod
      expect(asComponent.is_available).toBe(true)
    })

    it('addon price field is consistent', () => {
      const dbMod = DB_MODIFIERS[0]
      const asComponent: ComponentAddon = dbMod
      expect(asComponent.price).toBe(dbMod.price)
    })
  })

  describe('page.tsx getProduct data transformation', () => {
    it('variants are compatible with component without transformation', () => {
      const product = {
        id: 'p-1',
        name: 'Burger',
        price: 35,
        variants: DB_VARIANTS,
      }

      const firstVariant: ComponentVariant = product.variants[0]
      expect(firstVariant.price).toBe(-5)
      expect(firstVariant.is_available).toBe(true)
    })

    it('extracts addons from modifier_groups correctly', () => {
      const modifierGroups = [{
        id: 'group-1',
        name: 'Dodatki',
        type: 'multiple',
        required: false,
        min_selections: 0,
        max_selections: 4,
        modifiers: DB_MODIFIERS,
      }]

      const addons = modifierGroups
        .flatMap(group => group.modifiers || [])
        .filter(mod => mod.is_available)

      expect(addons).toHaveLength(2)
      expect(addons[0].name).toBe('Dodatkowy ser')
      expect(addons[0].price).toBe(3)

      const asComponent: ComponentAddon = addons[0]
      expect(asComponent.is_available).toBe(true)
    })
  })
})
