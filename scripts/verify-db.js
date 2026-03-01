/**
 * MESO Delivery - Database Verification Script
 * Weryfikuje czy wszystkie dane zostały poprawnie załadowane
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  console.log('🍜 MESO Delivery - Database Verification')
  console.log('=========================================\n')

  // Verify locations
  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('name, city, is_default')

  if (locErr) {
    console.error('❌ Locations error:', locErr.message)
  } else {
    console.log(`✅ Locations: ${locations.length}`)
    locations.forEach(l => console.log(`   - ${l.name} (${l.city}) ${l.is_default ? '⭐ Default' : ''}`))
  }

  // Verify categories
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('name, icon, slug')
    .order('sort_order')

  if (catErr) {
    console.error('❌ Categories error:', catErr.message)
  } else {
    console.log(`\n✅ Categories: ${categories.length}`)
    categories.forEach(c => console.log(`   ${c.icon} ${c.name} (/${c.slug})`))
  }

  // Verify products
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select(`
      name,
      price,
      is_bestseller,
      is_signature,
      is_spicy,
      categories (name)
    `)
    .order('sort_order')

  if (prodErr) {
    console.error('❌ Products error:', prodErr.message)
  } else {
    console.log(`\n✅ Products: ${products.length}`)
    products.forEach(p => {
      const badges = []
      if (p.is_bestseller) badges.push('🏆')
      if (p.is_signature) badges.push('⭐')
      if (p.is_spicy) badges.push('🔥')
      console.log(`   - ${p.name} (${p.price} zł) ${badges.join(' ')} [${p.categories?.name || 'N/A'}]`)
    })
  }

  // Verify addons
  const { data: addons, error: addErr } = await supabase
    .from('addons')
    .select('name, price')
    .order('sort_order')

  if (addErr) {
    console.error('❌ Addons error:', addErr.message)
  } else {
    console.log(`\n✅ Addons: ${addons.length}`)
    addons.forEach(a => console.log(`   + ${a.name} (+${a.price} zł)`))
  }

  // Verify product variants
  const { data: variants, error: varErr } = await supabase
    .from('product_variants')
    .select('name, price_modifier, products (name)')

  if (varErr) {
    console.error('❌ Variants error:', varErr.message)
  } else {
    console.log(`\n✅ Product Variants: ${variants.length}`)
    const uniqueVariants = [...new Set(variants.map(v => v.name))]
    uniqueVariants.forEach(v => console.log(`   📏 ${v}`))
  }

  // Verify promo codes
  const { data: promos, error: promoErr } = await supabase
    .from('promo_codes')
    .select('code, discount_type, discount_value, first_order_only')

  if (promoErr) {
    console.error('❌ Promo codes error:', promoErr.message)
  } else {
    console.log(`\n✅ Promo Codes: ${promos.length}`)
    promos.forEach(p => {
      const discount = p.discount_type === 'percent'
        ? `-${p.discount_value}%`
        : p.discount_type === 'free_delivery'
          ? '🚚 Free delivery'
          : p.discount_type === 'free_item'
            ? '🎁 Free item'
            : `-${p.discount_value} zł`
      console.log(`   🎟️ ${p.code}: ${discount} ${p.first_order_only ? '(first order)' : ''}`)
    })
  }

  // Verify product-addons connections
  const { data: productAddons, error: paErr } = await supabase
    .from('product_addons')
    .select('product_id, addon_id')

  if (paErr) {
    console.error('❌ Product-Addons error:', paErr.message)
  } else {
    console.log(`\n✅ Product-Addon connections: ${productAddons.length}`)
  }

  console.log('\n=========================================')
  console.log('🎉 Database verification complete!')
}

verify().catch(console.error)
