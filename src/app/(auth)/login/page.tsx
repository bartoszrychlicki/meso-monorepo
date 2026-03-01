'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isPermanent, isLoading: authLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const supabase = createClient()

  const redirectTo = searchParams.get('redirect') || '/'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (!authLoading && isPermanent) {
      router.push(redirectTo)
    }
  }, [authLoading, isPermanent, redirectTo, router])

  if (!authLoading && isPermanent) {
    return null
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Nieprawidłowy email lub hasło')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Potwierdź swój email przed zalogowaniem')
        } else {
          toast.error(error.message)
        }
        return
      }

      toast.success('Witaj ponownie!')
      router.push(redirectTo)
      router.refresh()
    } catch {
      toast.error('Wystąpił błąd. Spróbuj ponownie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const inputCls = 'w-full rounded-xl border border-border bg-secondary/50 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-secondary/50 focus:outline-none'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      {/* Neon MESO heading */}
      <Link href="/" className="mb-8 block text-center font-display text-3xl font-bold tracking-[0.3em] text-primary neon-text">
        MESO
      </Link>

      <h2 className="mb-6 text-center font-display text-lg font-semibold tracking-wider">
        ZALOGUJ SIĘ
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              {...register('email')}
              className={`${inputCls} pl-10 pr-4`}
            />
          </div>
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Hasło"
              autoComplete="current-password"
              {...register('password')}
              className={`${inputCls} pl-10 pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex justify-end mt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Zapomniałeś hasła?
            </Link>
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent py-3 font-display text-sm font-semibold tracking-wider text-accent-foreground neon-glow-yellow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              LOGOWANIE...
            </span>
          ) : (
            'ZALOGUJ'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <Separator className="bg-border" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs text-muted-foreground">
          lub
        </span>
      </div>

      {/* Google button */}
      <button
        type="button"
        disabled
        className="w-full rounded-xl border border-border bg-transparent py-3 text-sm font-medium text-foreground transition-colors hover:bg-card/50 disabled:opacity-50"
      >
        Kontynuuj z Google
      </button>

      {/* Skip link */}
      <Link
        href="/menu"
        className="block text-center text-xs text-muted-foreground hover:text-foreground mt-3"
      >
        Pomiń i przeglądaj menu →
      </Link>

      {/* Register link */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Nie masz konta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Zarejestruj się
        </Link>
      </p>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
