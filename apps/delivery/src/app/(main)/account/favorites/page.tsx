'use client'

import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Back */}
      <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Profil
      </Link>

      <h1 className="font-display text-xl font-bold">Ulubione produkty</h1>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Heart className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Wkrótce dostępne</p>
      </div>
    </div>
  )
}
