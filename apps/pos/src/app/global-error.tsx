'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="pl">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h2 className="text-2xl font-semibold">Cos poszlo nie tak</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Wystapil krytyczny blad aplikacji. Sprobuj odswiezyc widok albo
            ponowic akcje.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground/70">
              Kod bledu: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Sprobuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
