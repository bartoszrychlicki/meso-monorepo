import { createClient } from '@/lib/supabase/server'
import { Tables } from '@/lib/table-mapping'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: categories, error: catError } = await supabase
    .from(Tables.categories)
    .select('id, name, name_jp, slug, icon, description')
    .eq('is_active', true)
    .order('sort_order')

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 })
  }

  const { data: products, error: prodError } = await supabase
    .from(Tables.productsCatalog)
    .select(`
      id,
      category_id,
      name,
      name_jp,
      slug,
      description,
      price,
      original_price,
      promo_label,
      image_url,
      images,
      is_available,
      is_hidden_in_menu,
      is_vegetarian,
      is_vegan,
      is_bestseller,
      is_signature,
      is_new,
      has_variants,
      has_addons,
      allergens,
      tags,
      variants,
      modifier_groups
    `)
    .eq('is_active', true)
    .eq('is_hidden_in_menu', false)
    .order('sort_order')

  if (prodError) {
    return NextResponse.json({ error: prodError.message }, { status: 500 })
  }

  const safeCategories = categories || []
  const safeProducts = products || []

  // POS stores location address as JSONB, not flat columns
  // Also fetch delivery config from separate table
  const { data: location, error: locError } = await supabase
    .from(Tables.locations)
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
    .limit(1)
    .single()

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 })
  }

  // Fetch delivery config for this location
  const { data: deliveryConfig } = await supabase
    .from(Tables.deliveryConfig)
    .select('*')
    .eq('location_id', location.id)
    .single()

  return NextResponse.json({
    categories: safeCategories,
    products: safeProducts,
    location: {
      ...location,
      // Flatten JSONB address for backward compatibility with Delivery frontend
      address: typeof location.address === 'object' ? (location.address as Record<string, string>).street : location.address,
      city: typeof location.address === 'object' ? (location.address as Record<string, string>).city : undefined,
      postal_code: typeof location.address === 'object' ? (location.address as Record<string, string>).postal_code : undefined,
      // Merge delivery config into location for backward compatibility
      ...(deliveryConfig || {}),
      min_order_value: deliveryConfig?.min_order_amount,
    },
    meta: {
      totalProducts: safeProducts.length,
      totalCategories: safeCategories.length,
    }
  })
}
