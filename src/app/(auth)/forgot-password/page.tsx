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

const forgotPasswordSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const supabase = createClient()

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
      toast.success('Link do resetu hasła został wysłany!')
    } catch {
      toast.error('Wystąpił błąd. Spróbuj ponownie.')
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
            Sprawdź email
          </h1>
          <p className="text-white/60">
            Wysłaliśmy link do resetu hasła na adres:
          </p>
          <p className="text-white font-medium mt-1">{submittedEmail}</p>
        </div>
        <div className="space-y-3 pt-4">
          <p className="text-white/40 text-sm">
            Nie otrzymałeś emaila? Sprawdź folder spam lub{' '}
            <button
              onClick={() => {
                setIsSubmitted(false)
                setSubmittedEmail('')
              }}
              className="text-primary hover:underline"
            >
              spróbuj ponownie
            </button>
          </p>
          <Link href="/login">
            <Button variant="ghost" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do logowania
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
          Zapomniałeś hasła?
        </h1>
        <p className="text-white/60">
          Podaj swój email, a wyślemy Ci link do resetu hasła
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">
            Adres email
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
              Wysyłanie...
            </>
          ) : (
            'Wyślij link resetujący'
          )}
        </Button>
      </form>

      {/* Back to login */}
      <div className="text-center pt-4 border-t border-white/10">
        <Link href="/login">
          <Button variant="ghost" className="text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót do logowania
          </Button>
        </Link>
      </div>
    </div>
  )
}
