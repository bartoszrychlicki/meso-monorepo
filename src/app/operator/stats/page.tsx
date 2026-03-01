'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, TrendingUp, Clock, Package, DollarSign, ChefHat, ShoppingCart, Truck, CheckCircle, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'

interface Stats {
    totalPaidOrders: number
    pendingPaymentOrders: number
    inProgressOrders: number
    deliveredOrders: number
    avgPrepTime: number
    totalRevenue: number
}

function getToday() {
    const d = new Date()
    return d.toISOString().slice(0, 10)
}

export default function OperatorStatsPage() {
    const [todayStats, setTodayStats] = useState<Stats | null>(null)
    const [rangeStats, setRangeStats] = useState<Stats | null>(null)
    const [isLoadingToday, setIsLoadingToday] = useState(true)
    const [isLoadingRange, setIsLoadingRange] = useState(false)

    const [dateFrom, setDateFrom] = useState(getToday())
    const [dateTo, setDateTo] = useState(getToday())

    const { pin } = useOperatorAuthStore()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateStats = (orders: any[]): Stats => {
        const paidOrders = orders.filter(o => o.payment_status === 'paid')
        const pendingPaymentOrders = orders.filter(o => o.payment_status === 'pending')
        const inProgressOrders = orders.filter(o =>
            ['confirmed', 'preparing', 'ready', 'awaiting_courier', 'in_delivery'].includes(o.status)
        )
        const deliveredOrders = orders.filter(o => o.status === 'delivered')

        const ordersWithPrepTime = orders.filter(o => o.confirmed_at && o.ready_at)
        let avgPrepTime = 0
        if (ordersWithPrepTime.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalPrepTime = ordersWithPrepTime.reduce((sum: number, o: any) => {
                const confirmed = new Date(o.confirmed_at).getTime()
                const ready = new Date(o.ready_at).getTime()
                return sum + (ready - confirmed)
            }, 0)
            avgPrepTime = Math.round(totalPrepTime / ordersWithPrepTime.length / 60000)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)

        return {
            totalPaidOrders: paidOrders.length,
            pendingPaymentOrders: pendingPaymentOrders.length,
            inProgressOrders: inProgressOrders.length,
            deliveredOrders: deliveredOrders.length,
            avgPrepTime,
            totalRevenue,
        }
    }

    const fetchOrdersForRange = useCallback(async (from: string, to: string) => {
        try {
            const res = await fetch(`/api/operator/stats?from=${from}&to=${to}`, {
                headers: { 'x-operator-pin': pin },
            })
            if (!res.ok) return null
            const data = await res.json()
            return calculateStats(data.orders || [])
        } catch (err) {
            console.error('Error fetching stats:', err)
            return null
        }
    }, [pin])

    // Fetch today's stats
    useEffect(() => {
        async function load() {
            const stats = await fetchOrdersForRange(getToday(), getToday())
            if (stats) setTodayStats(stats)
            setIsLoadingToday(false)
        }
        load()
        const interval = setInterval(load, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [fetchOrdersForRange])

    const handleRangeSearch = async () => {
        setIsLoadingRange(true)
        const stats = await fetchOrdersForRange(dateFrom, dateTo)
        if (stats) setRangeStats(stats)
        setIsLoadingRange(false)
    }

    if (isLoadingToday) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-meso-red-500" />
            </div>
        )
    }

    return (
        <div className="max-w-[1200px] mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-meso-red-500" />
                Statystyki dnia
            </h1>

            {/* Today's stats boxes */}
            <StatsGrid stats={todayStats} />

            {/* Detailed stats with date range */}
            <div className="mt-10">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-meso-red-500" />
                    Statystyki za okres
                </h2>

                {/* Date range picker */}
                <div className="flex flex-wrap items-end gap-3 mb-6">
                    <div>
                        <label className="block text-white/60 text-sm mb-1">Od</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-meso-dark-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-meso-red-500"
                        />
                    </div>
                    <div>
                        <label className="block text-white/60 text-sm mb-1">Do</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-meso-dark-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-meso-red-500"
                        />
                    </div>
                    <Button
                        onClick={handleRangeSearch}
                        disabled={isLoadingRange}
                        className="bg-meso-red-500 hover:bg-meso-red-600 text-white font-semibold h-10"
                    >
                        {isLoadingRange ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Pokaż
                    </Button>
                </div>

                {/* Range stats results */}
                {rangeStats ? (
                    <StatsGrid stats={rangeStats} />
                ) : (
                    <div className="bg-meso-dark-800/50 rounded-xl p-8 border border-white/5 text-center">
                        <CalendarDays className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40">Wybierz zakres dat i kliknij &quot;Pokaż&quot;</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatsGrid({ stats }: { stats: Stats | null }) {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
                icon={<ShoppingCart className="w-8 h-8" />}
                label="Zamówienia opłacone"
                description="Zamówienia z potwierdzoną płatnością"
                value={stats?.totalPaidOrders || 0}
                color="text-blue-500"
                bgColor="bg-blue-500/10"
            />

            <StatCard
                icon={<Truck className="w-8 h-8" />}
                label="W realizacji"
                description="Przyjęte, w przygotowaniu lub w dostawie"
                value={stats?.inProgressOrders || 0}
                color="text-orange-500"
                bgColor="bg-orange-500/10"
            />

            <StatCard
                icon={<CheckCircle className="w-8 h-8" />}
                label="Dostarczone"
                description="Zamówienia wydane klientom"
                value={stats?.deliveredOrders || 0}
                color="text-green-500"
                bgColor="bg-green-500/10"
            />

            <StatCard
                icon={<Clock className="w-8 h-8" />}
                label="Śr. czas przygotowania"
                description="Od przyjęcia do gotowości"
                value={stats?.avgPrepTime ? `${stats.avgPrepTime} min` : '-'}
                color="text-purple-500"
                bgColor="bg-purple-500/10"
            />

            <StatCard
                icon={<DollarSign className="w-8 h-8" />}
                label="Przychód"
                description="Suma opłaconych zamówień"
                value={`${(stats?.totalRevenue || 0).toFixed(2)} zł`}
                color="text-meso-gold-500"
                bgColor="bg-meso-gold-500/10"
            />
        </div>
    )
}

interface StatCardProps {
    icon: React.ReactNode
    label: string
    description?: string
    value: string | number
    color: string
    bgColor: string
}

function StatCard({ icon, label, description, value, color, bgColor }: StatCardProps) {
    return (
        <div className={`rounded-xl p-5 ${bgColor} border border-white/5`}>
            <div className={`${color} mb-3`}>{icon}</div>
            <p className="text-white/80 text-sm font-medium mb-0.5">{label}</p>
            {description && (
                <p className="text-white/40 text-xs mb-2">{description}</p>
            )}
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    )
}
