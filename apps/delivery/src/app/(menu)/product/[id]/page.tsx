import { createClient } from '@/lib/supabase/server'
import { syncProductWithCurrentModifierState } from '@/lib/product-modifier-groups'
import { Tables } from '@/lib/table-mapping'
import { notFound } from 'next/navigation'
import { ProductDetailClient } from './ProductDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Try slug first, then UUID fallback
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const { data: product } = await supabase
    .from(Tables.products)
    .select(`
      *,
      category:menu_categories(id, name, slug, icon)
    `)
    .eq(isUUID ? 'id' : 'slug', id)
    .eq('is_active', true)
    .eq('is_available', true)
    .single()

  if (!product) {
    notFound()
  }

  const syncedProduct = await syncProductWithCurrentModifierState(supabase, product)

  // Extract addons from modifier_groups JSONB (same extraction as menu/[slug]/page.tsx)
  const modifierGroups = (syncedProduct.modifier_groups as Array<{
    id: string
    name: string
    type: string
    required: boolean
    min_selections: number
    max_selections: number
    modifiers: Array<{
      id: string
      name: string
      price: number
      is_available: boolean
      sort_order: number
    }>
  }>) || []

  const addons = modifierGroups
    .flatMap(group => group.modifiers || [])
    .filter(mod => mod.is_available)

  return <ProductDetailClient product={{ ...syncedProduct, addons }} />
}
