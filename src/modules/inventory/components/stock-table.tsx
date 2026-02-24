'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { StockItem } from '@/types/inventory';
import { AllergenBadges } from '@/modules/menu/components/allergen-badges';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus, Package } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { toast } from 'sonner';

interface StockTableProps {
  items: StockItem[];
  onAdjustStock?: (itemId: string, quantity: number, reason: string) => Promise<void>;
}

function getStockStatus(item: StockItem): { label: string; color: string } {
  const ratio = item.quantity / item.min_quantity;
  if (ratio < 0.5) return { label: 'Krytyczny', color: 'bg-red-100 text-red-800' };
  if (ratio < 1) return { label: 'Niski stan', color: 'bg-amber-100 text-amber-800' };
  return { label: 'OK', color: 'bg-green-100 text-green-800' };
}

function getQuantityColor(item: StockItem): string {
  const ratio = item.quantity / item.min_quantity;
  if (ratio < 0.5) return 'text-red-600 font-bold';
  if (ratio < 1) return 'text-amber-600 font-semibold';
  return 'text-green-700';
}

export function StockTable({ items, onAdjustStock }: StockTableProps) {
  const [adjustDialog, setAdjustDialog] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdjust = async () => {
    if (!adjustDialog || adjustQty === 0 || !onAdjustStock) return;
    setIsSubmitting(true);
    try {
      await onAdjustStock(adjustDialog.id, adjustQty, adjustReason);
      toast.success(`Stan magazynowy zaktualizowany: ${adjustDialog.name}`);
      setAdjustDialog(null);
      setAdjustQty(0);
      setAdjustReason('');
    } catch {
      toast.error('Nie udalo sie zaktualizowac stanu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-6 w-6" />}
        title="Brak pozycji magazynowych"
        description="Dodaj pierwsza pozycje aby rozpoczac."
      />
    );
  }

  return (
    <>
      <div className="rounded-md border" data-component="stock-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="hidden sm:table-cell">Jednostka</TableHead>
              <TableHead className="text-right">Ilosc</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Min</TableHead>
              <TableHead className="text-right hidden md:table-cell">Koszt/jedn.</TableHead>
              <TableHead className="hidden lg:table-cell">Alergeny</TableHead>
              <TableHead>Status</TableHead>
              {onAdjustStock && <TableHead className="w-[100px]">Akcje</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const status = getStockStatus(item);
              const qtyColor = getQuantityColor(item);

              return (
                <TableRow key={item.id} data-id={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {item.sku}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {item.unit}
                  </TableCell>
                  <TableCell className={`text-right ${qtyColor}`}>
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                    {item.min_quantity}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                    {formatCurrency(item.cost_per_unit)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <AllergenBadges allergens={item.allergens} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-0 ${status.color}`}
                      data-status={status.label}
                    >
                      {status.label}
                    </Badge>
                  </TableCell>
                  {onAdjustStock && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setAdjustDialog(item);
                            setAdjustQty(1);
                          }}
                          data-action="adjust-stock-plus"
                          data-id={item.id}
                          title="Zwieksz stan"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setAdjustDialog(item);
                            setAdjustQty(-1);
                          }}
                          data-action="adjust-stock-minus"
                          data-id={item.id}
                          title="Zmniejsz stan"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!adjustDialog}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustDialog(null);
            setAdjustQty(0);
            setAdjustReason('');
          }
        }}
      >
        <DialogContent data-component="adjust-stock-dialog">
          <DialogHeader>
            <DialogTitle>Korekta stanu: {adjustDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Aktualny stan:</span>
              <span className="font-medium">
                {adjustDialog?.quantity} {adjustDialog?.unit}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Zmiana ilosci</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustQty((q) => q - 1)}
                  data-action="decrease-qty"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="text-center"
                  data-field="adjust-quantity"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustQty((q) => q + 1)}
                  data-action="increase-qty"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Nowy stan:{' '}
                <span className="font-medium">
                  {(adjustDialog?.quantity ?? 0) + adjustQty}{' '}
                  {adjustDialog?.unit}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Powod korekty</Label>
              <Input
                placeholder="np. Dostawa, inwentaryzacja..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                data-field="adjust-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialog(null)}
              data-action="cancel-adjust"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustQty === 0 || isSubmitting}
              data-action="confirm-adjust"
            >
              Potwierdz korekte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
