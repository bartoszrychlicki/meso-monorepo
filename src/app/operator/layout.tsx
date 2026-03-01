'use client'

import { useOperatorAuthStore } from '@/stores/operatorAuthStore'
import { OperatorHeader } from '@/components/operator/OperatorHeader'
import { OperatorPinLogin } from '@/components/operator/OperatorPinLogin'

export default function OperatorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isAuthenticated } = useOperatorAuthStore()

    if (!isAuthenticated) {
        return <OperatorPinLogin />
    }

    return (
        <div className="min-h-screen bg-meso-dark-950">
            <OperatorHeader />
            <main className="pb-20 md:pb-0">
                {children}
            </main>
        </div>
    )
}
