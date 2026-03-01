'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatters'
import { getProductImageUrl, PRODUCT_BLUR_PLACEHOLDER } from '@/lib/product-image'
import type { OrderItemWithProduct } from '@/types/order'

interface OrderItemsListProps {
    items: OrderItemWithProduct[]
    className?: string
}

export function OrderItemsList({ items, className }: OrderItemsListProps) {


    const getSpiceEmoji = (level: number) => {
        return level === 1 ? '🔥' : level === 2 ? '🔥🔥' : '🔥🔥🔥'
    }

    return (
        <div className={cn('space-y-3', className)}>
            {items.map((item) => (
                <div
                    key={item.id}
                    className="flex gap-3 rounded-lg bg-card p-3"
                >
                    {/* Product image */}
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-background">
                        {getProductImageUrl(item.product) ? (
                            <Image
                                src={getProductImageUrl(item.product)!}
                                alt={item.product?.name || 'Product'}
                                fill
                                className="object-cover"
                                sizes="64px"
                                placeholder="blur"
                                blurDataURL={PRODUCT_BLUR_PLACEHOLDER}
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="text-2xl">🍜</span>
                            </div>
                        )}
                    </div>

                    {/* Product details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-medium text-white">
                                    {item.product?.name || 'Produkt'}
                                </p>

                                {/* Variant and spice level */}
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {item.variant_name && (
                                        <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-0.5 rounded">
                                            {item.variant_name}
                                        </span>
                                    )}
                                    {item.spice_level && (
                                        <span className="text-xs">
                                            {getSpiceEmoji(item.spice_level)}
                                        </span>
                                    )}
                                </div>

                                {/* Addons */}
                                {item.addons && item.addons.length > 0 && (
                                    <p className="text-xs text-zinc-500 mt-1">
                                        + {item.addons.map(a => a.name).join(', ')}
                                    </p>
                                )}
                            </div>

                            {/* Quantity and price */}
                            <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-primary">
                                    {formatPrice(item.total_price)}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {item.quantity} × {formatPrice(item.unit_price)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
