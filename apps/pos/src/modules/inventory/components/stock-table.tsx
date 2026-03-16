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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { WarehouseStockItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { formatQuantity } from '@/lib/utils/format-quantity';
import { Plus, Minus, Package, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { toast } from 'sonner';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface StockTableProps {
  items: WarehouseStockItem[];
  showWarehouseColumn?: boolean;
  onAdjustStock?: (warehouseId: string, stockItemId: string, quantity: number, reason: string) => Promise<void>;
  onDeleteStockItem?: (stockItemId: string) => Promise<void>;
}

function getStockStatus(item: WarehouseStockItem): { label: string; color: string } {
  const ratio = item.quantity / item.min_quantity;
  if (ratio < 0.5) return { label: 'Krytyczny', color: 'bg-red-100 text-red-800' };
  if (ratio < 1) return { label: 'Niski stan', color: 'bg-amber-100 text-amber-800' };
  return { label: 'OK', color: 'bg-green-100 text-green-800' };
}

function getQuantityColor(item: WarehouseStockItem): string {
  const ratio = item.quantity / item.min_quantity;
  if (ratio < 0.5) return 'text-red-600 font-bold';
  if (ratio < 1) return 'text-amber-600 font-semibold';
  return 'text-green-700';
}

export function StockTable({ items, showWarehouseColumn, onAdjustStock, onDeleteStockItem }: StockTableProps) {
  const [adjustDialog, setAdjustDialog] = useState<WarehouseStockItem | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<WarehouseStockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdjust = async () => {
    if (!adjustDialog || adjustQty === 0 || !onAdjustStock) return;
    setIsSubmitting(true);
    try {
      await onAdjustStock(adjustDialog.warehouse_id, adjustDialog.id, adjustQty, adjustReason);
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

  const handleDelete = async () => {
    if (!deleteDialog || !onDeleteStockItem) return;
    setIsDeleting(true);
    try {
      await onDeleteStockItem(deleteDialog.id);
      toast.success(`Usunieto pozycje: ${deleteDialog.name}`);
      setDeleteDialog(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udalo sie usunac pozycji';
      toast.error(message);
    } finally {
      setIsDeleting(false);
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
      <div className="rounded-md border overflow-x-auto" data-component="stock-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pozycja</TableHead>
              <TableHead>Lokalizacja</TableHead>
              <TableHead className="text-right">Stan</TableHead>
              <TableHead>Koszt / status</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const status = getStockStatus(item);
              const qtyColor = getQuantityColor(item);

              return (
                <TableRow key={item.warehouse_stock_id} data-id={item.id} data-warehouse-id={item.warehouse_id}>
                  <TableCell className="min-w-[240px]">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-medium hover:text-primary hover:underline"
                        data-action="view-stock-item"
                        data-id={item.id}
                      >
                        {item.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{item.sku} • {item.unit}</span>
                        {item.allergens.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {item.allergens.length} alerg.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="flex flex-col gap-1 text-sm">
                      {showWarehouseColumn ? (
                        <span className="font-medium">{item.warehouse_name}</span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {item.storage_location || 'Brak polozenia'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px] text-right">
                    <div className="flex flex-col gap-1">
                      <span className={`font-semibold ${qtyColor}`}>
                        {formatQuantity(item.quantity)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Min {formatQuantity(item.min_quantity)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className={`w-fit border-0 ${status.color}`}
                        data-status={status.label}
                      >
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.cost_per_unit)} / {item.unit}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/inventory/${item.id}`}>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          data-action="edit-stock-item"
                          data-id={item.id}
                          title="Edytuj pozycje"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </Link>
                      {onAdjustStock && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setAdjustDialog(item);
                            setAdjustQty(0);
                          }}
                          data-action="adjust-stock"
                          data-id={item.id}
                        >
                          Korekta
                        </Button>
                      )}
                      {onDeleteStockItem ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              data-action="stock-item-actions-menu"
                              data-id={item.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDeleteDialog(item)}
                              variant="destructive"
                              data-action="delete-stock-item"
                              data-id={item.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usun pozycje
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </TableCell>
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
            <DialogDescription>
              Wprowadz korekte ilosci i zapisz powod zmiany stanu magazynowego.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Aktualny stan:</span>
              <span className="font-medium">
                {formatQuantity(adjustDialog?.quantity)} {adjustDialog?.unit}
              </span>
            </div>
            {adjustDialog?.warehouse_name && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Magazyn:</span>
                <span className="font-medium">{adjustDialog.warehouse_name}</span>
              </div>
            )}
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
                  {formatQuantity((adjustDialog?.quantity ?? 0) + adjustQty)}{' '}
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

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog(null);
          }
        }}
        title="Usun pozycje magazynowa?"
        description={`Ta operacja usunie pozycje "${deleteDialog?.name ?? ''}" oraz jej stany we wszystkich magazynach. Tej operacji nie mozna cofnac.`}
        confirmLabel={isDeleting ? 'Usuwanie...' : 'Usun pozycje'}
        onConfirm={() => {
          void handleDelete();
        }}
        variant="destructive"
      />
    </>
  );
}
