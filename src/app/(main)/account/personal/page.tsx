'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { LoginPrompt } from '@/components/auth'
import { toast } from 'sonner'

interface PersonalData {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthday: string
}

export default function PersonalPage() {
  const { user, isPermanent, isLoading: authLoading } = useAuth()
  const [form, setForm] = useState<PersonalData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthday: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [birthdayError, setBirthdayError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !isPermanent) {
      setIsLoadingData(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    async function loadData() {
      const supabase = createClient()
      const { data } = await supabase
        .from('crm_customers')
        .select('first_name, last_name, email, phone, birth_date')
        .eq('id', user!.id)
        .single()

      if (data) {
        setForm({
          firstName: data.first_name ?? '',
          lastName: data.last_name ?? '',
          email: data.email ?? user!.email ?? '',
          phone: data.phone ?? '',
          birthday: data.birth_date ?? '',
        })
      } else {
        setForm((prev) => ({ ...prev, email: user!.email ?? '' }))
      }
      setIsLoadingData(false)
    }

    loadData()
  }, [user, isPermanent])

  const handleSave = async () => {
    if (!user) return

    if (form.birthday && form.birthday > new Date().toISOString().split('T')[0]) {
      setBirthdayError('Data urodzenia nie może być w przyszłości')
      toast.error('Data urodzenia nie może być w przyszłości')
      return
    }
    setBirthdayError(null)

    setIsSaving(true)
    setSaved(false)

    const supabase = createClient()
    await supabase
      .from('crm_customers')
      .update({
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        phone: form.phone || null,
        birth_date: form.birthday || null,
      })
      .eq('id', user.id)

    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (authLoading || isLoadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isPermanent) {
    return (
      <LoginPrompt
        icon="👤"
        title="DANE OSOBOWE"
        description="Zaloguj się, aby edytować swoje dane osobowe."
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Back */}
      <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Profil
      </Link>

      <h1 className="font-display text-xl font-bold">Dane osobowe</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* First name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Imię</label>
          <input
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="Jan"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Last name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nazwisko</label>
          <input
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Kowalski"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Email (readonly) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            readOnly
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Telefon</label>
          <PhoneInput
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
        </div>

        {/* Birthday */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Data urodzenia</label>
          <input
            type="date"
            value={form.birthday}
            onChange={(e) => { setForm({ ...form, birthday: e.target.value }); setBirthdayError(null) }}
            max={new Date().toISOString().split('T')[0]}
            min="1900-01-01"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {birthdayError ? (
            <p className="text-xs text-destructive">{birthdayError}</p>
          ) : (
            <p className="text-xs text-muted-foreground/60">Zdobywaj x2 punkty w urodziny!</p>
          )}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-accent text-accent-foreground neon-glow-yellow h-12 font-display font-semibold"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Zapisano
            </>
          ) : (
            'Zapisz zmiany'
          )}
        </Button>
      </motion.div>
    </div>
  )
}
