'use client'

import Link from 'next/link'
import { Crown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCustomerLoyalty } from '@/hooks/useCustomerLoyalty'
import { useLoyaltyRewards } from '@/hooks/useLoyaltyRewards'

export function LoyaltyBox() {
  const { isPermanent } = useAuth()
  const { points, isLoading: loyaltyLoading } = useCustomerLoyalty()
  const { rewards, isLoading: rewardsLoading } = useLoyaltyRewards()

  if (!isPermanent) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-5 w-5 text-accent" />
          <span className="font-display text-xs font-bold tracking-wider text-accent">
            MESO CLUB
          </span>
        </div>
        <p className="text-sm text-foreground font-medium mb-1">
          Zbieraj punkty, odbieraj nagrody
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Darmowe dania, zniżki i ekskluzywne oferty czekają na Ciebie.
        </p>
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary py-2.5 text-center text-xs font-semibold text-primary-foreground transition-all neon-glow-sm hover:scale-[1.02]"
        >
          Zarejestruj się i odbieraj darmowe jedzenie
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  const isLoading = loyaltyLoading || rewardsLoading

  // Find the next reward the user can't yet afford
  const nextReward = rewards.find((r) => r.points_cost > points)
  const nextRewardCost = nextReward?.points_cost ?? (rewards.length > 0 ? rewards[rewards.length - 1].points_cost : 500)
  const progress = Math.min((points / nextRewardCost) * 100, 100)

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-accent" />
        <span className="font-display text-xs font-bold tracking-wider text-accent">
          MESO CLUB
        </span>
      </div>

      {isLoading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-lg font-display font-bold text-foreground">
              {points}{' '}
              <span className="text-xs text-muted-foreground font-sans font-normal">
                pkt
              </span>
            </span>
            {nextReward ? (
              nextReward.points_cost - points === 0 ? (
                <span className="text-xs text-primary font-medium">
                  Możesz odebrać!
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  do nagrody: {nextReward.points_cost - points} pkt
                </span>
              )
            ) : (
              <span className="text-xs text-primary font-medium">
                Masz nagrodę do odebrania!
              </span>
            )}
          </div>

          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 neon-glow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          <Link href="/loyalty" className="text-xs text-primary hover:underline">
            Zobacz nagrody
          </Link>
        </>
      )}
    </div>
  )
}
