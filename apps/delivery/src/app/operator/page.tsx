'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OperatorPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/operator/orders')
    }, [router])

    return null
}
