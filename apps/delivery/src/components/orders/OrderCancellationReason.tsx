'use client'

import { AlertTriangle } from 'lucide-react'

interface OrderCancellationReasonProps {
  reason?: string | null
}

export function OrderCancellationReason({ reason }: OrderCancellationReasonProps) {
  if (!reason?.trim()) {
    return null
  }

  return (
    <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4" data-component="order-cancellation-reason">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />
        <div>
          <h3 className="text-sm font-semibold text-red-300">Powód anulowania</h3>
          <p className="mt-1 text-sm text-red-100">{reason}</p>
        </div>
      </div>
    </section>
  )
}
