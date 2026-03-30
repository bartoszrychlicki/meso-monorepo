'use client'

import Link from 'next/link'
import { User, MapPin, Heart, Settings, LogOut, ChevronRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth, useUserDisplay } from '@/hooks/useAuth'
import { LoginPrompt } from '@/components/auth'
import { cn } from '@/lib/utils'
import { useDeliveryI18n } from '@/lib/i18n/provider'

export default function AccountPage() {
  const { isLoading, isPermanent, signOut } = useAuth()
  const { displayName, avatarInitial, email } = useUserDisplay()
  const { t } = useDeliveryI18n()

  const MENU_ITEMS = [
    {
      icon: User,
      label: t('account.personal.label'),
      subtitle: t('account.personal.subtitle'),
      href: '/account/personal',
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
    {
      icon: MapPin,
      label: t('account.addresses.label'),
      subtitle: t('account.addresses.subtitle'),
      href: '/account/addresses',
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
    {
      icon: Heart,
      label: t('account.favorites.label'),
      subtitle: t('account.favorites.subtitle'),
      href: '/account/favorites',
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
    {
      icon: Settings,
      label: t('account.settings.label'),
      subtitle: t('account.settings.subtitle'),
      href: '/account/settings',
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isPermanent) {
      return (
        <LoginPrompt
          icon="👤"
        title={t('account.title')}
        description={t('account.description')}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* User Avatar + Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold',
          'bg-gradient-to-br from-primary/60 to-accent/40 text-primary-foreground neon-glow-sm'
        )}>
          {avatarInitial}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold italic">{displayName}</h2>
          {email && (
            <p className="text-sm text-muted-foreground">{email}</p>
          )}
        </div>
      </motion.div>

      {/* Profile Menu Items — each in its own card */}
      <div className="space-y-3">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (i + 1) }}
            >
              <Link
                href={item.href}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-card/80"
              >
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  item.bg
                )}>
                  <Icon className={cn('h-5 w-5', item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-destructive/30 hover:bg-card/80"
        >
          <LogOut className="h-5 w-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">{t('account.logout')}</span>
        </button>
      </motion.div>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground/40 pt-2">
        {t('account.version')}
      </p>
    </div>
  )
}
