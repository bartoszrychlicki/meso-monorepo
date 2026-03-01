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
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/user';
import { resetPasswordForEmail } from './actions';
import { Loader2, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('email', data.email);

      const result = await resetPasswordForEmail(formData);
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
    <div className="space-y-4" data-page="forgot-password">
      <Card className="border-0 shadow-2xl backdrop-blur">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Resetowanie hasla
          </CardTitle>
          <CardDescription className="text-base">
            Podaj swoj adres email, a wyslimy Ci link do resetowania hasla
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {success ? (
            <div className="space-y-4">
              <Alert data-status="success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Link do resetowania hasla zostal wyslany na podany adres email. Sprawdz skrzynke pocztowa.
                </AlertDescription>
              </Alert>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Powrot do logowania
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

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-action="reset-password"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? 'Wysylanie...' : 'Wyslij link resetujacy'}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Powrot do logowania
                  </span>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
