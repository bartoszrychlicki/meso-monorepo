'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, Megaphone, Trash2, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/table-mapping'
import { toast } from 'sonner'
import { useDeliveryI18n } from '@/lib/i18n/provider'
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
    const { locale, setLocale, t } = useDeliveryI18n()

    useEffect(() => {
        async function fetchCustomer() {
            if (!user?.id) {
                setIsLoading(false)
                return
            }

            const supabase = createClient()
            const { data, error } = await supabase
                .from(Tables.customers)
                .select('marketing_consent, ui_language')
                .eq('auth_id', user.id)
                .single()

            if (error) {
                console.error('Error fetching customer:', error)
            } else if (data) {
                setMarketingConsent(data.marketing_consent || false)
                if (data.ui_language) {
                    setLocale(data.ui_language)
                }
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
            .from(Tables.customers)
            .update({ marketing_consent: checked })
            .eq('auth_id', user.id)

        if (error) {
            console.error('Error updating marketing consent:', error)
            toast.error(t('account.settingsUpdateError'))
            setMarketingConsent(!checked) // Revert
        } else {
            toast.success(checked ? t('account.marketingEnabled') : t('account.marketingDisabled'))
        }
    }

    const handleLocaleChange = async (nextLocale: 'pl' | 'en') => {
        setLocale(nextLocale)

        if (!user?.id) {
            toast.success(t('account.languageUpdated'))
            return
        }

        const supabase = createClient()
        const { error } = await supabase
            .from(Tables.customers)
            .update({ ui_language: nextLocale })
            .eq('auth_id', user.id)

        if (error) {
            console.error('Error updating ui language:', error)
            toast.error(t('account.settingsUpdateError'))
            return
        }

        toast.success(t('account.languageUpdated'))
    }

    const handleResetPassword = async () => {
        if (!user?.email) {
            toast.error(t('account.emailMissing'))
            return
        }

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/callback?type=recovery`,
        })

        if (error) {
            console.error('Error sending reset email:', error)
            toast.error(t('account.resetPasswordEmailError'))
        } else {
            toast.success(t('account.resetPasswordEmailSent'))
        }
    }

    const handleDeleteAccount = async () => {
        toast.info(t('account.deleteToast'))
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
                {t('nav.profile')}
            </Link>

            <h1 className="font-display text-xl font-bold">{t('account.settingsTitle')}</h1>

            <div className="bg-card/50 rounded-xl p-5 border border-white/5 space-y-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">{t('account.language')}</h2>
                    <p className="text-sm text-white/50">{t('account.languageHelp')}</p>
                </div>

                <Select value={locale} onValueChange={(value) => handleLocaleChange(value as 'pl' | 'en')}>
                    <SelectTrigger className="w-full border-white/10 bg-background/60 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pl">{t('account.language.pl')}</SelectItem>
                        <SelectItem value="en">{t('account.language.en')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Notifications */}
            <div className="bg-card/50 rounded-xl p-5 border border-white/5 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    {t('account.notifications')}
                </h2>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white">{t('account.pushNotifications')}</p>
                        <p className="text-sm text-white/50">{t('account.pushNotificationsHelp')}</p>
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
                            {t('account.marketing')}
                        </p>
                        <p className="text-sm text-white/50">{t('account.marketingHelp')}</p>
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
                    {t('account.security')}
                </h2>

                <Button
                    variant="outline"
                    onClick={handleResetPassword}
                    className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                    <Lock className="w-4 h-4 mr-2" />
                    {t('account.changePassword')}
                </Button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-950/20 rounded-xl p-5 border border-red-500/20 space-y-4">
                <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    {t('account.dangerZone')}
                </h2>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('account.deleteAccount')}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-background border-white/10">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">{t('account.deletePrompt')}</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/60">
                                {t('account.deleteDescription')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5">
                                {t('common.cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {t('account.deleteAccount')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <p className="text-xs text-white/40 text-center">
                    {t('account.deleteContact')}
                </p>
            </div>
        </div>
    )
}
