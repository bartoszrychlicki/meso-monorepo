import { createClient } from '@/lib/supabase/server'
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
    .from('menu_products')
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

  // POS stores variants and modifier_groups as JSONB fields on the product
  // No need for separate table joins — they're already in product.variants and product.modifier_groups

  return <ProductDetailClient product={product} />
}
