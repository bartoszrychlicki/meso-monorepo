import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProductDetails } from './ProductDetails'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string) {
  const supabase = await createClient()

  // POS stores variants and modifier_groups (addons) as JSONB on the product
  const { data: product, error: productError } = await supabase
    .from('menu_products')
    .select(`
      *,
      category:menu_categories(id, name, name_jp, slug)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('is_available', true)
    .single()

  if (productError || !product) {
    return null
  }

  // Extract addons from modifier_groups JSONB
  // modifier_groups is an array of groups, each with a `modifiers` array
  const modifierGroups = (product.modifier_groups as Array<{
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

  return {
    ...product,
    addons,
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return { title: 'Nie znaleziono produktu' }
  }

  return {
    title: `${product.name} | MESO`,
    description: product.description,
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  return <ProductDetails product={product} />
}
