'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ORDER_TIMELINE_STEPS, getTimelineStepIndex, type OrderStatus } from '@/types/order'

interface OrderTimelineProps {
    status: OrderStatus
    className?: string
}

export function OrderTimeline({ status, className }: OrderTimelineProps) {
    const currentStepIndex = getTimelineStepIndex(status)
    const isCancelled = status === 'cancelled'
    const isPendingPayment = status === 'pending_payment'

    if (isCancelled || isPendingPayment) {
        return (
            <div className={cn('rounded-lg bg-card p-4 text-center', className)}>
                <p className={cn(
                    'text-lg font-medium',
                    isCancelled ? 'text-red-500' : 'text-yellow-500'
                )}>
                    {isCancelled ? '❌ Zamówienie anulowane' : '💳 Oczekiwanie na płatność'}
                </p>
            </div>
        )
    }

    return (
        <div className={cn('w-full', className)}>
            <div className="flex items-center justify-between">
                {ORDER_TIMELINE_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex
                    const isCurrent = index === currentStepIndex
                    const isLast = index === ORDER_TIMELINE_STEPS.length - 1

                    return (
                        <div key={step.status} className="flex flex-1 items-center">
                            {/* Step circle */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300',
                                        isCompleted
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-zinc-600 bg-card text-zinc-500',
                                        isCurrent && 'ring-4 ring-ring/30 animate-pulse'
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <span className="text-xs font-bold">{index + 1}</span>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'mt-2 text-xs font-medium text-center max-w-[60px]',
                                        isCompleted ? 'text-primary' : 'text-zinc-500'
                                    )}
                                >
                                    {step.shortLabel}
                                </span>
                            </div>

                            {/* Connector line */}
                            {!isLast && (
                                <div className="flex-1 px-1">
                                    <div
                                        className={cn(
                                            'h-0.5 w-full transition-all duration-300',
                                            index < currentStepIndex
                                                ? 'bg-primary'
                                                : 'bg-zinc-700'
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
