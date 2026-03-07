'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Cos poszlo nie tak</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Wystapil nieoczekiwany blad. Sprobuj ponownie lub wroc do strony
        glownej.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60">
          Kod bledu: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          Sprobuj ponownie
        </Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/dashboard')}
        >
          Strona glowna
        </Button>
      </div>
    </div>
  );
}
