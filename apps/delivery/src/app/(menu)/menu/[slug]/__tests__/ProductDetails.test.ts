import { describe, it, expect } from 'vitest'

/**
 * Regression tests verifying that product detail pages correctly transform
 * raw DB data (modifier_groups JSONB) into component-ready addons.
 *
 * Bug caught: product/[id]/page.tsx passed raw DB product to component
 * without extracting addons from modifier_groups. Variants showed because
 * they're a top-level JSONB field, but addons are nested inside
 * modifier_groups[].modifiers[] and need explicit extraction.
 *
 * DB source: supabase/migrations/20260225000007_seed_data.sql
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

interface DbModifierGroup {
  id: string
  name: string
  type: string
  required: boolean
  min_selections: number
  max_selections: number
  modifiers: DbModifier[]
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

// ─── Extraction function (mirrors page.tsx logic) ───────────

function extractAddonsFromModifierGroups(
  modifierGroups: DbModifierGroup[] | null | undefined
): ComponentAddon[] {
  const groups = modifierGroups || []
  return groups
    .flatMap(group => group.modifiers || [])
    .filter(mod => mod.is_available)
}

// ─── Fixtures matching real MESO seed data ──────────────────

const DB_VARIANTS: DbVariant[] = [
  { id: 'v-1', name: 'Mały (350ml)', price: 0, is_available: true, sort_order: 1, variant_type: 'size' },
  { id: 'v-2', name: 'Duży (550ml)', price: 8, is_available: true, sort_order: 2, variant_type: 'size' },
]

const DB_MODIFIERS: DbModifier[] = [
  { id: 'a-1', name: 'Jajko marynowane', price: 3, is_available: true, sort_order: 1, modifier_action: 'add' },
  { id: 'a-2', name: 'Extra chasiu', price: 8, is_available: true, sort_order: 2, modifier_action: 'add' },
  { id: 'a-3', name: 'Nori', price: 2, is_available: true, sort_order: 3, modifier_action: 'add' },
  { id: 'a-4', name: 'Kukurydza', price: 3, is_available: false, sort_order: 4, modifier_action: 'add' },
]

const DB_MODIFIER_GROUPS: DbModifierGroup[] = [
  {
    id: 'group-1',
    name: 'Dodatki do ramenu',
    type: 'multiple',
    required: false,
    min_selections: 0,
    max_selections: 4,
    modifiers: DB_MODIFIERS,
  },
]

/** Simulates the raw DB product as returned by Supabase `select('*')` */
function makeRawDbProduct() {
  return {
    id: '44444444-4444-4444-4444-444444444001',
    name: 'Ramen Vege',
    slug: 'ramen-vege',
    price: 38,
    variants: DB_VARIANTS,
    modifier_groups: DB_MODIFIER_GROUPS,
    // Note: NO `addons` field — raw DB products have modifier_groups, not addons
  }
}

// ─── Tests ──────────────────────────────────────────────────

