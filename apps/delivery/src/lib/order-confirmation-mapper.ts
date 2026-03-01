import { getProductImageUrl } from '@/lib/product-image'
import type { CartItem, CartItemAddon } from '@/stores/cartStore'

type GenericRecord = Record<string, unknown>

function asObject(value: unknown): GenericRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as GenericRecord)
    : null
}

function asArray(value: unknown): GenericRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => asObject(entry))
    .filter((entry): entry is GenericRecord => entry !== null)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function getRawItems(order: GenericRecord): GenericRecord[] {
  const inlineItems = asArray(order.items)
  if (inlineItems.length > 0) return inlineItems
  return asArray(order.order_items)
}

function mapAddons(item: GenericRecord): CartItemAddon[] {
  const addons = asArray(item.addons)
  if (addons.length > 0) {
    return addons.map((addon, idx) => ({
      id: readString(addon.id) ?? `addon-${idx}`,
      name: readString(addon.name) ?? 'Dodatek',
      price: readNumber(addon.price),
    }))
  }

  const modifiers = asArray(item.modifiers)
  if (modifiers.length === 0) return []

  return modifiers.map((modifier, idx) => {
    const qty = Math.max(1, readNumber(modifier.quantity))
    return {
      id: readString(modifier.id) ?? readString(modifier.modifier_id) ?? `modifier-${idx}`,
      name: readString(modifier.name) ?? 'Dodatek',
      // Keep compatibility with existing itemTotal calculation in confirmation UI.
      price: readNumber(modifier.price) * qty,
    }
  })
}

function mapSpiceLevel(value: unknown): 1 | 2 | 3 | undefined {
  const level = readNumber(value)
  if (level === 1 || level === 2 || level === 3) return level
  return undefined
}

export function mapConfirmationItems(order: GenericRecord): CartItem[] {
  return getRawItems(order).map((item, idx) => {
    const product = asObject(item.product)

    return {
      id: readString(item.id) ?? `item-${idx}`,
      productId: readString(item.product_id) ?? '',
      name:
        readString(item.product_name) ??
        readString(product?.name) ??
        readString(item.custom_name) ??
        'Produkt',
      price: readNumber(item.unit_price ?? item.price),
      variantPrice: readNumber(item.variant_price),
      image: getProductImageUrl(product ?? undefined),
      quantity: Math.max(1, readNumber(item.quantity)),
      spiceLevel: mapSpiceLevel(item.spice_level),
      variantId: readString(item.variant_id),
      variantName: readString(item.variant_name),
      addons: mapAddons(item),
      notes: readString(item.notes),
    }
  })
}
