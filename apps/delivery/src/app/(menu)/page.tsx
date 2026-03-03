import { createClient } from '@/lib/supabase/server'
import { MenuClient } from './MenuClient'

export const revalidate = 60

async function getMenuData() {
  const supabase = await createClient()

  const [categoriesResult, productsResult, locationResult, bannersResult] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, name_jp, slug, icon, description')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('menu_products')
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
      .eq('is_available', true)
      .order('sort_order'),
    supabase
      .from('users_locations')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true })
      .limit(1)
      .single(),
    supabase
      .from('promo_banners')
      .select('id, image_url, title, subtitle, href')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  let locationWithConfig = locationResult.data
  if (locationResult.data?.id) {
    const { data: deliveryConfig } = await supabase
      .from('orders_delivery_config')
      .select('*')
      .eq('location_id', locationResult.data.id)
      .maybeSingle()

    if (deliveryConfig) {
      locationWithConfig = {
        ...locationResult.data,
        ...deliveryConfig,
        // Backward compatibility for components still using old key name.
        min_order_value: deliveryConfig.min_order_amount,
      }
    }
  }

  return {
    categories: categoriesResult.data || [],
    products: productsResult.data || [],
    location: locationWithConfig,
    banners: bannersResult.data || [],
  }
}

export default async function MenuPage() {
  const { categories, products, location, banners } = await getMenuData()

  return (
    <div className="min-h-screen bg-background">
      {/* Menu content */}
      <MenuClient categories={categories} products={products} location={location} banners={banners} />
    </div>
  )
}
