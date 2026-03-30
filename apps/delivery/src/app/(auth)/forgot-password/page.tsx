'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useDeliveryI18n } from '@/lib/i18n/provider'

type ForgotPasswordFormData = {
  email: string
}

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const supabase = createClient()
  const { t } = useDeliveryI18n()

  const forgotPasswordSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/callback?type=recovery`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setSubmittedEmail(data.email)
      setIsSubmitted(true)
      toast.success(t('account.resetPasswordEmailSent'))
    } catch {
      toast.error(t('auth.genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('auth.checkEmail')}
          </h1>
          <p className="text-white/60">
            {t('auth.resetLinkSent')}
          </p>
          <p className="text-white font-medium mt-1">{submittedEmail}</p>
        </div>
        <div className="space-y-3 pt-4">
          <p className="text-white/40 text-sm">
            {t('auth.notReceivedEmail')}{' '}
            <button
              onClick={() => {
                setIsSubmitted(false)
                setSubmittedEmail('')
              }}
              className="text-primary hover:underline"
            >
              {t('auth.tryAgain')}
            </button>
          </p>
          <Link href="/login">
            <Button variant="ghost" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('auth.backToLogin')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t('auth.forgotTitle')}
        </h1>
        <p className="text-white/60">
          {t('auth.forgotDescription')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">
            {t('auth.email')}
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="twoj@email.pl"
            {...register('email')}
            className="bg-card border-white/10 text-white placeholder:text-white/40 focus:border-primary"
          />
          {errors.email && (
            <p className="text-red-400 text-sm">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t('auth.sending')}
            </>
          ) : (
            t('auth.sendResetLink')
          )}
        </Button>
      </form>

      {/* Back to login */}
      <div className="text-center pt-4 border-t border-white/10">
        <Link href="/login">
          <Button variant="ghost" className="text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('auth.backToLogin')}
          </Button>
        </Link>
      </div>
    </div>
  )
}
