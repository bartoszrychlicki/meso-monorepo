'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginSchema, PinLoginSchema, type LoginInput, type PinLoginInput } from '@/schemas/user';
import { useUserStore } from '../store';
import { Loader2, Mail, KeyRound, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [mode, setMode] = useState<'email' | 'pin'>('email');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithPin } = useUserStore();

  const emailForm = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const pinForm = useForm<PinLoginInput>({
    resolver: zodResolver(PinLoginSchema),
    defaultValues: { employee_code: '', pin: '' },
  });

  const handleEmailLogin = async (data: LoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const success = await login(data.email, data.password);
      if (!success) {
        setError('Nieprawidłowy adres email. Sprawdź dane logowania.');
      }
    } catch {
      setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinLogin = async (data: PinLoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const success = await loginWithPin(data.employee_code, data.pin);
      if (!success) {
        setError('Nieprawidłowy kod pracownika lub PIN.');
      }
    } catch {
      setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'pin') {
    return (
      <form
        onSubmit={pinForm.handleSubmit(handlePinLogin)}
        className="space-y-4"
        data-component="login-form"
        data-mode="pin"
      >
        {error && (
          <Alert variant="destructive" data-status="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="employee_code">Kod pracownika</Label>
          <Input
            id="employee_code"
            placeholder="np. EMP001"
            {...pinForm.register('employee_code')}
            data-field="employee_code"
          />
          {pinForm.formState.errors.employee_code && (
            <p className="text-sm text-destructive">
              {pinForm.formState.errors.employee_code.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">PIN</Label>
          <Input
            id="pin"
            type="password"
            maxLength={4}
            placeholder="****"
            inputMode="numeric"
            {...pinForm.register('pin')}
            data-field="pin"
          />
          {pinForm.formState.errors.pin && (
            <p className="text-sm text-destructive">
              {pinForm.formState.errors.pin.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          data-action="login-pin"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Zaloguj się kodem PIN
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            setMode('email');
            setError(null);
          }}
          data-action="switch-to-email"
        >
          Zaloguj się emailem
        </button>
      </form>
    );
  }

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
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          type="password"
          placeholder="Wprowadź hasło"
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
        Zaloguj się
      </Button>

      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => {
          setMode('pin');
          setError(null);
        }}
        data-action="switch-to-pin"
      >
        Zaloguj kodem pracownika
      </button>
    </form>
  );
}
