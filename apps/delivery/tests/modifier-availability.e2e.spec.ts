import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { bypassGate, getAdminClient } from './helpers'

test.use({ channel: undefined })
test.setTimeout(120_000)

test.describe.serial('Delivery modifier availability', () => {
  const admin = getAdminClient()
  let productId: string | null = null
  let modifierGroupId: string | null = null
  const modifierIds: string[] = []

  test.afterEach(async () => {
    if (productId) {
      await admin.from('menu_products').delete().eq('id', productId)
      productId = null
    }

    if (modifierGroupId) {
      await admin.from('menu_modifier_groups').delete().eq('id', modifierGroupId)
      modifierGroupId = null
    }

    if (modifierIds.length > 0) {
      await admin.from('menu_modifiers').delete().in('id', modifierIds)
      modifierIds.length = 0
    }
  })

  test('shows only modifiers that are currently available', async ({ page }) => {
    const productSuffix = randomUUID().slice(0, 8)
    const activeModifierId = randomUUID()
    const inactiveModifierId = randomUUID()
    const groupId = randomUUID()
    const activeModifierName = `Aktywny dodatek ${productSuffix}`
    const inactiveModifierName = `Ukryty dodatek ${productSuffix}`
    const slug = `modifier-availability-${productSuffix}`

    modifierIds.push(activeModifierId, inactiveModifierId)
    modifierGroupId = groupId

    const { data: category } = await admin
      .from('menu_categories')
      .select('id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()

    expect(category?.id).toBeTruthy()

    const { error: activeModifierError } = await admin
      .from('menu_modifiers')
      .insert([
        {
          id: activeModifierId,
          name: activeModifierName,
          price: 4,
          is_available: true,
          modifier_action: 'add',
          sort_order: 0,
        },
        {
          id: inactiveModifierId,
          name: inactiveModifierName,
          price: 6,
          is_available: false,
          modifier_action: 'add',
          sort_order: 1,
        },
      ])

    expect(activeModifierError).toBeNull()

    const modifierGroupsSnapshot = [
      {
        id: groupId,
        name: 'Dodatki testowe',
        type: 'multiple',
        required: false,
        min_selections: 0,
        max_selections: 2,
        modifiers: [
          {
            id: activeModifierId,
            name: activeModifierName,
            price: 4,
            is_available: true,
            sort_order: 0,
            modifier_action: 'add',
          },
          {
            id: inactiveModifierId,
            name: inactiveModifierName,
            price: 6,
            is_available: true,
            sort_order: 1,
            modifier_action: 'add',
          },
        ],
      },
    ]

    const { error: modifierGroupError } = await admin
      .from('menu_modifier_groups')
      .insert({
        id: groupId,
        name: 'Dodatki testowe',
        type: 'multiple',
        required: false,
        min_selections: 0,
        max_selections: 2,
        modifiers: modifierGroupsSnapshot[0].modifiers,
      })

    expect(modifierGroupError).toBeNull()

    const { data: product, error: productError } = await admin
      .from('menu_products')
      .insert({
        name: `Produkt testowy ${productSuffix}`,
        slug,
        category_id: category!.id,
        type: 'single',
        price: 24,
        images: [],
        is_available: true,
        is_featured: false,
        allergens: [],
        variants: [],
        modifier_groups: modifierGroupsSnapshot,
        ingredients: [],
        sort_order: 999,
        sku: `E2E-MOD-${productSuffix.toUpperCase()}`,
        tax_rate: 8,
        is_active: true,
        point_ids: [],
        pricing: [],
      })
      .select('id')
      .single()

    expect(productError).toBeNull()
    expect(product?.id).toBeTruthy()
    productId = product!.id

    const { error: linkError } = await admin
      .from('product_modifiers')
      .insert([
        { product_id: productId, modifier_id: activeModifierId, sort_order: 0 },
        { product_id: productId, modifier_id: inactiveModifierId, sort_order: 1 },
      ])

    expect(linkError).toBeNull()

    const { error: productGroupLinkError } = await admin
      .from('product_modifier_groups')
      .insert({
        product_id: productId,
        group_id: groupId,
        sort_order: 0,
      })

    expect(productGroupLinkError).toBeNull()

    const { error: groupModifierLinkError } = await admin
      .from('modifier_group_modifiers')
      .insert([
        { group_id: groupId, modifier_id: activeModifierId, sort_order: 0 },
        { group_id: groupId, modifier_id: inactiveModifierId, sort_order: 1 },
      ])

    expect(groupModifierLinkError).toBeNull()

    await bypassGate(page)
    await page.goto(`/product/${slug}`, { timeout: 60_000 })

    await expect(page.getByRole('heading', { name: new RegExp(productSuffix, 'i') })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(activeModifierName, { exact: true })).toBeVisible()
    await expect(page.getByText(inactiveModifierName, { exact: true })).toHaveCount(0)
  })
})
