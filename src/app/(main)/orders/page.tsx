'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Receipt } from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import { useAuth } from '@/hooks/useAuth'
import { OrderCard } from '@/components/orders'
import { Button } from '@/components/ui/button'
import { LoginPrompt } from '@/components/auth'

export default function OrdersPage() {
    const router = useRouter()
    const { isPermanent, isLoading: authLoading } = useAuth()
    const { orders, loading, error } = useOrders()

    if (authLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    if (!isPermanent) {
        return (
            <LoginPrompt
                icon={<Receipt className="w-12 h-12 text-primary" />}
                title="TWOJE ZAMÓWIENIA"
                description="Zaloguj się, aby zobaczyć historię zamówień i szybko zamawiać ponownie."
            />
        )
    }

    return (
        <div className="mx-auto max-w-2xl min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="px-4 py-4 space-y-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Menu
                </Link>
                <h1 className="font-display text-xl font-bold tracking-wider">
                    MOJE ZAMÓWIENIA
                </h1>
            </div>

            <main className="px-4 py-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="mt-4 text-zinc-400">Ładowanie zamówień...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-500 mb-4">{error}</p>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/10"
                        >
                            Spróbuj ponownie
                        </Button>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-6">
                            <Receipt className="w-10 h-10 text-zinc-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            Brak zamówień
                        </h2>
                        <p className="text-zinc-400 mb-6 max-w-sm">
                            Jeszcze nic nie zamawiałeś. Sprawdź nasze menu i złóż pierwsze zamówienie!
                        </p>
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            Przejdź do menu
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
