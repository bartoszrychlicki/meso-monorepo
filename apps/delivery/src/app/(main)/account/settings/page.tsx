'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, Megaphone, Trash2, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function SettingsPage() {
    const { user, isLoading: authLoading, signOut } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [marketingConsent, setMarketingConsent] = useState(false)
    const [pushNotifications, setPushNotifications] = useState(false)

    useEffect(() => {
        async function fetchCustomer() {
            if (!user?.id) {
                setIsLoading(false)
                return
            }

            const supabase = createClient()
            const { data, error } = await supabase
                .from('crm_customers')
                .select('marketing_consent')
                .eq('id', user.id)
                .single()

            if (error) {
                console.error('Error fetching customer:', error)
            } else if (data) {
                setMarketingConsent(data.marketing_consent || false)
            }
            setIsLoading(false)
        }

        if (!authLoading) {
            fetchCustomer()
        }
    }, [user?.id, authLoading])

    const handleMarketingToggle = async (checked: boolean) => {
        setMarketingConsent(checked)

        if (!user?.id) return

        const supabase = createClient()
        const { error } = await supabase
            .from('crm_customers')
            .update({ marketing_consent: checked })
            .eq('id', user.id)

        if (error) {
            console.error('Error updating marketing consent:', error)
            toast.error('Nie udało się zaktualizować ustawień')
            setMarketingConsent(!checked) // Revert
        } else {
            toast.success(checked ? 'Marketing włączony' : 'Marketing wyłączony')
        }
    }

    const handleResetPassword = async () => {
        if (!user?.email) {
            toast.error('Brak adresu email')
            return
        }

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/callback?type=recovery`,
        })

        if (error) {
            console.error('Error sending reset email:', error)
            toast.error('Nie udało się wysłać emaila')
        } else {
            toast.success('Link do zmiany hasła wysłany na email')
        }
    }

    const handleDeleteAccount = async () => {
        toast.info('Skontaktuj się z nami aby usunąć konto: kontakt@mesofood.pl')
        await signOut()
    }

    if (authLoading || isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            {/* Back */}
            <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Profil
            </Link>

            <h1 className="font-display text-xl font-bold">Ustawienia</h1>

            {/* Notifications */}
            <div className="bg-card/50 rounded-xl p-5 border border-white/5 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Powiadomienia
                </h2>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white">Push notifications</p>
                        <p className="text-sm text-white/50">Statusy zamówień, promocje</p>
                    </div>
                    <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                        disabled // PWA push not implemented yet
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white flex items-center gap-2">
                            <Megaphone className="w-4 h-4" />
                            Marketing
                        </p>
                        <p className="text-sm text-white/50">Nowości, promocje, oferty specjalne</p>
                    </div>
                    <Switch
                        checked={marketingConsent}
                        onCheckedChange={handleMarketingToggle}
                    />
                </div>
            </div>

            {/* Security */}
            <div className="bg-card/50 rounded-xl p-5 border border-white/5 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    Bezpieczeństwo
                </h2>

                <Button
                    variant="outline"
                    onClick={handleResetPassword}
                    className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                    <Lock className="w-4 h-4 mr-2" />
                    Zmień hasło
                </Button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-950/20 rounded-xl p-5 border border-red-500/20 space-y-4">
                <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Strefa niebezpieczna
                </h2>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Usuń konto
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-background border-white/10">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Czy na pewno chcesz usunąć konto?</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/60">
                                Ta akcja jest nieodwracalna. Utracisz wszystkie punkty lojalnościowe, historię zamówień i zapisane adresy.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5">
                                Anuluj
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Usuń konto
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <p className="text-xs text-white/40 text-center">
                    W celu usunięcia konta skontaktuj się z nami: kontakt@mesofood.pl
                </p>
            </div>
        </div>
    )
}
