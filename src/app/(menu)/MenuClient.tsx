'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Sparkles, RotateCcw } from 'lucide-react'
import { ProductCard, PromoCarousel } from '@/components/menu'
import { CategoryIcon } from '@/components/menu/CategoryIcon'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { MobileStickyHeader } from '@/components/layout/MobileStickyHeader'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/stores/cartStore'

interface Category {
  id: string
  name: string
  name_jp?: string
  slug: string
  icon?: string
  description?: string
}

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
  allergens?: string[]
  tags?: string[]
}

interface Location {
  id: string
  name: string
  delivery_time_min: number
  delivery_time_max: number
  min_order_value: number
  delivery_fee: number
}

export interface PromoBannerData {
  id: string
  image_url: string
  title: string
  subtitle: string | null
  href: string | null
}

interface MenuClientProps {
  categories: Category[]
  products: Product[]
  location?: Location | null
  banners?: PromoBannerData[]
}

export function MenuClient({ categories, products, location, banners }: MenuClientProps) {
  const { isPermanent } = useAuth()
  const setLocationConfig = useCartStore((s) => s.setLocationConfig)

  // Sync location config (min order, delivery fee) to cart store
  useEffect(() => {
    if (location) {
      setLocationConfig(location.min_order_value, location.delivery_fee)
    }
  }, [location, setLocationConfig])

  // Refs for sticky header
  const mobileHeaderRef = useRef<HTMLDivElement>(null)
  const categorySentinelRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>()

  // Promo products (with original_price discount)
  const promoProducts = products.filter(
    (p) => p.original_price && p.original_price > p.price
  )

  // Bestseller products for "previously ordered" mock
  const bestsellerProducts = products.filter((p) => p.is_bestseller)

  // Track which category section is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    categories.forEach((cat) => {
      const el = categoryRefs.current[cat.id]
      if (!el) return

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveCategoryId(cat.id)
          }
        },
        { threshold: 0, rootMargin: '-80px 0px -70% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [categories])

  const handleCategoryClick = useCallback((catId: string) => {
    const el = categoryRefs.current[catId]
    if (el) {
      const offset = 100
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  const setCategoryRef = useCallback(
    (catId: string, el: HTMLElement | null) => {
      categoryRefs.current[catId] = el
    },
    []
  )

  return (
    <div className="mx-auto max-w-7xl lg:flex lg:gap-6">
      {/* Mobile sticky header */}
      <MobileStickyHeader
        headerRef={mobileHeaderRef}
        categorySentinelRef={categorySentinelRef}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onCategoryClick={handleCategoryClick}
      />

      {/* Main content */}
      <div className="flex-1 px-4 py-4 lg:px-6">
        {/* Mobile header with logo + search */}
        <div
          ref={mobileHeaderRef}
          className="mb-4 flex items-center gap-3 lg:hidden"
        >
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-widest text-primary neon-text"
          >
            MESO
          </Link>
          <Link
            href="/search"
            className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground"
          >
            <Search className="h-4 w-4" />
            <span>Czego szukasz?</span>
          </Link>
        </div>

        {/* Promo Banner */}
        <PromoCarousel banners={banners} />

        {/* Ostatnio zamawiane (only for logged-in users) */}
        {isPermanent && bestsellerProducts.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold tracking-wider uppercase text-foreground">
                Ostatnio zamawiane
              </h2>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 xl:grid-cols-5 sm:overflow-x-visible sm:pb-0">
              {bestsellerProducts.slice(0, 5).map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 sm:flex-shrink"
                >
                  <ProductCard product={product} compact quickAdd />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Sentinel for category tabs reveal */}
        <div ref={categorySentinelRef} className="h-0" />

        {/* Promotions section */}
        {promoProducts.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-bold tracking-wider uppercase text-foreground">
                Aktualne promocje
              </h2>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 xl:grid-cols-5 sm:overflow-x-visible sm:pb-0">
              {promoProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 sm:flex-shrink"
                >
                  <ProductCard product={product} compact />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* All categories */}
        {categories
          .filter((c) => c.slug !== 'bestsellery')
          .map((cat) => {
            const catProducts = products.filter(
              (p) => p.category_id === cat.id
            )
            if (catProducts.length === 0) return null

            return (
              <section
                key={cat.id}
                ref={(el) => setCategoryRef(cat.id, el)}
                className="mb-8"
              >
                <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wider uppercase text-foreground">
                  <CategoryIcon name={cat.icon} className="h-4 w-4" />
                  {cat.name}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {catProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )
          })}
      </div>

      {/* Desktop cart sidebar */}
      <div className="hidden lg:block lg:w-80 xl:w-96">
        <CartSidebar />
      </div>
    </div>
  )
}
