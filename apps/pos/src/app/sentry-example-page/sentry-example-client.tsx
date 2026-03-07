'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TriggerState {
  eventId?: string;
  flushed?: boolean;
  error?: string;
}

export function SentryExampleClient() {
  const [clientState, setClientState] = useState<TriggerState>({});
  const [serverState, setServerState] = useState<TriggerState>({});
  const [isSendingClient, setIsSendingClient] = useState(false);
  const [isSendingServer, setIsSendingServer] = useState(false);

  async function triggerClientEvent() {
    setIsSendingClient(true);
    const error = new Error(`POS Sentry verification client ${new Date().toISOString()}`);
    const eventId = Sentry.captureException(error, {
      tags: {
        app: 'pos',
        verification: 'manual',
        verification_source: 'client',
      },
    });

    const flushed = await Sentry.flush(2000);
    setClientState({ eventId, flushed });
    setIsSendingClient(false);
  }

  async function triggerServerEvent() {
    setIsSendingServer(true);
    setServerState({});

    try {
      const response = await fetch('/api/sentry-example-api', {
        method: 'POST',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setServerState({
          error: payload.error ?? `HTTP ${response.status}`,
        });
      } else {
        setServerState({
          eventId: payload.eventId,
          flushed: payload.flushed,
        });
      }
    } catch (error) {
      setServerState({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSendingServer(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Sentry Verify
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            POS Sentry verification
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Uzyj przyciskow ponizej, aby wyslac testowy event z klienta i z
            endpointu serwerowego. Strona jest dostepna tylko poza produkcja.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Client event
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Wysyla testowy blad przez browser SDK i czeka na flush kolejki.
            </p>
            <Button
              className="mt-5"
              onClick={triggerClientEvent}
              disabled={isSendingClient}
            >
              {isSendingClient ? 'Wysylanie...' : 'Trigger client event'}
            </Button>
            <pre className="mt-4 rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
{JSON.stringify(clientState, null, 2)}
            </pre>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Server event
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Wysyla testowy blad przez endpoint Next.js i zwraca status flush.
            </p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={triggerServerEvent}
              disabled={isSendingServer}
            >
              {isSendingServer ? 'Wysylanie...' : 'Trigger server event'}
            </Button>
            <pre className="mt-4 rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
{JSON.stringify(serverState, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
