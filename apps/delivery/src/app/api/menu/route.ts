import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: categories, error: catError } = await supabase
    .from('menu_categories')
    .select('id, name, name_jp, slug, icon, description')
    .eq('is_active', true)
    .order('sort_order')

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 })
  }

  const { data: products, error: prodError } = await supabase
    .from('menu_products')
    .select(`
      id,
      category_id,
      name,
      name_jp,
      slug,
      description,
      price,
      image_url,
      images,
      is_spicy,
      spice_level,
      is_vegetarian,
      is_vegan,
      is_bestseller,
      is_signature,
      is_new,
      has_variants,
      has_addons,
      has_spice_level,
      allergens,
      tags,
      variants,
      modifier_groups
    `)
    .eq('is_active', true)
    .eq('is_available', true)
    .order('sort_order')

  if (prodError) {
    return NextResponse.json({ error: prodError.message }, { status: 500 })
  }

  // POS stores location address as JSONB, not flat columns
  // Also fetch delivery config from separate table
  const { data: location, error: locError } = await supabase
    .from('users_locations')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 })
  }

  // Fetch delivery config for this location
  const { data: deliveryConfig } = await supabase
    .from('orders_delivery_config')
    .select('*')
    .eq('location_id', location.id)
    .single()

  return NextResponse.json({
    categories,
    products,
    location: {
      ...location,
      // Flatten JSONB address for backward compatibility with Delivery frontend
      address: typeof location.address === 'object' ? (location.address as Record<string, string>).street : location.address,
      city: typeof location.address === 'object' ? (location.address as Record<string, string>).city : undefined,
      postal_code: typeof location.address === 'object' ? (location.address as Record<string, string>).postal_code : undefined,
      // Merge delivery config into location for backward compatibility
      ...(deliveryConfig || {}),
    },
    meta: {
      totalProducts: products.length,
      totalCategories: categories.length,
    }
  })
}
