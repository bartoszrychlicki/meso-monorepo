'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  compact?: boolean;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  className?: string;
}

export function KpiCard({
  icon,
  label,
  value,
  compact = false,
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn('overflow-hidden transition-all duration-200 hover:shadow-md', className)}
      data-component="kpi-card"
      data-field={label}
    >
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'flex items-center justify-center bg-primary/10 text-primary shadow-sm',
              compact ? 'h-9 w-9 rounded-md' : 'h-10 w-10 rounded-lg'
            )}
          >
            {icon}
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                trend.direction === 'up'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              )}
              data-status={trend.direction}
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.percentage}%
            </div>
          )}
        </div>
        <div className={compact ? 'mt-3' : 'mt-4'}>
          <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>{label}</p>
          <p className={cn('font-bold tracking-tight', compact ? 'text-xl' : 'text-2xl')}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
