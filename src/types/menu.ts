export interface Category {
  id: string
  name: string
  name_jp?: string
  slug: string
  icon?: string
  description?: string
  sort_order: number
  is_active: boolean
}

export interface Product {
  id: string
  category_id: string
  name: string
  name_jp?: string
  slug: string
  description?: string
  story?: string
  price: number
  original_price?: number
  image_url?: string
  prep_time_min: number
  prep_time_max: number
  calories?: number
  allergens: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  is_gluten_free: boolean
  is_spicy: boolean
  spice_level?: 1 | 2 | 3
  is_signature: boolean
  is_bestseller: boolean
  is_new: boolean
  is_limited: boolean
  is_active: boolean
  has_variants: boolean
  has_addons: boolean
  has_spice_level: boolean
  tags: string[]
  sort_order: number
  created_at: string
  updated_at?: string
  // Relations
  category?: Category
  variants?: ProductVariant[]
  addons?: Addon[]
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price_modifier: number
  is_default: boolean
  sort_order: number
}

export interface Addon {
  id: string
  name: string
  price: number
  is_active: boolean
}

export interface ProductAddon {
  product_id: string
  addon_id: string
  addon?: Addon
}

export const ALLERGENS = {
  gluten: 'Gluten',
  soy: 'Soja',
  sesame: 'Sezam',
  egg: 'Jajka',
  shellfish: 'Skorupiaki',
  fish: 'Ryby',
  milk: 'Mleko',
  celery: 'Seler',
} as const

export type AllergenKey = keyof typeof ALLERGENS
