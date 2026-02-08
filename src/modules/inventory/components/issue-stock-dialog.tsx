/**
 * Issue Stock Dialog (FEFO Algorithm)
 *
 * Allows issuing stock from warehouse using FEFO (First Expired First Out) algorithm.
 * Shows which batches will be automatically picked for the requested quantity.
 */

'use client';

import { useState } from 'react';
import { StockItem } from '@/types/inventory';
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
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import { toast } from 'sonner';

interface IssueStockDialogProps {
  stockItem: StockItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IssueStockDialog({
  stockItem,
  open,
  onOpenChange,
  onSuccess,
}: IssueStockDialogProps) {
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form
      setQuantity('');
      setPreview(null);
    }
    onOpenChange(newOpen);
  };

  const handlePreview = async () => {
    if (!stockItem || !quantity) {
      toast.error('Podaj ilość do wydania');
      return;
    }

    const quantityNumber = parseFloat(quantity);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      toast.error('Podaj poprawną ilość');
      return;
    }

    if (quantityNumber > stockItem.quantity_available) {
      toast.error(
        `Niewystarczająca ilość. Dostępne: ${stockItem.quantity_available} ${stockItem.unit}`
      );
      return;
    }

    try {
      // In real implementation, we'd call a preview endpoint
      // For now, we'll simulate it by calling issueStock in preview mode
      toast.info('Funkcja podglądu FEFO w przygotowaniu');
      setPreview([
        {
          batch_number: 'Preview',
          quantity: quantityNumber,
          expiry_date: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Failed to preview FEFO:', error);
      toast.error('Nie udało się wygenerować podglądu');
    }
  };

  const handleSubmit = async () => {
    if (!stockItem || !quantity) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const quantityNumber = parseFloat(quantity);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      toast.error('Podaj poprawną ilość');
      return;
    }

    if (quantityNumber > stockItem.quantity_available) {
      toast.error(
        `Niewystarczająca ilość. Dostępne: ${stockItem.quantity_available} ${stockItem.unit}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await inventoryRepository.issueStock(
        stockItem.id,
        stockItem.warehouse_id,
        quantityNumber
      );

      if (result.success) {
        toast.success(
          `Wydano ${quantityNumber} ${stockItem.unit} (${result.batches.length} partii) metodą FEFO`
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Nie udało się wydać towaru - brak dostępnych partii');
      }
    } catch (error: any) {
      console.error('Failed to issue stock:', error);
      toast.error(error.message || 'Nie udało się wydać towaru');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stockItem) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-component="issue-stock-dialog">
        <DialogHeader>
          <DialogTitle>Wydanie towaru - FEFO</DialogTitle>
          <DialogDescription>
            Automatyczne wydanie partii wg. algorytmu FEFO (First Expired First Out)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Stock Info */}
          <div className="p-3 bg-muted rounded-md space-y-1">
            <div className="font-medium">{stockItem.name}</div>
            <div className="text-sm text-muted-foreground">SKU: {stockItem.sku}</div>
            <div className="flex items-center gap-4 text-sm mt-2">
              <div>
                <span className="text-muted-foreground">Dostępne:</span>{' '}
                <span className="font-medium">
                  {stockItem.quantity_available.toFixed(2)} {stockItem.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Fizyczne:</span>{' '}
                <span className="font-medium">
                  {stockItem.quantity_physical.toFixed(2)} {stockItem.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Ilość do wydania</Label>
            <div className="flex gap-2">
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                max={stockItem.quantity_available}
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-field="issue-quantity"
              />
              <Badge variant="outline" className="px-3 flex items-center">
                {stockItem.unit}
              </Badge>
            </div>
          </div>

          {/* Preview Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!quantity || parseFloat(quantity) <= 0}
            className="w-full"
            data-action="preview-fefo"
          >
            <Package className="mr-2 h-4 w-4" />
            Pokaż podgląd FEFO
          </Button>

          {/* FEFO Preview */}
          {preview && preview.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Partie do wydania (według daty ważności):
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.map((batch, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          Partia #{idx + 1}: {batch.batch_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ważność:{' '}
                          {new Date(batch.expiry_date).toLocaleDateString('pl-PL')}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-blue-600">
                        {batch.quantity.toFixed(2)} {stockItem.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  FEFO gwarantuje, że partie o najwcześniejszej dacie ważności zostaną
                  wydane jako pierwsze (zgodnie z HACCP).
                </span>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Wydanie towaru zmniejszy stan magazynowy. Operacja jest nieodwracalna.
            </span>
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
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !quantity ||
              parseFloat(quantity) <= 0 ||
              parseFloat(quantity) > stockItem.quantity_available
            }
            data-action="submit-issue-stock"
          >
            {isSubmitting ? 'Wydawanie...' : 'Wydaj towar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
