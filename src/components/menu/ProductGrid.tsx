'use client'

import { ProductCard } from './ProductCard'
import { CategoryIcon } from '@/components/menu/CategoryIcon'

interface Product {
  id: string
  category_id: string
  name: string
  name_jp?: string
  slug: string
  description?: string
  price: number
  original_price?: number
  image_url?: string
  is_spicy?: boolean
  spice_level?: 1 | 2 | 3
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_bestseller?: boolean
  is_signature?: boolean
  is_new?: boolean
  has_variants?: boolean
  has_addons?: boolean
  has_spice_level?: boolean
}

interface Category {
  id: string
  name: string
  name_jp?: string
  slug: string
  icon?: string
}

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  activeCategory?: string
}

export function ProductGrid({ products, categories, activeCategory }: ProductGridProps) {
  // Filter products by active category
  const filteredProducts = activeCategory && activeCategory !== 'all'
    ? products.filter((p) => {
        const category = categories.find((c) => c.slug === activeCategory)
        return category && p.category_id === category.id
      })
    : products

  // If a specific category is selected, show products without headers
  if (activeCategory && activeCategory !== 'all') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    )
  }

  // Group products by category for "all" view
  const productsByCategory = categories.map((category) => ({
    category,
    products: products.filter((p) => p.category_id === category.id),
  })).filter((group) => group.products.length > 0)

  return (
    <div className="space-y-8">
      {productsByCategory.map(({ category, products: categoryProducts }) => (
        <section key={category.id} id={`category-${category.slug}`}>
          <div className="flex items-center gap-2 mb-4">
            {category.icon && <CategoryIcon name={category.icon} className="h-6 w-6" />}
            <div>
              <h2 className="text-xl font-bold text-white">
                {category.name}
              </h2>
              {category.name_jp && (
                <p className="text-sm text-white/50 font-japanese">
                  {category.name_jp}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