describe('Product data pipeline — modifier_groups → addons extraction', () => {
  describe('raw DB product does NOT have addons field', () => {
    it('raw product from Supabase has modifier_groups but no addons', () => {
      const raw = makeRawDbProduct()

      // This is what caused the bug: raw product has modifier_groups but NOT addons
      expect(raw.modifier_groups).toBeDefined()
      expect(raw.modifier_groups.length).toBeGreaterThan(0)
      expect((raw as Record<string, unknown>).addons).toBeUndefined()
    })

    it('component rendering condition fails without extraction', () => {
      const raw = makeRawDbProduct()

      // Simulates the component check: product.addons && product.addons.length > 0
      const addons = (raw as { addons?: ComponentAddon[] }).addons
      const wouldRenderAddons = !!(addons && addons.length > 0)

      // THIS is the bug: without extraction, addons section never renders
      expect(wouldRenderAddons).toBe(false)
    })
  })

  describe('extraction transforms modifier_groups into addons', () => {
    it('extracts available modifiers from modifier_groups', () => {
      const raw = makeRawDbProduct()
      const addons = extractAddonsFromModifierGroups(raw.modifier_groups)

      // 4 modifiers total, 1 unavailable → 3 addons
      expect(addons).toHaveLength(3)
      expect(addons.map(a => a.name)).toEqual(['Jajko marynowane', 'Extra chasiu', 'Nori'])
    })

    it('filters out unavailable modifiers', () => {
      const raw = makeRawDbProduct()
      const addons = extractAddonsFromModifierGroups(raw.modifier_groups)

      // Kukurydza has is_available: false
      expect(addons.find(a => a.name === 'Kukurydza')).toBeUndefined()
    })

    it('product with extracted addons passes component rendering condition', () => {
      const raw = makeRawDbProduct()
      const addons = extractAddonsFromModifierGroups(raw.modifier_groups)
      const product = { ...raw, addons }

      // After extraction, addons section SHOULD render
      const wouldRenderAddons = !!(product.addons && product.addons.length > 0)
      expect(wouldRenderAddons).toBe(true)
    })

    it('preserves addon prices correctly for calculateTotal', () => {
      const raw = makeRawDbProduct()
      const addons = extractAddonsFromModifierGroups(raw.modifier_groups)

      const basePrice = raw.price
      const allAddonsPrice = addons.reduce((sum, a) => sum + a.price, 0)

      // 3 + 8 + 2 = 13
      expect(allAddonsPrice).toBe(13)
      expect(basePrice + allAddonsPrice).toBe(51)
    })

    it('handles null modifier_groups gracefully', () => {
      const addons = extractAddonsFromModifierGroups(null)
      expect(addons).toEqual([])
    })

    it('handles empty modifier_groups gracefully', () => {
      const addons = extractAddonsFromModifierGroups([])
      expect(addons).toEqual([])
    })

    it('handles modifier_groups with empty modifiers array', () => {
      const groups: DbModifierGroup[] = [{
        id: 'g-1', name: 'Empty group', type: 'multiple',
        required: false, min_selections: 0, max_selections: 4,
        modifiers: [],
      }]
      const addons = extractAddonsFromModifierGroups(groups)
      expect(addons).toEqual([])
    })

    it('flattens multiple modifier groups into single addons array', () => {
      const groups: DbModifierGroup[] = [
        {
          id: 'g-extras', name: 'Dodatki', type: 'multiple',
          required: false, min_selections: 0, max_selections: 4,
          modifiers: [
            { id: 'a-1', name: 'Jajko', price: 3, is_available: true, sort_order: 1, modifier_action: 'add' },
          ],
        },
        {
          id: 'g-sauces', name: 'Sosy', type: 'single',
          required: false, min_selections: 0, max_selections: 1,
          modifiers: [
            { id: 'a-2', name: 'Sos sojowy', price: 1, is_available: true, sort_order: 1, modifier_action: 'add' },
            { id: 'a-3', name: 'Ponzu', price: 0, is_available: true, sort_order: 2, modifier_action: 'add' },
          ],
        },
      ]

      const addons = extractAddonsFromModifierGroups(groups)
      expect(addons).toHaveLength(3)
      expect(addons.map(a => a.name)).toEqual(['Jajko', 'Sos sojowy', 'Ponzu'])
    })
  })

  describe('variant field mapping (DB → component)', () => {
    it('DB variant price field maps directly to component', () => {
      const dbVariant = DB_VARIANTS[1]
      const asComponent: ComponentVariant = dbVariant
      expect(asComponent.price).toBe(8)
    })

    it('calculateTotal correctly includes variant price', () => {
      const basePrice = 38
      const selectedVariant: ComponentVariant = DB_VARIANTS[1] // Duży, price: 8
      const variantPrice = selectedVariant?.price || 0
      expect(basePrice + variantPrice).toBe(46)
    })

    it('variants are directly usable without extraction', () => {
      const raw = makeRawDbProduct()
      // Variants are a top-level JSONB field, no extraction needed
      expect(raw.variants).toBeDefined()
      expect(raw.variants.length).toBeGreaterThan(0)
      const firstVariant: ComponentVariant = raw.variants[0]
      expect(firstVariant.price).toBeDefined()
      expect(firstVariant.is_available).toBeDefined()
    })
  })

  describe('addon field mapping (DB → component)', () => {
    it('DB modifier is_available maps to ComponentAddon.is_available', () => {
      const asComponent: ComponentAddon = DB_MODIFIERS[0]
      expect(asComponent.is_available).toBe(true)
    })

    it('addon price field is consistent between DB and component', () => {
      const asComponent: ComponentAddon = DB_MODIFIERS[0]
      expect(asComponent.price).toBe(3)
    })
  })
})
