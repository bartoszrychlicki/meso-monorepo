'use client'

import { useState, useRef, useEffect } from 'react'
import { ChefHat, Lock } from 'lucide-react'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'

export function OperatorPinLogin() {
    const { login } = useOperatorAuthStore()
    const [pin, setPin] = useState(['', '', '', ''])
    const [error, setError] = useState('')
    const [shake, setShake] = useState(false)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    useEffect(() => {
        inputRefs.current[0]?.focus()
    }, [])

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return

        const newPin = [...pin]
        newPin[index] = value.slice(-1)
        setPin(newPin)
        setError('')

        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus()
        }

        // Auto-submit when all digits entered
        if (value && index === 3) {
            const fullPin = newPin.join('')
            if (fullPin.length === 4) {
                const success = login(fullPin)
                if (!success) {
                    setError('Nieprawidłowy PIN')
                    setShake(true)
                    setTimeout(() => {
                        setShake(false)
                        setPin(['', '', '', ''])
                        inputRefs.current[0]?.focus()
                    }, 500)
                }
            }
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
        if (pasted.length === 4) {
            const newPin = pasted.split('')
            setPin(newPin)
            const success = login(pasted)
            if (!success) {
                setError('Nieprawidłowy PIN')
                setShake(true)
                setTimeout(() => {
                    setShake(false)
                    setPin(['', '', '', ''])
                    inputRefs.current[0]?.focus()
                }, 500)
            }
        }
    }

    return (
        <div className="min-h-screen bg-meso-dark-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-meso-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ChefHat className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">MESO Kitchen</h1>
                    <p className="text-white/50 mt-1">Kucharz Cyfrowy</p>
                </div>

                <div className="bg-meso-dark-800/50 rounded-2xl p-8 border border-white/5">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <Lock className="w-5 h-5 text-white/60" />
                        <span className="text-white/60 text-sm">Wprowadź PIN operatora</span>
                    </div>

                    <div
                        className={`flex justify-center gap-3 mb-6 ${shake ? 'animate-shake' : ''}`}
                        onPaste={handlePaste}
                    >
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el }}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-14 h-14 text-center text-2xl font-bold text-white bg-meso-dark-900 border-2 border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none transition-colors"
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}
                </div>

            </div>
        </div>
    )
}
