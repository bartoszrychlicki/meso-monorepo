/**
 * Batch Edit Dialog
 *
 * Dialog for editing batch dates and marking batches as opened.
 */

'use client';

import { useState } from 'react';
import { Batch, StockItem } from '@/types/inventory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, PackageOpen, User } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import { toast } from 'sonner';

interface BatchEditDialogProps {
  batch: Batch | null;
  stockItem?: StockItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchEditDialog({
  batch,
  stockItem,
  open,
  onOpenChange,
  onSuccess,
}: BatchEditDialogProps) {
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && batch) {
      setExpiryDate(
        batch.expiry_date
          ? new Date(batch.expiry_date).toISOString().split('T')[0]
          : ''
      );
    }
    onOpenChange(newOpen);
  };

  const handleMarkAsOpened = async () => {
    if (!batch) return;

    if (batch.opened_date) {
      toast.error('Ta partia jest już oznaczona jako otwarta');
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryRepository.openBatch(batch.id, 'current-user'); // TODO: Get actual user ID
      toast.success('Partia oznaczona jako otwarta');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to mark batch as opened:', error);
      toast.error('Nie udało się oznaczyć partii jako otwartej');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateExpiryDate = async () => {
    if (!batch || !expiryDate) return;

    setIsSubmitting(true);
    try {
      await inventoryRepository.batches.update(batch.id, {
        expiry_date: new Date(expiryDate).toISOString(),
      });

      // Recalculate status
      await inventoryRepository.updateBatchStatuses();

      toast.success('Data przydatności zaktualizowana');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update expiry date:', error);
      toast.error('Nie udało się zaktualizować daty przydatności');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!batch) return null;

  const openedDate = batch.opened_date
    ? new Date(batch.opened_date).toLocaleString('pl-PL')
    : null;

  const shelfLifeDays = stockItem?.shelf_life_after_opening;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-component="batch-edit-dialog">
        <DialogHeader>
          <DialogTitle>Edytuj partię {batch.batch_number}</DialogTitle>
          <DialogDescription>
            Zarządzaj datami przydatności i statusem otwarcia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="space-y-2">
            <Label>Status partii</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {batch.status === 'fresh' && '🟢 Świeża'}
                {batch.status === 'warning' && '🟡 Ostrzeżenie'}
                {batch.status === 'critical' && '🔴 Krytyczna'}
                {batch.status === 'expired' && '⚫ Przeterminowana'}
                {batch.status === 'depleted' && '📦 Wyczerpana'}
              </Badge>
            </div>
          </div>

          {/* Opened Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <PackageOpen className="h-4 w-4" />
              Status otwarcia
            </Label>
            {openedDate ? (
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Otwarto:</span>
                  <span>{openedDate}</span>
                </div>
                {batch.opened_by && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Przez: {batch.opened_by}</span>
                  </div>
                )}
                {shelfLifeDays && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Przydatność po otwarciu: {shelfLifeDays} dni
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Partia nie została jeszcze otwarta
                </p>
                {shelfLifeDays && (
                  <p className="text-xs text-muted-foreground">
                    Po otwarciu: przydatność {shelfLifeDays} dni
                  </p>
                )}
                <Button
                  onClick={handleMarkAsOpened}
                  disabled={isSubmitting}
                  size="sm"
                  variant="outline"
                  className="w-full"
                  data-action="mark-as-opened"
                >
                  <PackageOpen className="mr-2 h-4 w-4" />
                  Oznacz jako otwartą
                </Button>
              </div>
            )}
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data przydatności
            </Label>
            <Input
              id="expiry-date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              data-field="expiry-date"
            />
            {batch.expiry_date && (
              <p className="text-xs text-muted-foreground">
                Aktualna: {new Date(batch.expiry_date).toLocaleDateString('pl-PL')}
              </p>
            )}
          </div>

          {/* Production Date (readonly) */}
          <div className="space-y-2">
            <Label>Data produkcji</Label>
            <Input
              type="text"
              value={new Date(batch.production_date).toLocaleDateString('pl-PL')}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Quantities (readonly) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ilość początkowa</Label>
              <Input
                type="text"
                value={batch.quantity_initial.toFixed(2)}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Ilość aktualna</Label>
              <Input
                type="text"
                value={batch.quantity_current.toFixed(2)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleUpdateExpiryDate}
            disabled={isSubmitting || !expiryDate || expiryDate === batch.expiry_date?.split('T')[0]}
            data-action="save-expiry-date"
          >
            {isSubmitting ? 'Zapisywanie...' : 'Zapisz datę przydatności'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
