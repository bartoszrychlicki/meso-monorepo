'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addMinutes } from 'date-fns';
import { Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatKitchenScheduledTime } from '../formatting';

const ADJUSTMENT_OPTIONS = [-10, -5, 5, 10, 15, 20];
const MIN_FUTURE_BUFFER_MINUTES = 5;
const MINUTE_STEP = 5;

interface PickupTimeAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPickupTime: string;
  onConfirm: (pickupTime: string) => Promise<void>;
  isSubmitting?: boolean;
  openedAtTimestamp?: number | null;
}

export function PickupTimeAdjustDialog({
  open,
  onOpenChange,
  currentPickupTime,
  onConfirm,
  isSubmitting = false,
  openedAtTimestamp = null,
}: PickupTimeAdjustDialogProps) {
  const [draftPickupTime, setDraftPickupTime] = useState(currentPickupTime);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmInFlightRef = useRef(false);

  useEffect(() => {
    confirmInFlightRef.current = false;
    setIsConfirming(false);

    if (open) {
      setDraftPickupTime(currentPickupTime);
    }
  }, [currentPickupTime, open]);

  const currentLabel = useMemo(
    () => formatKitchenScheduledTime(currentPickupTime) ?? '--:--',
    [currentPickupTime]
  );
  const nextLabel = useMemo(
    () => formatKitchenScheduledTime(draftPickupTime) ?? '--:--',
    [draftPickupTime]
  );
  const adjustmentOptions = useMemo(() => {
    const draftDate = new Date(draftPickupTime);
    const options = [...ADJUSTMENT_OPTIONS];

    if (Number.isNaN(draftDate.getTime())) {
      return options;
    }
    if (!openedAtTimestamp) {
      return options;
    }

    const minimumFutureAdjustment = Math.ceil(
      (openedAtTimestamp + MIN_FUTURE_BUFFER_MINUTES * 60_000 - draftDate.getTime())
        / (MINUTE_STEP * 60_000)
    ) * MINUTE_STEP;

    const filteredOptions = options.filter((value) => value >= minimumFutureAdjustment);

    if (filteredOptions.length === 0) {
      filteredOptions.push(
        minimumFutureAdjustment,
        minimumFutureAdjustment + 10,
        minimumFutureAdjustment + 20
      );
    }

    return [...new Set(filteredOptions)].sort((left, right) => left - right);
  }, [draftPickupTime, openedAtTimestamp]);
  const isBusy = isSubmitting || isConfirming;
  const canConfirm = draftPickupTime !== currentPickupTime;

  const handleAdjust = (minutes: number) => {
    const currentDate = new Date(draftPickupTime);
    if (Number.isNaN(currentDate.getTime())) {
      return;
    }

    setDraftPickupTime(addMinutes(currentDate, minutes).toISOString());
  };

  const handleConfirm = async () => {
    if (!canConfirm || isBusy || confirmInFlightRef.current) {
      return;
    }

    confirmInFlightRef.current = true;
    setIsConfirming(true);

    try {
      await onConfirm(draftPickupTime);
    } finally {
      confirmInFlightRef.current = false;
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Skoryguj odbiór</DialogTitle>
          <DialogDescription>
            Wybierz nową godzinę odbioru. Zmiana zapisze się dopiero po potwierdzeniu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Obecny czas</p>
              <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
                <Clock3 className="h-5 w-5 text-slate-500" />
                <span data-field="current-pickup-time">{currentLabel}</span>
              </div>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-sm font-medium text-teal-700">Nowy czas</p>
              <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-teal-900">
                <Clock3 className="h-5 w-5 text-teal-700" />
                <span data-field="next-pickup-time">{nextLabel}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {adjustmentOptions.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                variant={minutes > 0 ? 'default' : 'outline'}
                className="h-16 text-xl font-bold"
                onClick={() => handleAdjust(minutes)}
                disabled={isBusy}
                data-action={`pickup-adjust-${minutes > 0 ? 'plus' : 'minus'}-${Math.abs(minutes)}`}
              >
                {minutes > 0 ? '+' : ''}{minutes} min
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-5 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-12 px-6 text-base font-semibold"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
            data-action="cancel-pickup-adjust"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            className="h-12 px-8 text-base font-semibold"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm || isBusy}
            data-action="confirm-pickup-adjust"
          >
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
