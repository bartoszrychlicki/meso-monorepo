'use client'

import { CreditCard } from 'lucide-react'

export default function PaymentsPage() {
  return (
    <div className="mx-auto max-w-2xl flex flex-col items-center justify-center px-4 py-20 text-center">
      <CreditCard className="mb-4 h-16 w-16 text-muted-foreground/30" />
      <h2 className="mb-2 font-display text-lg font-semibold">Metody płatności</h2>
      <p className="text-sm text-muted-foreground">Wkrótce dostępne</p>
    </div>
  )
}
