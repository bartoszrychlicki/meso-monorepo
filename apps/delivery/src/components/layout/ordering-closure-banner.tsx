'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type DeliveryConfigRecord,
  formatOrderingPausedUntilDate,
  resolveOrderingAvailability,
} from '@/lib/location-config'
import { Tables } from '@/lib/table-mapping'

export function OrderingClosureBanner({
  config,
  now,
}: {
  config: DeliveryConfigRecord | null | undefined
  now?: Date
}) {
  const availability = resolveOrderingAvailability(config, now)

  if (
    !availability.isOrderingPaused ||
    !availability.orderingPausedUntilDate ||
    !availability.orderingPausedUntilTime
  ) {
    return null
  }

  return (
    <div className="border-b border-amber-400/20 bg-amber-400/10 text-amber-50">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-sm lg:px-6">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p className="flex-1 leading-6">
          Jestesmy aktualnie zamknieci. Przyjmujemy zamowienia z wyprzedzeniem na{' '}
          <span className="font-semibold text-amber-200">
            {formatOrderingPausedUntilDate(
              availability.orderingPausedUntilDate,
              availability.orderingPausedUntilTime
            )}
          </span>.
        </p>
        <CalendarClock className="mt-0.5 hidden h-4 w-4 shrink-0 text-amber-300 sm:block" />
      </div>
    </div>
  )
}

export function OrderingClosureBannerContainer() {
  const [config, setConfig] = useState<DeliveryConfigRecord | null>(null)

  useEffect(() => {
    let isCancelled = false

    const fetchOrderingConfig = async () => {
      const supabase = createClient()
      const { data: location } = await supabase
        .from(Tables.locations)
        .select('id')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true })
        .limit(1)
        .single()

      const activeLocationId = (location as { id?: string } | null)?.id

      if (!activeLocationId || isCancelled) {
        return
      }

      const { data: deliveryConfig } = await supabase
        .from(Tables.deliveryConfig)
        .select('opening_time, ordering_paused_until_date, ordering_paused_until_time')
        .eq('location_id', activeLocationId)
        .maybeSingle()

      if (!isCancelled) {
        setConfig((deliveryConfig as DeliveryConfigRecord | null) ?? null)
      }
    }

    void fetchOrderingConfig()

    return () => {
      isCancelled = true
    }
  }, [])

  return <OrderingClosureBanner config={config} />
}
