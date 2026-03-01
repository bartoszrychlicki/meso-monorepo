'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { type ReactNode } from 'react'

interface LoginPromptProps {
  icon: ReactNode
  title: string
  description: string
}

export function LoginPrompt({ icon, title, description }: LoginPromptProps) {
  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center px-4 py-20 text-center min-h-[60vh]">
      <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-card/50 border border-primary/30 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(236,72,153,0.3)]">
        {icon}
      </div>
      <h1 className="font-display text-2xl font-bold tracking-wider uppercase mb-3">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        {description}
      </p>
      <Link href="/login">
        <button className="flex items-center gap-2 bg-accent text-accent-foreground font-display font-bold uppercase tracking-wider px-8 py-3 rounded-xl">
          <ArrowRight className="h-5 w-5" />
          ZALOGUJ SIĘ
        </button>
      </Link>
    </div>
  )
}
