'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginSchema, type LoginInput } from '@/schemas/user';
import { useUserStore } from '../store';
import { Loader2, Mail, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useUserStore();

  const emailForm = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleEmailLogin = async (data: LoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const success = await login(data.email, data.password);
      if (!success) {
        setError('Nieprawidlowy adres email. Sprawdz dane logowania.');
      }
    } catch {
      setError('Wystapil blad podczas logowania. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={emailForm.handleSubmit(handleEmailLogin)}
      className="space-y-4"
      data-component="login-form"
      data-mode="email"
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
          {...emailForm.register('email')}
          data-field="email"
        />
        {emailForm.formState.errors.email && (
          <p className="text-sm text-destructive">
            {emailForm.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Haslo</Label>
        <Input
          id="password"
          type="password"
          placeholder="Wprowadz haslo"
          {...emailForm.register('password')}
          data-field="password"
        />
        {emailForm.formState.errors.password && (
          <p className="text-sm text-destructive">
            {emailForm.formState.errors.password.message}
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
        Zaloguj sie
      </Button>
    </form>
  );
}
