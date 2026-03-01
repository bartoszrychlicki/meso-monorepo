'use client'

import { Clock, CheckCircle, Package, Truck, CheckCircle2, XCircle, ChefHat, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ORDER_STATUS_STYLES, ORDER_STATUS_MESSAGES, type OrderStatus } from '@/types/order'

interface OrderStatusBadgeProps {
    status: OrderStatus
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
    showIcon = true,
    size = 'md',
    className
}: OrderStatusBadgeProps) {
    const style = ORDER_STATUS_STYLES[status]
    const message = ORDER_STATUS_MESSAGES[status]
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
            <span>{message.title.replace(/[🍜🛵💳✅👨‍🍳📦🔍🎉❌]/g, '').trim()}</span>
        </span>
    )
}
