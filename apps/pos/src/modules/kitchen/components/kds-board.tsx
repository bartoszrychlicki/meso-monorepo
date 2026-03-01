'use client';

import { useKitchen, useKitchenPolling } from '../hooks';
import { KdsCard } from './kds-card';
import { cn } from '@/lib/utils';
import { Inbox, ChefHat, Bell } from 'lucide-react';

interface KdsColumnProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  headerColor: string;
  children: React.ReactNode;
}

function KdsColumn({ title, count, icon, headerColor, children }: KdsColumnProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden" data-column={title}>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3',
          headerColor
        )}
      >
        {icon}
        <h2 className="text-lg font-bold uppercase tracking-wide text-white">
          {title}
        </h2>
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  );
}

export function KdsBoard() {
  const { newTickets, preparingTickets, readyTickets, isLoading } = useKitchen();
  useKitchenPolling(5000);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-white" />
          <p className="mt-4 text-lg font-medium text-slate-400">
            Wczytywanie zamowien...
          </p>
        </div>
      </div>
    );
  }

  const emptyState = (message: string) => (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-slate-400">
      <p className="text-lg font-medium">{message}</p>
    </div>
  );

  return (
    <div className="flex flex-1 gap-2 overflow-hidden" data-component="kds-board">
      {/* Desktop: 3 columns */}
      <div className="hidden flex-1 gap-2 overflow-hidden lg:flex">
        <KdsColumn
          title="Nowe"
          count={newTickets.length}
          icon={<Inbox className="h-5 w-5 text-white" />}
          headerColor="bg-slate-700"
        >
          {newTickets.length === 0
            ? emptyState('Brak nowych zamowien')
            : newTickets.map((ticket) => (
                <KdsCard key={ticket.id} ticket={ticket} />
              ))}
        </KdsColumn>

        <KdsColumn
          title="W przygotowaniu"
          count={preparingTickets.length}
          icon={<ChefHat className="h-5 w-5 text-white" />}
          headerColor="bg-amber-700"
        >
          {preparingTickets.length === 0
            ? emptyState('Nic w przygotowaniu')
            : preparingTickets.map((ticket) => (
                <KdsCard key={ticket.id} ticket={ticket} />
              ))}
        </KdsColumn>

        <KdsColumn
          title="Gotowe"
          count={readyTickets.length}
          icon={<Bell className="h-5 w-5 text-white" />}
          headerColor="bg-emerald-700"
        >
          {readyTickets.length === 0
            ? emptyState('Brak gotowych zamowien')
            : readyTickets.map((ticket) => (
                <KdsCard key={ticket.id} ticket={ticket} />
              ))}
        </KdsColumn>
      </div>

      {/* Tablet: 2 columns (New+Preparing combined, Ready separate) */}
      <div className="flex flex-1 gap-2 overflow-hidden lg:hidden">
        <KdsColumn
          title="Nowe + W przygotowaniu"
          count={newTickets.length + preparingTickets.length}
          icon={<ChefHat className="h-5 w-5 text-white" />}
          headerColor="bg-amber-700"
        >
          {newTickets.length === 0 && preparingTickets.length === 0
            ? emptyState('Brak zamowien')
            : (
                <>
                  {newTickets.map((ticket) => (
                    <KdsCard key={ticket.id} ticket={ticket} />
                  ))}
                  {preparingTickets.map((ticket) => (
                    <KdsCard key={ticket.id} ticket={ticket} />
                  ))}
                </>
              )}
        </KdsColumn>

        <KdsColumn
          title="Gotowe"
          count={readyTickets.length}
          icon={<Bell className="h-5 w-5 text-white" />}
          headerColor="bg-emerald-700"
        >
          {readyTickets.length === 0
            ? emptyState('Brak gotowych')
            : readyTickets.map((ticket) => (
                <KdsCard key={ticket.id} ticket={ticket} />
              ))}
        </KdsColumn>
      </div>
    </div>
  );
}
