'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Gift, Truck, Percent, UtensilsCrossed, ArrowLeft, Loader2, CircleHelp, Lock, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { LoginPrompt } from '@/components/auth'
import { cn } from '@/lib/utils'
import { useCustomerLoyalty } from '@/hooks/useCustomerLoyalty'
import { useLoyaltyRewards, type LoyaltyRewardRow } from '@/hooks/useLoyaltyRewards'
import { useAppConfig } from '@/hooks/useAppConfig'
import { toast } from 'sonner'
import type { LoyaltyTier } from '@/types/customer'

interface LoyaltyHistoryEntry {
  id: string
  label: string
  points: number
  type: string
  created_at: string
  order_id?: string | null
  is_pending_confirmation?: boolean
  pending_message?: string
}

const REWARD_ICONS: Record<string, typeof Gift> = {
  free_delivery: Truck,
  discount: Percent,
  free_product: UtensilsCrossed,
}

const DEFAULT_TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 500,
  gold: 1500,
}

const TIER_LABELS: Record<LoyaltyTier, string> = {
  bronze: 'Brązowy',
  silver: 'Srebrny',
  gold: 'Złoty',
}

const TIER_ORDER: LoyaltyTier[] = ['bronze', 'silver', 'gold']

const TIER_GRADIENTS: Record<LoyaltyTier, string> = {
  bronze: 'from-amber-800/80 via-amber-700/60 to-orange-900/50',
  silver: 'from-slate-400/80 via-slate-500/60 to-zinc-600/50',
  gold: 'from-yellow-500/80 via-amber-400/60 to-yellow-600/50',
}

function getTierFromLifetimePoints(
  lifetimePoints: number,
  thresholds: Record<LoyaltyTier, number>
): LoyaltyTier {
  if (lifetimePoints >= (thresholds.gold ?? 1500)) return 'gold'
  if (lifetimePoints >= (thresholds.silver ?? 500)) return 'silver'
  return 'bronze'
}

