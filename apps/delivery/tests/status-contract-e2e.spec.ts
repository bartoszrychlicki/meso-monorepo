import { test, expect } from '@playwright/test'
import { getAdminClient, loginTestUser } from './helpers'

test.use({ channel: undefined })
test.setTimeout(120_000)

test.describe.serial('Delivery status contract compatibility', () => {
  let orderId: string | null = null

  test.afterEach(async () => {
    if (!orderId) return
    const admin = getAdminClient()
    await admin.from('orders_order_items').delete().eq('order_id', orderId)
    await admin.from('orders_orders').delete().eq('id', orderId)
    orderId = null
  })

  test('shows pending-payment presentation and canonical out_for_delivery transition', async ({ page }) => {
    const admin = getAdminClient()
    await loginTestUser(page)

    const { data: users } = await admin.auth.admin.listUsers()
    const testUser = users.users.find((user) => user.email === 'e2e-test@meso.dev')
    expect(testUser).toBeTruthy()

    const { data: location } = await admin
      .from('users_locations')
      .select('id')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    expect(location).toBeTruthy()

    const { data: product } = await admin
      .from('menu_products')
      .select('id, name, price')
      .eq('is_active', true)
      .eq('is_available', true)
      .limit(1)
      .single()
    expect(product).toBeTruthy()

    const createdAt = new Date().toISOString()
    const orderNumber = `WEB-${createdAt.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`
    const orderRow = {
      order_number: orderNumber,
      status: 'pending',
      channel: 'delivery_app',
      source: 'delivery',
      location_id: location!.id,
      customer_id: testUser!.id,
      customer_name: 'E2E Test',
      customer_phone: '+48500100200',
      delivery_type: 'delivery',
      payment_method: 'online',
      payment_status: 'pending',
      subtotal: product!.price,
      tax: Number((product!.price * 0.08).toFixed(2)),
      discount: 0,
      delivery_fee: 0,
      tip: 0,
      total: Number((product!.price * 1.08).toFixed(2)),
      items: [
        {
          id: `item-${Date.now()}`,
          product_id: product!.id,
          product_name: product!.name,
          quantity: 1,
          unit_price: product!.price,
          modifiers: [],
          subtotal: product!.price,
        },
      ],
      status_history: [{ status: 'pending', timestamp: createdAt, note: 'Created by e2e test' }],
      created_at: createdAt,
      updated_at: createdAt,
    }

    const { data: createdOrder, error: createOrderError } = await admin
      .from('orders_orders')
      .insert(orderRow)
      .select('*')
      .single()
    expect(createOrderError).toBeNull()
    expect(createdOrder).toBeTruthy()
    orderId = createdOrder!.id

    const { error: orderItemError } = await admin
      .from('orders_order_items')
      .insert({
        order_id: orderId,
        product_id: product!.id,
        quantity: 1,
        unit_price: product!.price,
        total_price: product!.price,
        addons: [],
      })
    expect(orderItemError).toBeNull()

    await page.goto(`/orders/${orderId}`, { timeout: 60_000 })
    await expect(
      page.getByRole('heading', { name: /Oczekujemy na płatność/i })
    ).toBeVisible({ timeout: 15_000 })

    await admin
      .from('orders_orders')
      .update({
        status: 'accepted',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    await expect(page.getByText(/Zamówienie przyjęte/i)).toBeVisible({ timeout: 15_000 })

    await admin
      .from('orders_orders')
      .update({
        status: 'out_for_delivery',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    await expect(page.getByText(/Kurier w drodze/i)).toBeVisible({ timeout: 15_000 })
  })
})
