'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/modules/users/components/login-form';
import { useUserStore } from '@/modules/users/store';
import { seedAll } from '@/seed';
import Link from 'next/link';
import { Clock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();

  useEffect(() => {
    seedAll();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="space-y-4" data-page="login">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xl shadow-lg">
            M
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">MESOpos</CardTitle>
          <CardDescription className="text-base">
            System zarządzania punktem sprzedaży
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <LoginForm />
        </CardContent>
      </Card>

      <div className="text-center">
        <Link
          href="/clock-in"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          data-action="go-to-clock-in"
        >
          <Clock className="h-4 w-4" />
          Rejestracja czasu pracy
        </Link>
      </div>
    </div>
  );
}
