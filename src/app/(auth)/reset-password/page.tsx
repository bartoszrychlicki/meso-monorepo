'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResetPasswordSchema, type ResetPasswordInput } from '@/schemas/user';
import { updatePassword } from './actions';
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('password', data.password);

      const result = await updatePassword(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
      }
    } catch {
      setError('Wystapil blad. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" data-page="reset-password">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Ustaw nowe haslo
          </CardTitle>
          <CardDescription className="text-base">
            Wprowadz nowe haslo do swojego konta
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {success ? (
            <div className="space-y-4">
              <Alert data-status="success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Haslo zostalo zaktualizowane pomyslnie. Mozesz sie teraz zalogowac.
                </AlertDescription>
              </Alert>
              <Link href="/login">
                <Button className="w-full" data-action="go-to-login">
                  Przejdz do logowania
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-status="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Nowe haslo</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 znakow"
                  {...register('password')}
                  data-field="password"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potwierdz haslo</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtorz haslo"
                  {...register('confirmPassword')}
                  data-field="confirm-password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-action="update-password"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? 'Zapisywanie...' : 'Zapisz nowe haslo'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
