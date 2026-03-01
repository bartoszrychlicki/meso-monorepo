'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/menu/CategoryIcon'

interface Category {
  id: string
  name: string
  slug: string
  icon?: string
}

interface MobileStickyHeaderProps {
  headerRef: React.RefObject<HTMLDivElement | null>
  categorySentinelRef: React.RefObject<HTMLDivElement | null>
  categories: Category[]
  activeCategoryId?: string
  onCategoryClick?: (catId: string) => void
}

export function MobileStickyHeader({
  headerRef,
  categorySentinelRef,
  categories,
  activeCategoryId,
  onCategoryClick,
}: MobileStickyHeaderProps) {
  const [showBar, setShowBar] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const headerEl = headerRef.current
    const catEl = categorySentinelRef.current
    if (!headerEl || !catEl) return

    const observers: IntersectionObserver[] = []

    const headerObs = new IntersectionObserver(
      ([entry]) => setShowBar(!entry.isIntersecting),
      { threshold: 0 }
    )
    headerObs.observe(headerEl)
    observers.push(headerObs)

    const catObs = new IntersectionObserver(
      ([entry]) => setShowCategories(!entry.isIntersecting),
      { threshold: 0 }
    )
    catObs.observe(catEl)
    observers.push(catObs)

    return () => observers.forEach((o) => o.disconnect())
  }, [headerRef, categorySentinelRef])

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!activeCategoryId || !tabsRef.current) return
    const activeTab = tabsRef.current.querySelector(
      `[data-cat="${activeCategoryId}"]`
    )
    activeTab?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeCategoryId])

  return (
    <AnimatePresence>
      {showBar && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed top-0 left-0 right-0 z-50 lg:hidden"
        >
          <div className="glass border-b border-border/50 shadow-lg shadow-background/50">
            {/* Row 1: Logo + Search */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Link
                href="/"
                className="font-display text-base font-bold tracking-widest text-primary neon-text shrink-0"
              >
                MESO
              </Link>
              <Link
                href="/search"
                className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm"
              >
                <Search className="h-4 w-4" />
                <span>Czego szukasz?</span>
              </Link>
            </div>

            {/* Row 2: Category tabs (progressive reveal) */}
            <AnimatePresence>
              {showCategories && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    ref={tabsRef}
                    className="flex gap-1 overflow-x-auto scrollbar-hide px-4 pb-2.5"
                  >
                    {categories.map((cat) => {
                      const active = activeCategoryId === cat.id
                      return (
                        <button
                          key={cat.id}
                          data-cat={cat.id}
                          onClick={() => onCategoryClick?.(cat.id)}
                          className={cn(
                            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                            active
                              ? 'bg-primary text-primary-foreground neon-glow-sm'
                              : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <CategoryIcon name={cat.icon} className="h-3 w-3" /> {cat.name}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
