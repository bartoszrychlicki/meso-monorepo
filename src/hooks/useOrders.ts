'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { OrderWithItems, OrderStatus } from '@/types/order'

interface UseOrdersOptions {
    status?: OrderStatus
    limit?: number
}

interface UseOrdersReturn {
    orders: OrderWithItems[]
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
    const { limit = 50 } = options
    const { user } = useAuth()
    const [orders, setOrders] = useState<OrderWithItems[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchOrders = useCallback(async () => {
        if (!user?.id) {
            setOrders([])
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            let query = supabase
                .from('orders_orders')
                .select(`
          *,
          items:orders_order_items(
            *,
            product:menu_products(id, name, image_url, images)
          ),
          location:users_locations(name, address, phone)
        `)
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (options.status) {
                query = query.eq('status', options.status)
            }

            const { data, error: fetchError } = await query

            if (fetchError) {
                console.error('Error fetching orders:', fetchError)
                setError('Nie udało się pobrać zamówień')
                return
            }

            setOrders((data || []) as OrderWithItems[])
        } catch (err) {
            console.error('Error fetching orders:', err)
            setError('Wystąpił błąd podczas pobierania zamówień')
        } finally {
            setLoading(false)
        }
    }, [user?.id, limit, options.status])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    return { orders, loading, error, refetch: fetchOrders }
}
