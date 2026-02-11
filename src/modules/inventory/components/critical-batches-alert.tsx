/**
 * Critical Batches Alert Widget
 *
 * Shows batches with CRITICAL or EXPIRED status that require immediate action.
 * Critical for food safety and HACCP compliance.
 */

'use client';

import { useEffect, useState } from 'react';
import { Batch, StockItem } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import Link from 'next/link';
import { differenceInDays, differenceInHours } from 'date-fns';

interface CriticalBatchesAlertProps {
  warehouseId?: string;
  maxItems?: number;
}

interface BatchWithItem extends Batch {
  stockItemName?: string;
  stockItemSku?: string;
  unit?: string;
}

export function CriticalBatchesAlert({ warehouseId, maxItems = 10 }: CriticalBatchesAlertProps) {
  const [criticalBatches, setCriticalBatches] = useState<BatchWithItem[]>([]);
  const [expiredBatches, setExpiredBatches] = useState<BatchWithItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [critical, expired, stockItems] = await Promise.all([
          inventoryRepository.getCriticalBatches(),
          inventoryRepository.getExpiredBatches(),
          inventoryRepository.getAllStockItems(),
        ]);

        // Filter by warehouse if specified
        const filterByWarehouse = (batches: Batch[]) =>
          warehouseId
            ? batches.filter((b) => b.warehouse_id === warehouseId)
            : batches;

        // Enrich with stock item names
        const enrichBatches = (batches: Batch[]): BatchWithItem[] =>
          batches.map((batch) => {
            const stockItem = stockItems.find((s) => s.id === batch.stock_item_id);
            return {
              ...batch,
              stockItemName: stockItem?.name,
              stockItemSku: stockItem?.sku,
              unit: stockItem?.unit,
            };
          });

        const filteredCritical = filterByWarehouse(critical);
        const filteredExpired = filterByWarehouse(expired);

        setCriticalBatches(
          enrichBatches(filteredCritical)
            .sort((a, b) => {
              const dateA = new Date(a.expiry_date || 0);
              const dateB = new Date(b.expiry_date || 0);
              return dateA.getTime() - dateB.getTime();
            })
            .slice(0, maxItems)
        );

        setExpiredBatches(
          enrichBatches(filteredExpired)
            .sort((a, b) => {
              const dateA = new Date(a.expiry_date || 0);
              const dateB = new Date(b.expiry_date || 0);
              return dateB.getTime() - dateA.getTime();
            })
            .slice(0, maxItems)
        );
      } catch (error) {
        console.error('Failed to load critical batches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [warehouseId, maxItems]);

  const totalCritical = criticalBatches.length + expiredBatches.length;

  const getTimeUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const days = differenceInDays(expiry, now);
    const hours = differenceInHours(expiry, now) % 24;

    if (days < 0) {
      return `Przeterminowane ${Math.abs(days)} dni temu`;
    }
    if (days === 0) {
      return `Wygasa za ${hours}h`;
    }
    return `Wygasa za ${days} dni`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Partie krytyczne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (totalCritical === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            Partie krytyczne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ✅ Brak partii krytycznych lub przeterminowanych
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200" data-component="critical-batches-alert">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Partie krytyczne
          </CardTitle>
          <Badge variant="destructive">{totalCritical}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Expired Batches */}
        {expiredBatches.length > 0 && (
          <>
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              🚫 Przeterminowane ({expiredBatches.length})
            </div>
            {expiredBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-3 rounded-md border bg-red-50 border-red-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-sm text-red-900">
                      {batch.stockItemName || 'Unknown'}
                    </div>
                    <div className="text-xs text-red-700">
                      SKU: {batch.stockItemSku || batch.stock_item_id}
                    </div>
                    <div className="text-xs text-red-700">
                      Partia: {batch.batch_number}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <X className="h-3 w-3 text-red-600" />
                        {batch.expiry_date && getTimeUntilExpiry(batch.expiry_date)}
                      </div>
                      <div className="text-red-600 font-medium">
                        {batch.quantity_current.toFixed(2)} {batch.unit || 'szt'}
                      </div>
                    </div>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    EXPIRED
                  </Badge>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Critical Batches */}
        {criticalBatches.length > 0 && (
          <>
            {expiredBatches.length > 0 && <div className="border-t my-2" />}
            <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              ⚠️ Krytyczne ({criticalBatches.length})
            </div>
            {criticalBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-3 rounded-md border bg-orange-50 border-orange-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-sm text-orange-900">
                      {batch.stockItemName || 'Unknown'}
                    </div>
                    <div className="text-xs text-orange-700">
                      SKU: {batch.stockItemSku || batch.stock_item_id}
                    </div>
                    <div className="text-xs text-orange-700">
                      Partia: {batch.batch_number}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-orange-600" />
                        {batch.expiry_date && getTimeUntilExpiry(batch.expiry_date)}
                      </div>
                      <div className="text-orange-600 font-medium">
                        {batch.quantity_current.toFixed(2)} {batch.unit || 'szt'}
                      </div>
                    </div>
                    {batch.opened_date && (
                      <div className="text-xs text-orange-600">
                        Otwarte: {new Date(batch.opened_date).toLocaleDateString('pl-PL')}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-orange-100 text-orange-700 border-orange-300 shrink-0"
                  >
                    CRITICAL
                  </Badge>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="pt-2 border-t">
          <Link href="/inventory/batches">
            <Button variant="outline" className="w-full" size="sm">
              Zobacz wszystkie partie
            </Button>
          </Link>
        </div>

        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ⚠️ <strong>HACCP:</strong> Przeterminowane partie muszą być natychmiast usunięte
          z magazynu. Krytyczne partie należy zużyć w pierwszej kolejności (FEFO).
        </div>
      </CardContent>
    </Card>
  );
}
