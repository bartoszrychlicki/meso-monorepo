'use client';

import { useEffect, useState } from 'react';
import {
  OrderClosureReasonCode,
  ORDER_CLOSURE_REASON_OPTIONS,
} from '@meso/core';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatCurrency } from '@/lib/utils';

export interface OrderCancelInput {
  closureReasonCode?: OrderClosureReasonCode | null;
  closureReason?: string;
  requestRefund?: boolean;
}

interface OrderCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: OrderCancelInput) => Promise<void>;
  orderNumber: string;
  isSubmitting?: boolean;
  refundableAmount?: number;
}

export function OrderCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  orderNumber,
  isSubmitting = false,
  refundableAmount,
}: OrderCancelDialogProps) {
  const [selectedReasonCode, setSelectedReasonCode] = useState<OrderClosureReasonCode | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [requestRefund, setRequestRefund] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedReasonCode(null);
      setCustomReason('');
      setRequestRefund(false);
    }
  }, [open]);

  const trimmedCustomReason = customReason.trim();
  const canConfirm = !!selectedReasonCode || trimmedCustomReason.length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    await onConfirm({
      closureReasonCode: selectedReasonCode,
      closureReason: trimmedCustomReason || undefined,
      requestRefund,
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

        {typeof refundableAmount === 'number' && (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-900">
                Czy od razu zlecić zwrot płatności?
              </p>
              <p className="text-sm text-emerald-800">
                System zleci pelny zwrot przez Przelewy24 na kwote {formatCurrency(refundableAmount)}.
              </p>
              <p className="text-xs text-emerald-700">
                Potwierdzenie zwrotu przyjdzie asynchronicznie z Przelewy24.
              </p>
            </div>

            <Label
              htmlFor="request-refund"
              className="flex cursor-pointer items-start gap-3 rounded-md border border-emerald-200 bg-white p-3"
            >
              <Checkbox
                id="request-refund"
                checked={requestRefund}
                onCheckedChange={(checked) => setRequestRefund(checked === true)}
                data-field="request-refund"
              />
              <span>Zlec dodatkowo automatyczny zwrot platnosci</span>
            </Label>
          </div>
        )}

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
