/**
 * Transfer Actions Component
 *
 * Action buttons for transfer workflow (start, receive, cancel).
 */

'use client';

import { useState } from 'react';
import { StockTransfer } from '@/types/inventory';
import { TransferStatus } from '@/types/enums';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Truck, PackageCheck, XCircle } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import { toast } from 'sonner';

interface TransferActionsProps {
  transfer: StockTransfer;
  onSuccess: () => void;
}

export function TransferActions({ transfer, onSuccess }: TransferActionsProps) {
  const [action, setAction] = useState<'start' | 'receive' | 'cancel' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = async () => {
    setIsSubmitting(true);
    try {
      await inventoryRepository.startTransfer(transfer.id, 'current-user'); // TODO: Get actual user ID
      toast.success(`Przesunięcie ${transfer.transfer_number} wysłane w drogę`);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to start transfer:', error);
      toast.error(error.message || 'Nie udało się wysłać przesunięcia');
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  const handleReceive = async () => {
    setIsSubmitting(true);
    try {
      await inventoryRepository.receiveTransfer(transfer.id, 'current-user'); // TODO: Get actual user ID
      toast.success(`Przesunięcie ${transfer.transfer_number} odebrane`);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to receive transfer:', error);
      toast.error(error.message || 'Nie udało się odebrać przesunięcia');
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await inventoryRepository.cancelTransfer(transfer.id, 'Anulowane przez użytkownika');
      toast.success(`Przesunięcie ${transfer.transfer_number} anulowane`);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to cancel transfer:', error);
      toast.error(error.message || 'Nie udało się anulować przesunięcia');
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  const canStart = transfer.status === TransferStatus.PENDING;
  const canReceive = transfer.status === TransferStatus.IN_TRANSIT;
  const canCancel =
    transfer.status === TransferStatus.PENDING ||
    transfer.status === TransferStatus.IN_TRANSIT;

  return (
    <>
      <div className="flex items-center gap-2" data-component="transfer-actions">
        {canStart && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setAction('start')}
            data-action="start-transfer"
          >
            <Truck className="mr-2 h-4 w-4" />
            Wyślij
          </Button>
        )}

        {canReceive && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setAction('receive')}
            data-action="receive-transfer"
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            Odbierz
          </Button>
        )}

        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAction('cancel')}
            data-action="cancel-transfer"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Anuluj
          </Button>
        )}
      </div>

      {/* Start Transfer Confirmation */}
      <AlertDialog open={action === 'start'} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wysłać przesunięcie?</AlertDialogTitle>
            <AlertDialogDescription>
              Przesunięcie {transfer.transfer_number} zostanie oznaczone jako "W drodze".
              <br />
              <br />
              Stany magazynowe w magazynie źródłowym zostaną zmniejszone, a ilości zostaną
              przeniesione do "W drodze".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleStart} disabled={isSubmitting}>
              {isSubmitting ? 'Wysyłanie...' : 'Wyślij'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Transfer Confirmation */}
      <AlertDialog open={action === 'receive'} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrać przesunięcie?</AlertDialogTitle>
            <AlertDialogDescription>
              Przesunięcie {transfer.transfer_number} zostanie oznaczone jako "Odebrane".
              <br />
              <br />
              Stany magazynowe w magazynie docelowym zostaną zwiększone, a ilości "W drodze"
              zostaną zmniejszone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleReceive} disabled={isSubmitting}>
              {isSubmitting ? 'Odbieranie...' : 'Odbierz'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Transfer Confirmation */}
      <AlertDialog open={action === 'cancel'} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulować przesunięcie?</AlertDialogTitle>
            <AlertDialogDescription>
              Przesunięcie {transfer.transfer_number} zostanie anulowane.
              <br />
              <br />
              {transfer.status === TransferStatus.IN_TRANSIT &&
                'Stany magazynowe w magazynie źródłowym zostaną przywrócone.'}
              {transfer.status === TransferStatus.PENDING &&
                'Nie wprowadzono jeszcze zmian w stanach magazynowych.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isSubmitting}>
              {isSubmitting ? 'Anulowanie...' : 'Potwierdź anulowanie'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
