'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginSchema, type LoginInput } from '@/schemas/user';
import { signIn } from '@/app/(auth)/login/actions';
import { Loader2, Mail, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('email', data.email);
      formData.set('password', data.password);
      if (redirectTo) {
        formData.set('redirectTo', redirectTo);
      }

      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err: unknown) {
      const digest = (err as { digest?: string })?.digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        throw err;
      }
      setError('Wystapil blad podczas logowania. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-component="login-form"
    >
      {error && (
        <Alert variant="destructive" data-status="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="jan.kowalski@mesopos.pl"
          {...register('email')}
          data-field="email"
        />
        {errors.email && (
          <p className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Haslo</Label>
        <Input
          id="password"
          type="password"
          placeholder="Wprowadz haslo"
          {...register('password')}
          data-field="password"
        />
        {errors.password && (
          <p className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        data-action="login-email"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        {isSubmitting ? 'Logowanie...' : 'Zaloguj sie'}
      </Button>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Nie pamietasz hasla?
        </Link>
      </div>
    </form>
  );
}
