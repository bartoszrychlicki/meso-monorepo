'use client'

import { useEffect, useState } from 'react'
import { MapPin, Clock, Truck, Store, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface LocationData {
  id: string
  name: string
  address: string
  city: string
  open_time: string
  close_time: string
  type: string | null
  is_active: boolean
}

function isLocationOpen(openTime: string, closeTime: string): boolean {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentMinutes = hours * 60 + minutes

  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('users_locations')
      .select('id, name, address, phone, type, is_active')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) {
          // POS stores address as JSONB; normalize for display
          setLocations(data.map((loc) => {
            const addr = typeof loc.address === 'object' && loc.address
              ? (loc.address as Record<string, string>)
              : null
            return {
              ...loc,
              address: addr?.street || String(loc.address || ''),
              city: addr?.city || '',
              open_time: '11:00:00',
              close_time: '22:00:00',
            } as LocationData
          }))
        }
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Menu
      </Link>

      <div>
        <h1 className="font-display text-xl font-bold">Nasze lokalizacje</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Znajdź najbliższy punkt MESO
        </p>
      </div>

      {/* Map Placeholder */}
      <div className="relative h-48 overflow-hidden rounded-xl border border-border bg-secondary">
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <MapPin className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm">Mapa wkrótce</p>
        </div>
      </div>

      {/* Location Cards */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : locations.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Brak dostępnych lokalizacji</p>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {locations.map((location) => {
            const locType = (location.type || 'restaurant') as 'food_truck' | 'restaurant'
            const isOpen = isLocationOpen(location.open_time, location.close_time)
            const hours = `${location.open_time.slice(0, 5)} - ${location.close_time.slice(0, 5)}`

            return (
              <motion.div
                key={location.id}
                variants={itemVariants}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-semibold">{location.name}</h3>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        locType === 'restaurant'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-accent/20 text-accent'
                      )}>
                        {locType === 'restaurant' ? (
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" /> Lokal
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Food Truck
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{location.address}, {location.city}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {hours}
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    'mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    isOpen
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  )}>
                    {isOpen ? 'Otwarte' : 'Zamknięte'}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
