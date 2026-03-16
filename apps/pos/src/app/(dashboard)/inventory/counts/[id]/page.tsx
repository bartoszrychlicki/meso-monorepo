'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardList,
  MoreHorizontal,
  Plus,
  Sigma,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { normalizeQuantity } from '@/lib/utils/format-quantity';
import { useInventoryStore } from '@/modules/inventory/store';
import { InventoryCountLine } from '@/types/inventory';
import { InventoryCountStatusBadge } from '@/modules/inventory/components/inventory-count-status-badge';
import { InventoryCountItemPickerDialog } from '@/modules/inventory/components/inventory-count-item-picker-dialog';
import { InventoryCountLineRow } from '@/modules/inventory/components/inventory-count-line-row';

const ALL_CATEGORIES = '__all__';
const UNCATEGORIZED = '__uncategorized__';

type RowFilter = 'all' | 'uncounted' | 'difference';

export default function InventoryCountDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    stockItems,
    inventoryCategories,
    warehouses,
    currentInventoryCount,
    currentInventoryCountLines,
    isInventoryCountLoading,
    inventoryCountLoadError,
    loadAll,
    loadInventoryCountDetail,
    updateInventoryCountComment,
    updateInventoryCountLine,
    addStockItemToInventoryCount,
    approveInventoryCount,
    cancelInventoryCount,
  } = useInventoryStore();

  const [lastLoadedCountId, setLastLoadedCountId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const [pickerWarehouseId, setPickerWarehouseId] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadPageData = useCallback(async () => {
    await Promise.all([loadAll(), loadInventoryCountDetail(id)]);
  }, [id, loadAll, loadInventoryCountDetail]);

  useEffect(() => {
    let cancelled = false;

    void loadPageData().finally(() => {
      if (!cancelled) {
        setLastLoadedCountId(id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, loadPageData]);

  const isInitialLoadPending = lastLoadedCountId !== id;

  useEffect(() => {
    setCommentDraft(currentInventoryCount?.comment ?? '');
  }, [currentInventoryCount?.comment]);

  const warehouseNameById = useMemo(
    () => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [warehouses]
  );

  const filteredLines = useMemo(() => {
    return currentInventoryCountLines.filter((line) => {
      if (categoryFilter !== ALL_CATEGORIES) {
        if (categoryFilter === UNCATEGORIZED && line.edited_inventory_category_id) {
          return false;
        }
        if (categoryFilter !== UNCATEGORIZED && line.edited_inventory_category_id !== categoryFilter) {
          return false;
        }
      }

      if (rowFilter === 'uncounted' && line.counted_quantity !== null) {
        return false;
      }

      if (rowFilter === 'difference' && !hasLineDifference(line)) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const query = searchQuery.toLowerCase();
      return (
        line.stock_item_name.toLowerCase().includes(query) ||
        line.stock_item_sku.toLowerCase().includes(query)
      );
    });
  }, [categoryFilter, currentInventoryCountLines, rowFilter, searchQuery]);

  const groupedLines = useMemo(() => {
    const groups = new Map<string, InventoryCountLine[]>();

    for (const line of filteredLines) {
      const currentGroup = groups.get(line.warehouse_id) ?? [];
      currentGroup.push(line);
      groups.set(line.warehouse_id, currentGroup);
    }

    const warehouseIds =
      currentInventoryCount?.scope === 'all'
        ? warehouses.map((warehouse) => warehouse.id)
        : currentInventoryCount?.warehouse_id
          ? [currentInventoryCount.warehouse_id]
          : [];

    return warehouseIds
      .map((warehouseId) => {
        const lines = groups.get(warehouseId) ?? [];
        return {
          warehouseId,
          warehouseName: lineWarehouseName(lines[0], warehouseId, warehouseNameById),
          lines,
        };
      })
      .sort((a, b) => a.warehouseName.localeCompare(b.warehouseName, 'pl'));
  }, [currentInventoryCount?.scope, currentInventoryCount?.warehouse_id, filteredLines, warehouseNameById, warehouses]);

  const availableItemsForPicker = useMemo(() => {
    if (!pickerWarehouseId) {
      return [];
    }

    const existingIds = new Set(
      currentInventoryCountLines
        .filter((line) => line.warehouse_id === pickerWarehouseId)
        .map((line) => line.stock_item_id)
    );

    return stockItems.filter((item) => item.is_active && !existingIds.has(item.id));
  }, [currentInventoryCountLines, pickerWarehouseId, stockItems]);

  const hasUncountedLines = currentInventoryCountLines.some((line) => line.counted_quantity === null);
  const differenceLinesCount = currentInventoryCountLines.filter(hasLineDifference).length;

  const handleCommentSave = async () => {
    if (!currentInventoryCount || currentInventoryCount.status !== 'draft') {
      return;
    }

    if ((commentDraft || '') === (currentInventoryCount.comment ?? '')) {
      return;
    }

    try {
      await updateInventoryCountComment(currentInventoryCount.id, commentDraft);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udalo sie zapisac komentarza';
      toast.error(message);
    }
  };

  const handleApprove = async () => {
    if (!currentInventoryCount) {
      return;
    }

    setIsApproving(true);
    try {
      await approveInventoryCount(currentInventoryCount.id);
      toast.success('Inwentaryzacja zostala zatwierdzona');
      setApproveDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udalo sie zatwierdzic inwentaryzacji';
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!currentInventoryCount) {
      return;
    }

    setIsCancelling(true);
    try {
      await cancelInventoryCount(currentInventoryCount.id);
      toast.success('Inwentaryzacja zostala anulowana');
      setCancelDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udalo sie anulowac inwentaryzacji';
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  };

  if ((isInitialLoadPending || isInventoryCountLoading) && !currentInventoryCount) {
    return (
      <div className="space-y-6" data-page="inventory-count-detail">
        <PageHeader title="Ladowanie..." />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  if (!currentInventoryCount) {
    return (
      <div className="space-y-6" data-page="inventory-count-detail">
        <PageHeader title="Nie udalo sie zaladowac inwentaryzacji" />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Brak danych inwentaryzacji</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{inventoryCountLoadError ?? 'Nie udalo sie pobrac danych. Sprobuj ponownie.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadPageData()}>
                Sprobuj ponownie
              </Button>
              <Link href="/inventory">
                <Button variant="ghost">Powrot do magazynu</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isDraft = currentInventoryCount.status === 'draft';

  return (
    <div className="space-y-6" data-page="inventory-count-detail" data-id={currentInventoryCount.id}>
      <PageHeader
        title={currentInventoryCount.number}
        description={`Zakres: ${currentInventoryCount.warehouse_name ?? 'Wszystkie magazyny'}`}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            <Link href="/inventory">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrot
              </Button>
            </Link>
            <InventoryCountStatusBadge status={currentInventoryCount.status} />
            {isDraft && (
              <>
                <Button
                  onClick={() => setApproveDialogOpen(true)}
                  disabled={hasUncountedLines}
                  data-action="approve-inventory-count"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Zatwierdz
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-action="inventory-count-more-actions">
                      <MoreHorizontal className="mr-2 h-4 w-4" />
                      Wiecej
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setCancelDialogOpen(true)}
                      variant="destructive"
                      data-action="cancel-inventory-count"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Anuluj dokument
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        }
      />

      {inventoryCountLoadError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Niepelne dane inwentaryzacji</AlertTitle>
          <AlertDescription>
            <p>{inventoryCountLoadError}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Pozycji lacznie"
          value={currentInventoryCount.total_lines ?? currentInventoryCountLines.length}
          compact
        />
        <KpiCard
          icon={<Check className="h-5 w-5" />}
          label="Policzone"
          value={currentInventoryCount.counted_lines ?? 0}
          compact
        />
        <KpiCard
          icon={<Sigma className="h-5 w-5" />}
          label="Roznice"
          value={differenceLinesCount}
          compact
        />
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium">Komentarz dokumentu</p>
          <Textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            onBlur={() => void handleCommentSave()}
            disabled={!isDraft}
            rows={3}
            placeholder="Opcjonalny komentarz do calej inwentaryzacji..."
            data-field="inventory-count-comment"
          />
          <p className="text-xs text-muted-foreground">
            Zmiany w wierszach i komentarzu zapisuja sie automatycznie po opuszczeniu pola.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
        <Input
          placeholder="Szukaj po nazwie lub SKU..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          data-field="inventory-count-search"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger data-field="inventory-count-category-filter">
            <SelectValue placeholder="Wszystkie kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Wszystkie kategorie</SelectItem>
            <SelectItem value={UNCATEGORIZED}>Bez kategorii</SelectItem>
            {inventoryCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rowFilter} onValueChange={(value) => setRowFilter(value as RowFilter)}>
          <SelectTrigger data-field="inventory-count-row-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie pozycje</SelectItem>
            <SelectItem value="uncounted">Niepoliczone</SelectItem>
            <SelectItem value="difference">Tylko roznice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {groupedLines.every((group) => group.lines.length === 0) ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Brak wynikow</AlertTitle>
          <AlertDescription>
            Zmniejsz filtry, wyczysc wyszukiwanie albo dodaj pozycje recznie do wybranego magazynu.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-6">
        {groupedLines.map((group) => (
          <section key={group.warehouseId} className="space-y-3" data-warehouse-id={group.warehouseId}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{group.warehouseName}</h2>
                <p className="text-sm text-muted-foreground">
                  {group.lines.length} pozycji w aktualnym widoku
                </p>
              </div>
              {isDraft && (
                <Button
                  variant="outline"
                  onClick={() => setPickerWarehouseId(group.warehouseId)}
                  data-action="add-stock-item-to-count"
                  data-warehouse-id={group.warehouseId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj pozycje
                </Button>
              )}
            </div>

            {group.lines.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                Brak pozycji w aktualnym widoku.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-3 font-medium">Pozycja</th>
                      <th className="w-[170px] px-3 py-3 font-medium">Kategoria</th>
                      <th className="w-[150px] px-3 py-3 font-medium text-right">Stan teoretyczny</th>
                      <th className="w-[180px] px-3 py-3 font-medium">Stan policzony</th>
                      <th className="w-[140px] px-3 py-3 font-medium text-right">Roznica</th>
                      <th className="w-[200px] px-3 py-3 font-medium">Polozenie</th>
                      <th className="w-[200px] px-3 py-3 font-medium">Uwaga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lines.map((line) => (
                      <InventoryCountLineRow
                        key={line.id}
                        line={line}
                        categories={inventoryCategories}
                        isReadonly={!isDraft}
                        onSave={updateInventoryCountLine}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>

      <InventoryCountItemPickerDialog
        open={pickerWarehouseId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPickerWarehouseId(null);
          }
        }}
        availableItems={availableItemsForPicker}
        onSelect={async (stockItemId) => {
          if (!pickerWarehouseId || !currentInventoryCount) {
            return false;
          }

          try {
            await addStockItemToInventoryCount(currentInventoryCount.id, pickerWarehouseId, stockItemId);
            toast.success('Dodano pozycje do inwentaryzacji');
            return true;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Nie udalo sie dodac pozycji';
            toast.error(message);
            return false;
          }
        }}
      />

      <ConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title="Zatwierdzic inwentaryzacje?"
        description="Po zatwierdzeniu system ustawi realne stany magazynowe zgodnie z wpisanymi wartosciami."
        confirmLabel={isApproving ? 'Zatwierdzanie...' : 'Zatwierdz'}
        onConfirm={() => {
          void handleApprove();
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Anulowac inwentaryzacje?"
        description="Anulowanie zamknie dokument bez zmiany realnych stanow magazynowych."
        confirmLabel={isCancelling ? 'Anulowanie...' : 'Anuluj dokument'}
        variant="destructive"
        onConfirm={() => {
          void handleCancel();
        }}
      />
    </div>
  );
}

function lineWarehouseName(
  line: InventoryCountLine,
  warehouseId: string,
  warehouseNameById: Map<string, string>
): string {
  return line.warehouse_name ?? warehouseNameById.get(warehouseId) ?? 'Nieznany magazyn';
}

function hasLineDifference(line: InventoryCountLine): boolean {
  if (line.counted_quantity === null) {
    return false;
  }

  return normalizeQuantity(line.counted_quantity - line.expected_quantity) !== 0;
}
