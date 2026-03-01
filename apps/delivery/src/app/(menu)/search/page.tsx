'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ProductCard } from '@/components/menu/ProductCard'

const PRODUCT_FIELDS = 'id, name, name_jp, slug, description, price, original_price, image_url, is_spicy, spice_level, is_vegetarian, is_vegan, is_bestseller, is_signature, is_new, has_variants, has_addons, has_spice_level'

interface Product {
  id: string
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

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    const supabase = createClient()
    const q = searchQuery.trim()
    const { data, error } = await supabase
      .from('menu_products')
      .select(`${PRODUCT_FIELDS}, categories!inner(name)`)
      .eq('is_active', true)
      .eq('is_available', true)
      .or(`name.ilike.%${q}%,name_jp.ilike.%${q}%,description.ilike.%${q}%,categories.name.ilike.%${q}%`)
      .limit(20)

    if (error) {
      console.error('Search error:', error)
      // Fallback: simpler query without join if the above fails
      const { data: fallback } = await supabase
        .from('menu_products')
        .select(PRODUCT_FIELDS)
        .eq('is_active', true)
        .eq('is_available', true)
        .or(`name.ilike.%${q}%,name_jp.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(20)
      setResults(fallback ?? [])
    } else {
      setResults(data ?? [])
    }
    setIsSearching(false)
  }, [])

  useEffect(() => {
    searchProducts(debouncedQuery) // eslint-disable-line react-hooks/set-state-in-effect
  }, [debouncedQuery, searchProducts])

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search Input */}
      <div className="max-w-[640px] mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Czego szukasz?"
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 neon-border"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Wpisz nazwę dania, składnik lub kategorię...
        </p>
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State - no query */}
      {!query && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-4 h-12 w-12 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">Wpisz nazwę dania, aby wyszukać</p>
        </div>
      )}

      {/* No Results */}
      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-4 h-12 w-12 text-muted-foreground/20" />
          <p className="text-sm font-medium">Brak wyników</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Spróbuj innej frazy wyszukiwania
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!isSearching && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {results.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProductCard product={product} quickAdd />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
