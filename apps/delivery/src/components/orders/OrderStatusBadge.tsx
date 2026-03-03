'use client'

import { Clock, CheckCircle, Package, Truck, CheckCircle2, XCircle, ChefHat, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOrderStatusMessage, getOrderStatusStyle } from '@/types/order'
import type { RawOrderStatus } from '@/lib/order-status'

interface OrderStatusBadgeProps {
    status: RawOrderStatus
    paymentStatus?: string
    showIcon?: boolean
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const iconMap = {
    Clock,
    CheckCircle,
    ChefHat,
    Package,
    Search,
    Truck,
    CheckCircle2,
    XCircle,
}

export function OrderStatusBadge({
    status,
    paymentStatus,
    showIcon = true,
    size = 'md',
    className
}: OrderStatusBadgeProps) {
    const style = getOrderStatusStyle(status, paymentStatus)
    const message = getOrderStatusMessage(status, paymentStatus)
    const IconComponent = iconMap[style.icon as keyof typeof iconMap] || Clock

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs gap-1',
        md: 'px-3 py-1 text-sm gap-1.5',
        lg: 'px-4 py-1.5 text-base gap-2',
    }

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    }

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full font-medium',
                style.color,
                style.bgColor,
                sizeClasses[size],
                className
            )}
        >
            {showIcon && <IconComponent className={iconSizes[size]} />}
            <span>{message.title.replace(/[🍜🛵💳✅👨‍🍳📦🔍🎉❌⏳ℹ️]/g, '').trim()}</span>
        </span>
    )
}
