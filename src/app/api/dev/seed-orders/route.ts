import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Only allow in development
const isDev = process.env.NODE_ENV !== 'production'

export async function GET() {
  if (!isDev) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // 1. Create or get test user
    const testEmail = 'test-operator@meso.dev'
    let customerId: string

    // Try to find existing customer first
    const { data: existingCustomer } = await supabase
      .from('crm_customers')
      .select('id')
      .eq('email', testEmail)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create auth user (triggers handle_new_user which creates customer)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'test-operator-123',
        email_confirm: true,
      })

      if (authError) {
        // User might exist in auth but not customers - try to find by auth
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existing = users?.find(u => u.email === testEmail)
        if (existing) {
          customerId = existing.id
          // Ensure customer record exists
          await supabase.from('crm_customers').upsert({
            id: existing.id,
            email: testEmail,
            first_name: 'Test',
            last_name: 'Operator',
            phone: '+48 500 000 000',
            loyalty_points: 50,
            loyalty_tier: 'bronze',
          }, { onConflict: 'id' })
        } else {
          return NextResponse.json({ error: 'Failed to create test user', details: authError.message }, { status: 500 })
        }
      } else {
        customerId = authData.user.id
        // Update customer name/phone
        await supabase.from('crm_customers').update({
          first_name: 'Test',
          last_name: 'Operator',
          phone: '+48 500 000 000',
        }).eq('id', customerId)
      }
    }

    // 2. Get default location
    const { data: location, error: locError } = await supabase
      .from('users_locations')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (locError || !location) {
      return NextResponse.json({ error: 'No default location found' }, { status: 500 })
    }

    // 3. Get products by slug
    const slugs = [
      'spicy-miso', 'tonkotsu-chashu', 'shoyu-chicken', 'vege-tantanmen',
      'gyoza-chicken', 'gyoza-shrimp', 'gyoza-vegan',
      'karaage-rice-teriyaki', 'edamame', 'ramune-original',
      'matcha-latte', 'yuzu-soda'
    ]

    const { data: products, error: prodError } = await supabase
      .from('menu_products')
      .select('id, slug, name, price')
      .in('slug', slugs)

    if (prodError || !products?.length) {
      return NextResponse.json({ error: 'No products found', details: prodError?.message }, { status: 500 })
    }

    const bySlug = (slug: string) => {
      const p = products.find(p => p.slug === slug)
      if (!p) throw new Error(`Product not found: ${slug}`)
      return p
    }

    // 4. Get "Large" variant from product variants (stored in menu_products.variants JSONB)
    // Since product_variants table is removed, we extract from the JSONB field
    const spicyMiso = bySlug('spicy-miso')
    const { data: productWithVariants } = await supabase
      .from('menu_products')
      .select('variants')
      .eq('id', spicyMiso.id)
      .single()

    const largeVariant = productWithVariants?.variants?.find((v: { name?: string; price_modifier?: number; id?: string }) => v.name?.toLowerCase().includes('duży')) || null

    // 5. Delete existing seed orders for this customer (idempotent)
    await supabase.from('orders_orders').delete().eq('customer_id', customerId)

    // 6. Insert orders
    const now = new Date()
    const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString()

    // Order 1: confirmed - 2x Spicy Miso (large) + 1x Gyoza chicken
    const sm = bySlug('spicy-miso')
    const gc = bySlug('gyoza-chicken')
    const smLargePrice = sm.price + (largeVariant?.price_modifier || 8)
    const order1Subtotal = smLargePrice * 2 + gc.price

    // Order 2: preparing - 1x Tonkotsu + 1x Edamame + 1x Ramune
    const tc = bySlug('tonkotsu-chashu')
    const ed = bySlug('edamame')
    const ra = bySlug('ramune-original')
    const order2Subtotal = tc.price + ed.price + ra.price

    // Order 3: ready - 1x Karaage Rice Teriyaki + 1x Matcha Latte
    const krt = bySlug('karaage-rice-teriyaki')
    const ml = bySlug('matcha-latte')
    const order3Subtotal = krt.price + ml.price

    // Order 4: in_delivery - 2x Shoyu Chicken + 1x Gyoza shrimp
    const sc = bySlug('shoyu-chicken')
    const gs = bySlug('gyoza-shrimp')
    const order4Subtotal = sc.price * 2 + gs.price

    // Order 5: delivered - 1x Vege Tantanmen + 1x Gyoza vegan + 1x Yuzu Soda
    const vt = bySlug('vege-tantanmen')
    const gv = bySlug('gyoza-vegan')
    const ys = bySlug('yuzu-soda')
    const order5Subtotal = vt.price + gv.price + ys.price

    const deliveryFee = 7.99
    const deliveryAddress = {
      street: 'ul. Testowa',
      building_number: '10',
      apartment_number: '5',
      city: 'Gdańsk',
      postal_code: '80-001',
    }

    const seedOrderNumber = (idx: number) => `SEED-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(idx).padStart(3,'0')}`

    const customerName = 'Test Operator'
    const customerPhone = '+48 500 000 000'

    const ordersToInsert = [
      {
        order_number: seedOrderNumber(1),
        channel: 'web',
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_id: location.id,
        status: 'confirmed',
        delivery_type: 'delivery',
        delivery_address: deliveryAddress,
        payment_method: 'blik',
        payment_status: 'paid',
        subtotal: order1Subtotal,
        delivery_fee: deliveryFee,
        promo_discount: 0,
        tip: 5,
        total: order1Subtotal + deliveryFee + 5,
        loyalty_points_earned: Math.floor(order1Subtotal),
        loyalty_points_used: 0,
        notes: 'Proszę o dodatkowe pałeczki',
        paid_at: minutesAgo(8),
        confirmed_at: minutesAgo(7),
        created_at: minutesAgo(8),
      },
      {
        order_number: seedOrderNumber(2),
        channel: 'web',
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_id: location.id,
        status: 'preparing',
        delivery_type: 'delivery',
        delivery_address: deliveryAddress,
        payment_method: 'card',
        payment_status: 'paid',
        subtotal: order2Subtotal,
        delivery_fee: deliveryFee,
        promo_discount: 0,
        tip: 0,
        total: order2Subtotal + deliveryFee,
        loyalty_points_earned: Math.floor(order2Subtotal),
        loyalty_points_used: 0,
        paid_at: minutesAgo(15),
        confirmed_at: minutesAgo(14),
        preparing_at: minutesAgo(12),
        created_at: minutesAgo(15),
      },
      {
        order_number: seedOrderNumber(3),
        channel: 'web',
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_id: location.id,
        status: 'ready',
        delivery_type: 'pickup',
        payment_method: 'blik',
        payment_status: 'paid',
        subtotal: order3Subtotal,
        delivery_fee: 0,
        promo_discount: 0,
        tip: 0,
        total: order3Subtotal,
        loyalty_points_earned: Math.floor(order3Subtotal),
        loyalty_points_used: 0,
        paid_at: minutesAgo(25),
        confirmed_at: minutesAgo(24),
        preparing_at: minutesAgo(22),
        ready_at: minutesAgo(10),
        created_at: minutesAgo(25),
      },
      {
        order_number: seedOrderNumber(4),
        channel: 'web',
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_id: location.id,
        status: 'in_delivery',
        delivery_type: 'delivery',
        delivery_address: { ...deliveryAddress, street: 'ul. Mariacka', building_number: '22' },
        payment_method: 'card',
        payment_status: 'paid',
        subtotal: order4Subtotal,
        delivery_fee: deliveryFee,
        promo_discount: 0,
        tip: 10,
        total: order4Subtotal + deliveryFee + 10,
        loyalty_points_earned: Math.floor(order4Subtotal),
        loyalty_points_used: 0,
        paid_at: minutesAgo(35),
        confirmed_at: minutesAgo(34),
        preparing_at: minutesAgo(30),
        ready_at: minutesAgo(20),
        picked_up_at: minutesAgo(15),
        created_at: minutesAgo(35),
      },
      {
        order_number: seedOrderNumber(5),
        channel: 'web',
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_id: location.id,
        status: 'delivered',
        delivery_type: 'delivery',
        delivery_address: { ...deliveryAddress, street: 'ul. Długie Pobrzeże', building_number: '3' },
        payment_method: 'blik',
        payment_status: 'paid',
        subtotal: order5Subtotal,
        delivery_fee: deliveryFee,
        promo_discount: 0,
        tip: 0,
        total: order5Subtotal + deliveryFee,
        loyalty_points_earned: Math.floor(order5Subtotal),
        loyalty_points_used: 0,
        paid_at: minutesAgo(60),
        confirmed_at: minutesAgo(59),
        preparing_at: minutesAgo(55),
        ready_at: minutesAgo(45),
        picked_up_at: minutesAgo(40),
        delivered_at: minutesAgo(30),
        created_at: minutesAgo(60),
      },
    ]

    const { data: insertedOrders, error: orderError } = await supabase
      .from('orders_orders')
      .insert(ordersToInsert)
      .select('id, status')

    if (orderError || !insertedOrders) {
      return NextResponse.json({ error: 'Failed to insert orders', details: orderError?.message }, { status: 500 })
    }

    // 7. Insert order items
    const orderItems = [
      // Order 1: confirmed - 2x Spicy Miso (large) + 1x Gyoza chicken
      {
        order_id: insertedOrders[0].id,
        product_id: sm.id,
        quantity: 2,
        unit_price: smLargePrice,
        spice_level: 2,
        variant_id: largeVariant?.id || null,
        variant_name: largeVariant?.name || 'Duży (550ml)',
        addons: [{ name: 'Jajko marynowane', price: 5 }],
        notes: 'Bez dymki',
        total_price: smLargePrice * 2 + 5 * 2,
      },
      {
        order_id: insertedOrders[0].id,
        product_id: gc.id,
        quantity: 1,
        unit_price: gc.price,
        addons: [],
        total_price: gc.price,
      },
      // Order 2: preparing - 1x Tonkotsu + 1x Edamame + 1x Ramune
      {
        order_id: insertedOrders[1].id,
        product_id: tc.id,
        quantity: 1,
        unit_price: tc.price,
        addons: [{ name: 'Extra chashu (2 plastry)', price: 12 }],
        total_price: tc.price + 12,
      },
      {
        order_id: insertedOrders[1].id,
        product_id: ed.id,
        quantity: 1,
        unit_price: ed.price,
        addons: [],
        total_price: ed.price,
      },
      {
        order_id: insertedOrders[1].id,
        product_id: ra.id,
        quantity: 1,
        unit_price: ra.price,
        addons: [],
        total_price: ra.price,
      },
      // Order 3: ready - 1x Karaage Rice Teriyaki + 1x Matcha Latte
      {
        order_id: insertedOrders[2].id,
        product_id: krt.id,
        quantity: 1,
        unit_price: krt.price,
        addons: [],
        total_price: krt.price,
      },
      {
        order_id: insertedOrders[2].id,
        product_id: ml.id,
        quantity: 1,
        unit_price: ml.price,
        addons: [],
        total_price: ml.price,
      },
      // Order 4: in_delivery - 2x Shoyu Chicken + 1x Gyoza shrimp
      {
        order_id: insertedOrders[3].id,
        product_id: sc.id,
        quantity: 2,
        unit_price: sc.price,
        addons: [],
        total_price: sc.price * 2,
      },
      {
        order_id: insertedOrders[3].id,
        product_id: gs.id,
        quantity: 1,
        unit_price: gs.price,
        addons: [],
        total_price: gs.price,
      },
      // Order 5: delivered - 1x Vege Tantanmen + 1x Gyoza vegan + 1x Yuzu Soda
      {
        order_id: insertedOrders[4].id,
        product_id: vt.id,
        quantity: 1,
        unit_price: vt.price,
        spice_level: 3,
        addons: [],
        total_price: vt.price,
      },
      {
        order_id: insertedOrders[4].id,
        product_id: gv.id,
        quantity: 1,
        unit_price: gv.price,
        addons: [],
        total_price: gv.price,
      },
      {
        order_id: insertedOrders[4].id,
        product_id: ys.id,
        quantity: 1,
        unit_price: ys.price,
        addons: [],
        total_price: ys.price,
      },
    ]

    const { error: itemsError } = await supabase
      .from('orders_order_items')
      .insert(orderItems)

    if (itemsError) {
      return NextResponse.json({
        error: 'Orders created but failed to insert items',
        orders: insertedOrders,
        details: itemsError.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Created ${insertedOrders.length} test orders with items`,
      orders: insertedOrders,
      customerId,
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
