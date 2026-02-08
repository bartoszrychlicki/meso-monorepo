/**
 * Stock Adjustment Dialog
 *
 * Dialog for manually adjusting stock quantities.
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Package } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import { toast } from 'sonner';

interface StockAdjustmentDialogProps {
  stockItem: StockItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({
  stockItem,
  open,
  onOpenChange,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form
      setAdjustmentType('increase');
      setQuantity('');
      setReason('');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!stockItem || !quantity || !reason) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const quantityNumber = parseFloat(quantity);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      toast.error('Podaj poprawną ilość');
      return;
    }

    // Check if decrease would result in negative quantity
    if (adjustmentType === 'decrease' && quantityNumber > (stockItem.quantity_available ?? 0)) {
      toast.error(
        `Nie można zmniejszyć o ${quantityNumber} ${stockItem.unit}. Dostępne: ${(stockItem.quantity_available ?? 0).toFixed(2)} ${stockItem.unit}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const adjustmentAmount = adjustmentType === 'increase' ? quantityNumber : -quantityNumber;

      await inventoryRepository.adjustStock(stockItem.id, adjustmentAmount, reason);

      toast.success(
        `Stan magazynowy ${adjustmentType === 'increase' ? 'zwiększony' : 'zmniejszony'} o ${quantityNumber} ${stockItem.unit}`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      toast.error('Nie udało się skorygować stanu magazynowego');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stockItem) return null;

  const newQuantity =
    quantity && !isNaN(parseFloat(quantity))
      ? (stockItem.quantity_available ?? 0) +
        (adjustmentType === 'increase' ? parseFloat(quantity) : -parseFloat(quantity))
      : (stockItem.quantity_available ?? 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-component="stock-adjustment-dialog">
        <DialogHeader>
          <DialogTitle>Korekta stanu magazynowego</DialogTitle>
          <DialogDescription>
            Ręczne zwiększenie lub zmniejszenie stanu magazynowego
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Stock Info */}
          <div className="p-3 bg-muted rounded-md space-y-1">
            <div className="font-medium">{stockItem.name}</div>
            <div className="text-sm text-muted-foreground">SKU: {stockItem.sku}</div>
            <div className="flex items-center gap-4 text-sm mt-2">
              <div>
                <span className="text-muted-foreground">Fizyczny:</span>{' '}
                <span className="font-medium">
                  {(stockItem.quantity_physical ?? 0).toFixed(2)} {stockItem.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Dostępny:</span>{' '}
                <span className="font-medium">
                  {(stockItem.quantity_available ?? 0).toFixed(2)} {stockItem.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>Typ korekty</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('increase')}
                className="justify-start"
                data-action="set-increase"
              >
                <Plus className="mr-2 h-4 w-4" />
                Zwiększ stan
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('decrease')}
                className="justify-start"
                data-action="set-decrease"
              >
                <Minus className="mr-2 h-4 w-4" />
                Zmniejsz stan
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Ilość {adjustmentType === 'increase' ? 'dodania' : 'odjęcia'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-field="adjustment-quantity"
              />
              <Badge variant="outline" className="px-3 flex items-center">
                {stockItem.unit}
              </Badge>
            </div>
          </div>

          {/* New Quantity Preview */}
          {quantity && !isNaN(parseFloat(quantity)) && (
            <div
              className={`p-3 rounded-md border ${
                newQuantity < 0
                  ? 'bg-red-50 border-red-200'
                  : adjustmentType === 'increase'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nowy stan:</span>
                <span
                  className={`text-lg font-bold ${
                    newQuantity < 0
                      ? 'text-red-600'
                      : adjustmentType === 'increase'
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}
                >
                  {newQuantity.toFixed(2)} {stockItem.unit}
                </span>
              </div>
              {newQuantity < 0 && (
                <div className="text-xs text-red-600 mt-1">
                  ⚠️ Stan nie może być ujemny
                </div>
              )}
              {newQuantity < stockItem.min_quantity && newQuantity >= 0 && (
                <div className="text-xs text-orange-600 mt-1">
                  ⚠️ Poniżej minimum ({stockItem.min_quantity} {stockItem.unit})
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Powód korekty *</Label>
            <Textarea
              id="reason"
              placeholder="Np. inwentaryzacja, uszkodzenie, korekta błędu..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              data-field="adjustment-reason"
            />
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
              !reason ||
              newQuantity < 0 ||
              parseFloat(quantity) <= 0
            }
            data-action="submit-adjustment"
          >
            {isSubmitting ? 'Zapisywanie...' : 'Zapisz korektę'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