export default function LoyaltyPage() {
  const { isPermanent, isLoading: authLoading } = useAuth()
  const { points, lifetimePoints, isLoading: loyaltyLoading, refresh: refreshLoyalty } = useCustomerLoyalty()
  const { rewards, isLoading: rewardsLoading } = useLoyaltyRewards()
  const { getValue, isLoading: configLoading } = useAppConfig()
  const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards')
  const [history, setHistory] = useState<LoyaltyHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Activation state (merged from /account/club)
  const [redeemingReward, setRedeemingReward] = useState<string | null>(null)
  const [confirmReward, setConfirmReward] = useState<LoyaltyRewardRow | null>(null)
  const [activeCoupon, setActiveCoupon] = useState<{ id: string; code: string; expires_at: string } | null>(null)

  const loadHistory = useCallback(async (page = 0) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/loyalty/history?page=${page}`)
      const data = await res.json()
      setHistory(prev => page === 0 ? data.history : [...prev, ...data.history])
      setHasMore(data.hasMore)
      setHistoryPage(page)
    } catch {
      /* silent */
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'history') loadHistory(0)
  }, [activeTab, loadHistory])

  // Fetch active coupon on mount and sync to cart if needed
  useEffect(() => {
    if (!isPermanent) return
    async function syncActiveCoupon() {
      try {
        const res = await fetch('/api/loyalty/active-coupon')
        const { coupon } = await res.json()
        setActiveCoupon(coupon ?? null)

        // Re-sync: if DB has active coupon but cart doesn't, restore it
        if (coupon) {
          const { useCartStore } = await import('@/stores/cartStore')
          const storeCoupon = useCartStore.getState().loyaltyCoupon
          if (!storeCoupon) {
            useCartStore.getState().setLoyaltyCoupon(coupon)
          }
        }
      } catch { /* silent */ }
    }
    syncActiveCoupon()
  }, [isPermanent])

  const handleActivateCoupon = async (reward: LoyaltyRewardRow) => {
    setRedeemingReward(reward.id)
    try {
      const res = await fetch('/api/loyalty/activate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: reward.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Nie udało się aktywować kuponu')
        return
      }

      // Add coupon to cart store
      const { useCartStore } = await import('@/stores/cartStore')
      useCartStore.getState().setLoyaltyCoupon(data.coupon)

      toast.success(`Aktywowano kupon: ${reward.name}`, {
        description: 'Kupon został dodany do koszyka. Ważny 24h.',
      })

      // Update active coupon state so buttons become disabled
      setActiveCoupon(data.coupon)

      // Refresh points display
      refreshLoyalty()
      setConfirmReward(null)
    } catch {
      toast.error('Wystąpił błąd')
    } finally {
      setRedeemingReward(null)
    }
  }

  const isLoading = authLoading || loyaltyLoading || configLoading

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isPermanent) {
    return (
      <LoginPrompt
        icon="🏆"
        title="MESO POINTS"
        description="Zaloguj się, aby zbierać punkty i odbierać nagrody za każde zamówienie."
      />
    )
  }

  const tierThresholds = getValue<Record<LoyaltyTier, number>>('loyalty_tier_thresholds', DEFAULT_TIER_THRESHOLDS)

  const derivedTier = getTierFromLifetimePoints(lifetimePoints, tierThresholds)

  const currentTier = derivedTier
  const currentTierIdx = TIER_ORDER.indexOf(currentTier)
  const nextTier = currentTierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIdx + 1] : null
  const currentTierFloor = tierThresholds[currentTier] ?? 0
  const nextTierThreshold = nextTier ? (tierThresholds[nextTier] ?? currentTierFloor) : null
  const pointsToNextTier = nextTierThreshold != null ? Math.max(0, nextTierThreshold - lifetimePoints) : 0
  const tierProgress = nextTierThreshold != null
    ? Math.min(
      ((Math.max(lifetimePoints, currentTierFloor) - currentTierFloor) / Math.max(1, nextTierThreshold - currentTierFloor)) * 100,
      100
    )
    : 100

  const hasActiveCoupon = !!activeCoupon

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Back button */}
      <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Profil
      </Link>

      {/* Points Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 neon-glow', TIER_GRADIENTS[currentTier])}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div>
              <p className="text-sm text-white/70">MESO Club</p>
              <p className="font-display text-3xl font-bold text-white">{points.toLocaleString('pl-PL')}</p>
              <p className="text-xs text-white/55">Aktualnie dostępne punkty</p>
            </div>
          </div>

          {/* Loyalty level progress (based on total earned points) */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-1 font-medium text-white">
                  Poziom: {TIER_LABELS[currentTier]}
                </span>
                <div className="relative group">
                  <button
                    type="button"
                    aria-label="Informacja o poziomach MESO Club"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-6 z-10 w-72 rounded-lg border border-white/10 bg-background/95 p-2.5 text-[11px] leading-relaxed text-white/75 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    Wyższy poziom odblokowuje nowe rodzaje nagród do wyboru. Postęp poziomu liczymy na podstawie łącznej liczby zdobytych punktów (także już wykorzystanych).
                  </div>
                </div>
              </div>
              <span>
                {nextTier
                  ? `${pointsToNextTier} pkt do poziomu ${TIER_LABELS[nextTier]}`
                  : 'Maksymalny poziom osiągnięty'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tierProgress}%` }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                className="h-full rounded-full bg-white/80"
              />
            </div>
            <p className="text-[11px] text-white/55">
              Do poziomu liczymy łącznie zdobyte punkty: {lifetimePoints.toLocaleString('pl-PL')} pkt
            </p>
          </div>
        </div>
      </motion.div>

      {/* Active Coupon Banner */}
      {activeCoupon && (
        <div className="rounded-xl bg-meso-gold-400/10 border border-meso-gold-400/20 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-meso-gold-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-meso-gold-400">Masz aktywny kupon</p>
            <p className="text-xs text-white/60 mt-1">
              Użyj go lub poczekaj aż wygaśnie, zanim aktywujesz kolejny.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        <button
          onClick={() => setActiveTab('rewards')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            activeTab === 'rewards'
              ? 'bg-card text-foreground neon-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Nagrody
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            activeTab === 'history'
              ? 'bg-card text-foreground neon-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Historia
        </button>
      </div>

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {rewardsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rewards.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Brak dostępnych nagród</p>
          ) : (
            rewards.map((reward, i) => {
              const canAfford = points >= reward.points_cost
              const rewardTierIdx = TIER_ORDER.indexOf(reward.min_tier || 'bronze')
              const tierLocked = currentTierIdx < rewardTierIdx
              const canActivate = canAfford && !tierLocked && !hasActiveCoupon
              const isRedeeming = redeemingReward === reward.id
              const Icon = REWARD_ICONS[reward.reward_type] || Gift

              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border p-4 transition-colors',
                    tierLocked
                      ? 'border-border bg-card/50 opacity-50'
                      : canActivate
                        ? 'border-accent/30 bg-card hover:bg-card/80'
                        : 'border-border bg-card/50 opacity-60'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    tierLocked
                      ? 'bg-secondary'
                      : canActivate ? 'bg-accent/20' : 'bg-secondary'
                  )}>
                    {tierLocked ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Icon className={cn('h-5 w-5', canActivate ? 'text-accent' : 'text-muted-foreground')} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{reward.name}</p>
                      {tierLocked && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-medium">
                          Od {TIER_LABELS[reward.min_tier] || reward.min_tier}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{reward.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1">
                    <p className={cn(
                      'text-sm font-bold',
                      tierLocked
                        ? 'text-muted-foreground'
                        : canActivate ? 'text-accent' : 'text-muted-foreground'
                    )}>
                      {reward.points_cost} pkt
                    </p>
                    {tierLocked ? null : canActivate ? (
                      <Button
                        size="sm"
                        onClick={() => setConfirmReward(reward)}
                        disabled={isRedeeming}
                        className="bg-accent hover:bg-accent/90 text-black font-semibold"
                      >
                        {isRedeeming ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Aktywuj</>
                        )}
                      </Button>
                    ) : hasActiveCoupon ? null : (
                      <p className="text-xs text-muted-foreground">
                        Brakuje {reward.points_cost - points}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {historyLoading && history.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 && !historyLoading ? (
            <div className="py-12 text-center text-white/40 text-sm">
              Brak historii punktów
            </div>
          ) : (
            <div className="space-y-0">
              {history.map((entry) => {
                const isPendingConfirmation = entry.is_pending_confirmation || entry.type === 'pending_confirmation'

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center justify-between py-3 border-b',
                      isPendingConfirmation ? 'border-white/10 bg-white/[0.02]' : 'border-white/5'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-medium', isPendingConfirmation && 'text-white/70')}>
                          {entry.label}
                        </p>
                        {isPendingConfirmation && (
                          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
                            Tymczasowe
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40">
                        {new Date(entry.created_at).toLocaleDateString('pl-PL')}
                      </p>
                      {isPendingConfirmation && (
                        <p className="mt-1 text-xs text-white/50">
                          {entry.pending_message || 'Punkty w trakcie potwierdzania. Po odbiorze zamówienia naliczymy je automatycznie.'}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isPendingConfirmation
                          ? 'text-white/50'
                          : entry.points > 0
                            ? 'text-green-400'
                            : 'text-red-400'
                      )}
                    >
                      {entry.points > 0 ? '+' : ''}{entry.points} pkt
                    </span>
                  </div>
                )
              })}
              {hasMore && (
                <button
                  onClick={() => loadHistory(historyPage + 1)}
                  className="w-full py-3 text-sm text-white/50 hover:text-white"
                >
                  {historyLoading ? 'Ładowanie...' : 'Załaduj więcej'}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Confirmation Modal */}
      {confirmReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-meso-dark-800 p-6 space-y-4">
            <h3 className="text-lg font-bold">Aktywujesz kupon</h3>
            <p className="text-sm text-white/70">{confirmReward.name}</p>
            <p className="text-sm">Koszt: <span className="font-bold text-meso-gold-400">{confirmReward.points_cost} pkt</span></p>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-400">Punkty nie podlegają zwrotowi. Kupon ważny 24 godziny.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReward(null)}
                className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleActivateCoupon(confirmReward)}
                disabled={redeemingReward === confirmReward.id}
                className="flex-1 rounded-xl bg-meso-red-500 py-3 text-sm font-bold"
              >
                {redeemingReward === confirmReward.id ? 'Aktywowanie...' : 'Potwierdzam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
