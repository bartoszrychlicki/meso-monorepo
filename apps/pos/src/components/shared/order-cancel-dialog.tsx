'use client';

import { useEffect, useState } from 'react';
import {
  OrderClosureReasonCode,
  ORDER_CLOSURE_REASON_OPTIONS,
} from '@meso/core';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface OrderCancelInput {
  closureReasonCode?: OrderClosureReasonCode | null;
  closureReason?: string;
}

interface OrderCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: OrderCancelInput) => Promise<void>;
  orderNumber: string;
  isSubmitting?: boolean;
}

export function OrderCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  orderNumber,
  isSubmitting = false,
}: OrderCancelDialogProps) {
  const [selectedReasonCode, setSelectedReasonCode] = useState<OrderClosureReasonCode | null>(null);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedReasonCode(null);
      setCustomReason('');
    }
  }, [open]);

  const trimmedCustomReason = customReason.trim();
  const canConfirm = !!selectedReasonCode || trimmedCustomReason.length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    await onConfirm({
      closureReasonCode: selectedReasonCode,
      closureReason: trimmedCustomReason || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-component="order-cancel-dialog">
        <DialogHeader>
          <DialogTitle>Anuluj zamówienie</DialogTitle>
          <DialogDescription>
            Wybierz powód anulowania zamówienia {orderNumber}.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Uwaga</AlertTitle>
          <AlertDescription>
            Ten powód będzie widoczny dla klienta w aplikacji delivery.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Label>Wybierz gotowy powód</Label>
          <RadioGroup
            value={selectedReasonCode ?? ''}
            onValueChange={(value) => {
              setSelectedReasonCode(value as OrderClosureReasonCode);
              setCustomReason('');
            }}
            data-field="closure-reason-code"
          >
            {ORDER_CLOSURE_REASON_OPTIONS.map((option) => (
              <Label
                key={option.code}
                htmlFor={`closure-reason-${option.code}`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <RadioGroupItem
                  id={`closure-reason-${option.code}`}
                  value={option.code}
                  className="mt-0.5"
                />
                <span>{option.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="closure-reason-text">Lub wpisz własny opis</Label>
          <Textarea
            id="closure-reason-text"
            value={customReason}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCustomReason(nextValue);
              if (nextValue.trim()) {
                setSelectedReasonCode(null);
              }
            }}
            placeholder="Opisz powód, jeśli nie pasuje żaden z gotowych"
            rows={4}
            data-field="closure-reason-text"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-action="close-cancel-dialog"
          >
            Wróć
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm || isSubmitting}
            data-action="confirm-cancel-order"
          >
            Anuluj zamówienie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
