/**
 * Wastage Recording Dialog
 *
 * Records inventory wastage/shrinkage with category and reason tracking.
 * Critical for cost control and HACCP compliance.
 */

'use client';

import { useState } from 'react';
import { StockItem } from '@/types/inventory';
import { WastageCategory } from '@/types/enums';
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
import { Trash2, AlertTriangle } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface WastageDialogProps {
  stockItem: StockItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const WASTAGE_CATEGORIES = [
  { value: WastageCategory.EXPIRY, label: 'Przeterminowanie', icon: '📅' },
  { value: WastageCategory.DAMAGE, label: 'Uszkodzenie', icon: '📦' },
  { value: WastageCategory.SPOILAGE, label: 'Zepsucie', icon: '🦠' },
  { value: WastageCategory.THEFT, label: 'Kradzież', icon: '🚨' },
  { value: WastageCategory.PRODUCTION_ERROR, label: 'Błąd produkcji', icon: '⚠️' },
  { value: WastageCategory.OTHER, label: 'Inne', icon: '📝' },
];

export function WastageDialog({
  stockItem,
  open,
  onOpenChange,
  onSuccess,
}: WastageDialogProps) {
  const [category, setCategory] = useState<WastageCategory | ''>('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form
      setCategory('');
      setQuantity('');
      setReason('');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!stockItem || !category || !quantity || !reason) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const quantityNumber = parseFloat(quantity);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      toast.error('Podaj poprawną ilość');
      return;
    }

    if (quantityNumber > (stockItem.quantity_physical ?? 0)) {
      toast.error(
        `Ilość przekracza stan fizyczny. Dostępne: ${(stockItem.quantity_physical ?? 0).toFixed(2)} ${stockItem.unit}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryRepository.recordWastage(
        stockItem.id,
        quantityNumber,
        category as WastageCategory,
        reason,
        'current-user' // TODO: Get actual user ID
      );

      const categoryLabel =
        WASTAGE_CATEGORIES.find((c) => c.value === category)?.label || category;

      toast.success(
        `Zarejestrowano stratę: ${quantityNumber} ${stockItem.unit} (${categoryLabel})`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to record wastage:', error);
      toast.error(error.message || 'Nie udało się zarejestrować straty');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stockItem) return null;

  const quantityNumber = quantity && !isNaN(parseFloat(quantity)) ? parseFloat(quantity) : 0;
  const estimatedValue = quantityNumber * (stockItem.unit_cost || 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-component="wastage-dialog">
        <DialogHeader>
          <DialogTitle>Rejestracja straty</DialogTitle>
          <DialogDescription>
            Zarejestruj stratę magazynową z podaniem kategorii i przyczyny
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
                <span className="text-muted-foreground">Koszt jednostkowy:</span>{' '}
                <span className="font-medium">
                  {formatCurrency(stockItem.unit_cost || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Wastage Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Kategoria straty *</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as WastageCategory)}>
              <SelectTrigger id="category" data-field="wastage-category">
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                {WASTAGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Ilość straty *</Label>
            <div className="flex gap-2">
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                max={stockItem.quantity_physical ?? 0}
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-field="wastage-quantity"
              />
              <Badge variant="outline" className="px-3 flex items-center">
                {stockItem.unit}
              </Badge>
            </div>
          </div>

          {/* Estimated Value */}
          {quantity && !isNaN(parseFloat(quantity)) && (
            <div className="p-3 rounded-md border bg-red-50 border-red-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">
                  Szacowana wartość straty:
                </span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(estimatedValue)}
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Szczegółowy opis przyczyny *</Label>
            <Textarea
              id="reason"
              placeholder="Np. Produkt znaleziony po dacie ważności podczas inwentaryzacji..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              data-field="wastage-reason"
            />
          </div>

          {/* HACCP Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>HACCP:</strong> Strata zostanie zarejestrowana w dzienniku magazynowym.
              W przypadku strat z przyczyn bezpieczeństwa żywności (zepsucie, przeterminowanie)
              konieczne jest odpowiednie zadokumentowanie zgodnie z procedurami HACCP.
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
              !category ||
              !quantity ||
              !reason ||
              parseFloat(quantity) <= 0 ||
              parseFloat(quantity) > (stockItem.quantity_physical ?? 0)
            }
            data-action="submit-wastage"
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Zapisywanie...' : 'Zarejestruj stratę'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
