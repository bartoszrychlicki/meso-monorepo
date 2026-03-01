'use client'

import { useState } from 'react'
import { Settings, Lock, Check, X } from 'lucide-react'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'

export default function OperatorSettingsPage() {
    const { changePin } = useOperatorAuthStore()

    const [oldPin, setOldPin] = useState('')
    const [newPin, setNewPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const handleChangePin = (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)

        if (newPin !== confirmPin) {
            setMessage({ type: 'error', text: 'Nowe PINy nie są identyczne' })
            return
        }

        if (!/^\d{4}$/.test(newPin)) {
            setMessage({ type: 'error', text: 'PIN musi składać się z 4 cyfr' })
            return
        }

        const result = changePin(oldPin, newPin)
        if (result.success) {
            setMessage({ type: 'success', text: 'PIN został zmieniony' })
            setOldPin('')
            setNewPin('')
            setConfirmPin('')
        } else {
            setMessage({ type: 'error', text: result.error || 'Błąd zmiany PINu' })
        }
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-meso-red-500" />
                Ustawienia
            </h1>

            <div className="max-w-md">
                <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center gap-2 mb-6">
                        <Lock className="w-5 h-5 text-white/60" />
                        <h2 className="text-lg font-medium text-white">Zmiana PIN-u</h2>
                    </div>

                    <form onSubmit={handleChangePin} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="oldPin" className="text-sm text-white/60">
                                Obecny PIN
                            </label>
                            <input
                                id="oldPin"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={oldPin}
                                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                                placeholder="****"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="newPin" className="text-sm text-white/60">
                                Nowy PIN
                            </label>
                            <input
                                id="newPin"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                                placeholder="****"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="confirmPin" className="text-sm text-white/60">
                                Potwierdź nowy PIN
                            </label>
                            <input
                                id="confirmPin"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                                placeholder="****"
                            />
                        </div>

                        {message && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                                message.type === 'success'
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-red-500/10 text-red-400'
                            }`}>
                                {message.type === 'success' ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <X className="w-4 h-4" />
                                )}
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-meso-red-500 hover:bg-meso-red-600 text-white font-bold h-12 rounded-xl transition-colors"
                        >
                            Zmień PIN
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
