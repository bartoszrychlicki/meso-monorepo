'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła nie są identyczne',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const isRecoveryFlow = new URLSearchParams(window.location.search).get('recovery') === '1'

      if (!isRecoveryFlow) {
        setIsValidSession(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()

      // Reset password requires an authenticated session from recovery callback
      setIsValidSession(!!session && !!session.user?.email)
    }
    checkSession()
  }, [supabase])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        console.error('Reset password updateUser error:', error)
        toast.error(error.message)
        return
      }

      setIsSuccess(true)
      toast.success('Hasło zostało zmienione!')

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error) {
      console.error('Reset password submit failed:', error)
      toast.error('Wystąpił błąd. Spróbuj ponownie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Invalid or expired session
  if (!isValidSession) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Link wygasł
          </h1>
          <p className="text-white/60">
            Ten link do resetu hasła jest nieważny lub wygasł.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="bg-primary hover:bg-primary/90">
            Wyślij nowy link
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Hasło zmienione!
          </h1>
          <p className="text-white/60">
            Twoje hasło zostało pomyślnie zmienione.
            Za chwilę przekierujemy Cię do logowania.
          </p>
        </div>
        <Link href="/login">
          <Button className="bg-primary hover:bg-primary/90">
            Zaloguj się teraz
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Ustaw nowe hasło
        </h1>
        <p className="text-white/60">
          Wprowadź nowe hasło dla swojego konta
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80">
            Nowe hasło
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 znaków"
            {...register('password')}
            className="bg-card border-white/10 text-white placeholder:text-white/40 focus:border-primary"
          />
          {errors.password && (
            <p className="text-red-400 text-sm">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-white/80">
            Powtórz hasło
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Powtórz nowe hasło"
            {...register('confirmPassword')}
            className="bg-card border-white/10 text-white placeholder:text-white/40 focus:border-primary"
          />
          {errors.confirmPassword && (
            <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
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
              Zapisywanie...
            </>
          ) : (
            'Zmień hasło'
          )}
        </Button>
      </form>
    </div>
  )
}
