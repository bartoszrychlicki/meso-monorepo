/**
 * Loyalty Card Component
 *
 * Displays customer loyalty tier, points, and progress to next tier.
 */

'use client';

import { Customer } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, TrendingUp } from 'lucide-react';
import {
  getTierDisplayName,
  getTierColorClass,
  formatPoints,
  getPointsToNextTier,
  getTierProgress,
  getTierMultiplier,
} from '@/modules/crm/utils/loyalty-calculator';

interface LoyaltyCardProps {
  customer: Customer;
}

/**
 * Loyalty Card
 * Shows loyalty tier, points, and progress to next tier
 */
export function LoyaltyCard({ customer }: LoyaltyCardProps) {
  const pointsToNext = getPointsToNextTier(customer.loyalty_points);
  const progress = getTierProgress(customer.loyalty_points);
  const multiplier = getTierMultiplier(customer.loyalty_tier);

  return (
    <Card data-component="loyalty-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Program Lojalnościowy
          </CardTitle>
          <Badge
            className={getTierColorClass(customer.loyalty_tier)}
            data-status={customer.loyalty_tier}
          >
            {getTierDisplayName(customer.loyalty_tier)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Points */}
        <div className="text-center py-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Aktualne punkty</p>
          <p className="text-3xl font-bold" data-field="loyalty-points">
            {formatPoints(customer.loyalty_points)}
          </p>
        </div>

        {/* Tier Benefits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Mnożnik punktów:</span>
            <span className="font-bold">×{multiplier.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Za każdą złotówkę wydaną otrzymujesz{' '}
            <span className="font-medium">{multiplier.toFixed(2)} pkt</span>
          </p>
        </div>

        {/* Progress to Next Tier */}
        {pointsToNext !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Do następnego poziomu:</span>
              </div>
              <span className="font-bold">{formatPoints(pointsToNext)}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress.toFixed(0)}% ukończone
            </p>
          </div>
        )}

        {pointsToNext === null && (
          <div className="text-center py-2">
            <p className="text-sm font-medium text-green-600">
              🎉 Osiągnięto najwyższy poziom!
            </p>
          </div>
        )}

        {/* Tier Information */}
        <div className="pt-3 border-t space-y-1 text-xs text-muted-foreground">
          <p>
            <strong>Brąz:</strong> 0-499 pkt (×1.0)
          </p>
          <p>
            <strong>Srebro:</strong> 500-1499 pkt (×1.25)
          </p>
          <p>
            <strong>Złoto:</strong> 1500+ pkt (×1.5)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
