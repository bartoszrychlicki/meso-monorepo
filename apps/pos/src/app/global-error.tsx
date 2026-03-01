'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="pl">
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Wystapil nieoczekiwany blad
        </h2>
        <p style={{ color: '#666', maxWidth: '28rem', fontSize: '0.875rem' }}>
          Aplikacja napotkala problem. Sprobuj odswiezyc strone.
        </p>
        {error.digest && (
          <p style={{ color: '#999', fontSize: '0.75rem' }}>
            Kod bledu: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#0a0a12',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Sprobuj ponownie
        </button>
      </body>
    </html>
  );
}
