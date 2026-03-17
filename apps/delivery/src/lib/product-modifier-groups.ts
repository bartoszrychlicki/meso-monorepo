import {
  syncProductModifierGroups,
  type ProductModifierLink,
  type SyncedMenuModifier,
} from '@meso/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Tables } from '@/lib/table-mapping'

type ProductWithModifierGroups = {
  id: string
  modifier_groups?: Array<{
    modifiers?: Array<{ id: string }>
  }> | null
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function extractModifierIds(products: ProductWithModifierGroups[]): string[] {
  return unique(
    products.flatMap((product) =>
      (product.modifier_groups ?? []).flatMap((group) =>
        (group.modifiers ?? []).map((modifier) => modifier.id)
      )
    )
  )
}

async function loadModifierState(
  supabase: SupabaseClient,
  products: ProductWithModifierGroups[]
): Promise<{
  links: ProductModifierLink[]
  modifiers: SyncedMenuModifier[]
}> {
  const productIds = unique(products.map((product) => product.id))
  const legacyModifierIds = extractModifierIds(products)

  const { data: linksData, error: linksError } = productIds.length
    ? await supabase
        .from(Tables.productModifiers)
        .select('product_id, modifier_id, sort_order')
        .in('product_id', productIds)
    : { data: [], error: null }

  if (linksError) {
    throw new Error(`Failed to load product modifiers: ${linksError.message}`)
  }

  const links = (linksData ?? []) as ProductModifierLink[]
  const modifierIds = unique([
    ...legacyModifierIds,
    ...links.map((link) => link.modifier_id),
  ])

  if (modifierIds.length === 0) {
    return { links, modifiers: [] }
  }

  const { data: modifiersData, error: modifiersError } = await supabase
    .from(Tables.modifiers)
    .select('id, name, price, is_available, modifier_action, sort_order')
    .in('id', modifierIds)

  if (modifiersError) {
    throw new Error(`Failed to load standalone modifiers: ${modifiersError.message}`)
  }

  return {
    links,
    modifiers: (modifiersData ?? []) as SyncedMenuModifier[],
  }
}

export async function syncProductsWithCurrentModifierState<T extends ProductWithModifierGroups>(
  supabase: SupabaseClient,
  products: T[]
): Promise<T[]> {
  if (products.length === 0) return products

  const { links, modifiers } = await loadModifierState(supabase, products)
  return syncProductModifierGroups(products, links, modifiers)
}

export async function syncProductWithCurrentModifierState<T extends ProductWithModifierGroups>(
  supabase: SupabaseClient,
  product: T
): Promise<T> {
  const [syncedProduct] = await syncProductsWithCurrentModifierState(supabase, [product])
  return syncedProduct ?? product
}
