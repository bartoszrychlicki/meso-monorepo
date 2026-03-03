'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getOrderStatusMessage, type OrderWithItems } from '@/types/order'
import { toDisplayOrderStatus } from '@/lib/order-status'

interface UseOrderDetailsReturn {
    order: OrderWithItems | null
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

export function useOrderDetails(orderId: number | string): UseOrderDetailsReturn {
    const [order, setOrder] = useState<OrderWithItems | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchOrder = useCallback(async () => {
        if (!orderId) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const { data, error: fetchError } = await supabase
                .from('orders_orders')
                .select(`
          *,
          items:orders_order_items(
            *,
            product:menu_products(id, name, image_url, images)
          ),
          location:users_locations(name, address, phone)
        `)
                .eq('id', orderId)
                .single()

            if (fetchError) {
                console.error('Error fetching order:', fetchError)
                setError('Nie udało się pobrać zamówienia')
                return
            }

            setOrder(data as OrderWithItems)
        } catch (err) {
            console.error('Error fetching order:', err)
            setError('Wystąpił błąd podczas pobierania zamówienia')
        } finally {
            setLoading(false)
        }
    }, [orderId])

    // Initial fetch
    useEffect(() => {
        fetchOrder()
    }, [fetchOrder])

    // Real-time subscription
    useEffect(() => {
        if (!orderId) return

        const supabase = createClient()

        const channel = supabase
            .channel(`order-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders_orders',
                    filter: `id=eq.${orderId}`,
                },
                (payload: { new: Record<string, unknown> }) => {
                    console.log('Order updated:', payload.new)
                    setOrder((prev) => {
                        if (!prev) return null
                        return { ...prev, ...payload.new } as OrderWithItems
                    })

                    // Show toast notification for status changes
                    const newStatus = (payload.new as { status?: string }).status
                    const newPaymentStatus = (payload.new as { payment_status?: string }).payment_status
                    if (newStatus) {
                        const displayStatus = toDisplayOrderStatus(newStatus, newPaymentStatus)
                        if (displayStatus === 'unknown') {
                            toast.info('Status zamówienia został zaktualizowany')
                        } else {
                            const message = getOrderStatusMessage(newStatus, newPaymentStatus)
                            toast.info(message.title)
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orderId])

    return { order, loading, error, refetch: fetchOrder }
}
