'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Order, OrderItem, OrderStatus } from '@/types'
import { formatOrderDisplayId } from '@/lib/format-order-display-id'
import { toast } from 'sonner'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'

export interface OperatorOrder extends Order {
    items: (OrderItem & {
        product: {
            id: string
            name: string
            image_url: string | null
        }
        variant_name?: string | null
    })[]
    customer?: {
        name: string | null
        phone: string | null
    }
}

interface UseOperatorOrdersOptions {
    locationId?: string
}

export function useOperatorOrders(options: UseOperatorOrdersOptions = {}) {
    const [orders, setOrders] = useState<OperatorOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const { pin } = useOperatorAuthStore()

    // Initialize notification sound
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio('/sounds/new-order.mp3')
        }
    }, [])

    const playNotificationSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
        }
    }, [])

    const fetchOrders = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (options.locationId) params.set('locationId', options.locationId)

            const res = await fetch(`/api/operator/orders?${params}`, {
                headers: { 'x-operator-pin': pin },
            })

            if (!res.ok) {
                throw new Error('Nie udało się pobrać zamówień')
            }

            const data = await res.json()
            setOrders(data.orders)
            setError(null)
        } catch (err: unknown) {
            console.error('Error fetching orders:', err)
            setError(err instanceof Error ? err.message : 'Nie udało się pobrać zamówień')
        } finally {
            setIsLoading(false)
        }
    }, [options.locationId, pin])

    // Poll for updates (replaces realtime subscription since we use API routes now)
    useEffect(() => {
        fetchOrders()

        const interval = setInterval(fetchOrders, 5000) // Poll every 5s

        return () => clearInterval(interval)
    }, [fetchOrders])

    // Detect new orders for notification sound
    const prevOrderIdsRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        const currentIds = new Set(orders.map(o => o.id))
        const newConfirmed = orders.filter(
            o => o.status === 'confirmed' && !prevOrderIdsRef.current.has(o.id)
        )
        if (newConfirmed.length > 0 && prevOrderIdsRef.current.size > 0) {
            playNotificationSound()
            toast.success('Nowe zamówienie!', {
                description: `Zamówienie #${formatOrderDisplayId(newConfirmed[0].id, newConfirmed[0].order_number)}`,
            })
        }
        prevOrderIdsRef.current = currentIds
    }, [orders, playNotificationSound])

    // Update order status via API
    const updateOrderStatus = useCallback(async (
        orderId: string,
        newStatus: OrderStatus,
        timestampField?: string
    ) => {
        // Optimistic update
        setOrders(prev => prev.map(o =>
            o.id === orderId
                ? { ...o, status: newStatus, [timestampField || 'updated_at']: new Date().toISOString() }
                : o
        ))

        try {
            const res = await fetch('/api/operator/orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-operator-pin': pin,
                },
                body: JSON.stringify({ orderId, status: newStatus, timestampField }),
            })

            if (!res.ok) {
                throw new Error('Failed to update')
            }

            toast.success('Status zaktualizowany')
            return true
        } catch {
            toast.error('Nie udało się zaktualizować statusu')
            fetchOrders() // Revert
            return false
        }
    }, [fetchOrders, pin])

    const startPreparing = useCallback(async (orderId: string) => {
        return updateOrderStatus(orderId, 'preparing', 'preparing_at')
    }, [updateOrderStatus])

    const markAsReady = useCallback(async (orderId: string) => {
        return updateOrderStatus(orderId, 'ready', 'ready_at')
    }, [updateOrderStatus])

    const awaitingCourier = useCallback(async (orderId: string) => {
        return updateOrderStatus(orderId, 'awaiting_courier')
    }, [updateOrderStatus])

    const markAsInDelivery = useCallback(async (orderId: string) => {
        return updateOrderStatus(orderId, 'in_delivery', 'picked_up_at')
    }, [updateOrderStatus])

    const markAsDelivered = useCallback(async (orderId: string) => {
        return updateOrderStatus(orderId, 'delivered', 'delivered_at')
    }, [updateOrderStatus])

    const newOrders = orders.filter(o => o.status === 'confirmed')
    const preparingOrders = orders.filter(o => o.status === 'preparing')
    const readyOrders = orders.filter(o => ['ready', 'awaiting_courier'].includes(o.status))
    const inDeliveryOrders = orders.filter(o => o.status === 'in_delivery')
    const deliveredOrders = orders.filter(o => o.status === 'delivered')

    return {
        orders,
        newOrders,
        preparingOrders,
        readyOrders,
        inDeliveryOrders,
        deliveredOrders,
        isLoading,
        error,
        refetch: fetchOrders,
        startPreparing,
        markAsReady,
        awaitingCourier,
        markAsInDelivery,
        markAsDelivered,
    }
}

export function getOrderAge(createdAt: string): { minutes: number; label: string; isUrgent: boolean } {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const minutes = Math.floor(diffMs / 60000)

    let label: string
    if (minutes < 1) {
        label = 'Przed chwilą'
    } else if (minutes < 60) {
        label = `${minutes} min temu`
    } else {
        const hours = Math.floor(minutes / 60)
        label = `${hours}h ${minutes % 60}min temu`
    }

    return {
        minutes,
        label,
        isUrgent: minutes > 15,
    }
}
