'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { useKitchenStore } from './store';
import { kitchenRepository } from './repository';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { useUserStore } from '@/modules/users/store';

export function useKitchen() {
  const tickets = useKitchenStore((s) => s.tickets);
  const isLoading = useKitchenStore((s) => s.isLoading);
  const loadTickets = useKitchenStore((s) => s.loadTickets);
  const startPreparing = useKitchenStore((s) => s.startPreparing);
  const markItemDone = useKitchenStore((s) => s.markItemDone);
  const markReady = useKitchenStore((s) => s.markReady);
  const markServed = useKitchenStore((s) => s.markServed);
  const bumpOrder = useKitchenStore((s) => s.bumpOrder);
  const setPriority = useKitchenStore((s) => s.setPriority);

  const newTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.status === OrderStatus.PENDING)
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return a.created_at.localeCompare(b.created_at);
        }),
    [tickets]
  );

  const preparingTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.status === OrderStatus.PREPARING)
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return a.created_at.localeCompare(b.created_at);
        }),
    [tickets]
  );

  const readyTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.status === OrderStatus.READY)
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return a.created_at.localeCompare(b.created_at);
        }),
    [tickets]
  );

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tickets,
    isLoading,
    loadTickets,
    startPreparing,
    markItemDone,
    markReady,
    markServed,
    bumpOrder,
    setPriority,
    newTickets,
    preparingTickets,
    readyTickets,
  };
}

type TimerColor = 'green' | 'amber' | 'red';

interface TicketTimerResult {
  elapsed: number; // seconds
  formatted: string;
  color: TimerColor;
  percentage: number;
}

export function useTicketTimer(ticket: KitchenTicket): TicketTimerResult {
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let lastUpdate = Date.now();

    function tick() {
      const current = Date.now();
      // Update every second
      if (current - lastUpdate >= 1000) {
        setNow(current);
        lastUpdate = current;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const startTime =
    ticket.status === OrderStatus.PREPARING && ticket.started_at
      ? new Date(ticket.started_at).getTime()
      : new Date(ticket.created_at).getTime();

  const elapsedMs = now - startTime;
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const estimatedSeconds = ticket.estimated_minutes * 60;
  const percentage = estimatedSeconds > 0 ? (elapsedSeconds / estimatedSeconds) * 100 : 0;

  let color: TimerColor = 'green';
  if (percentage >= 100) {
    color = 'red';
  } else if (percentage >= 80) {
    color = 'amber';
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { elapsed: elapsedSeconds, formatted, color, percentage };
}

export function useKitchenPolling(intervalMs: number = 5000) {
  const refreshTickets = useKitchenStore((state) => state.refreshTickets);

  useEffect(() => {
    const id = setInterval(() => {
      refreshTickets();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, refreshTickets]);
}

export function useKdsSoundEnabled() {
  const currentLocation = useUserStore((state) => state.currentLocation);
  const loadUser = useUserStore((state) => state.loadUser);
  const kdsConfig = useLocationSettingsStore((state) => state.kdsConfig);
  const kdsDefaults = useLocationSettingsStore((state) => state.kdsDefaults);
  const loadLocationWithConfigs = useLocationSettingsStore((state) => state.loadLocationWithConfigs);
  const loadGlobalDefaults = useLocationSettingsStore((state) => state.loadGlobalDefaults);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    void loadGlobalDefaults();
  }, [loadGlobalDefaults]);

  useEffect(() => {
    if (!currentLocation?.id) {
      return;
    }

    void loadLocationWithConfigs(currentLocation.id);
  }, [currentLocation?.id, loadLocationWithConfigs]);

  return kdsConfig?.sound_enabled ?? kdsDefaults?.sound_enabled ?? true;
}

export function useKitchenStats() {
  const [completedToday, setCompletedToday] = useState(0);
  const [avgPrepTime, setAvgPrepTime] = useState(0);
  const tickets = useKitchenStore((state) => state.tickets);

  const activeCount = tickets.filter(
    (t) => t.status === OrderStatus.PENDING || t.status === OrderStatus.PREPARING
  ).length;

  const loadStats = useCallback(async () => {
    try {
      const completed = await kitchenRepository.getCompletedToday();
      setCompletedToday(completed.length);

      if (completed.length > 0) {
        const totalMinutes = completed.reduce((sum, ticket) => {
          if (ticket.started_at && ticket.completed_at) {
            const start = new Date(ticket.started_at).getTime();
            const end = new Date(ticket.completed_at).getTime();
            return sum + (end - start) / 60000;
          }
          return sum;
        }, 0);
        setAvgPrepTime(Math.round(totalMinutes / completed.length));
      } else {
        setAvgPrepTime(0);
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, tickets]);

  return { completedToday, avgPrepTime, activeCount };
}
