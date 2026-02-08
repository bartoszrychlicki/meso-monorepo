/**
 * Expiring Batches Alert Widget
 *
 * Shows batches expiring soon with visual alerts.
 */

'use client';

import { useEffect, useState } from 'react';
import { Batch, StockItem } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Package } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import { getDaysUntilExpiry } from '../utils/batch-status';
import Link from 'next/link';

interface ExpiringBatchesAlertProps {
  daysAhead?: number;
  maxItems?: number;
}

export function ExpiringBatchesAlert({
  daysAhead = 7,
  maxItems = 5,
}: ExpiringBatchesAlertProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stockItems, setStockItems] = useState<Map<string, StockItem>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const expiringBatches = await inventoryRepository.getExpiringBatches(daysAhead);
        setBatches(expiringBatches.slice(0, maxItems));

        // Load stock items for these batches
        const items = await inventoryRepository.getAllStockItems();
        const itemsMap = new Map(items.map((item) => [item.id, item]));
        setStockItems(itemsMap);
      } catch (error) {
        console.error('Failed to load expiring batches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [daysAhead, maxItems]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Partie kończące przydatność
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-green-600" />
            Partie kończące przydatność
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ✅ Brak partii kończących przydatność w ciągu {daysAhead} dni
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200" data-component="expiring-batches-alert">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Partie kończące przydatność
          </CardTitle>
          <Badge variant="destructive">{batches.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {batches.map((batch) => {
          const daysUntil = getDaysUntilExpiry(batch);
          const stockItem = stockItems.get(batch.stock_item_id);
          const severity =
            daysUntil !== null && daysUntil < 3
              ? 'critical'
              : daysUntil !== null && daysUntil < 7
              ? 'warning'
              : 'info';

          return (
            <div
              key={batch.id}
              className={`p-3 rounded-md border ${
                severity === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : severity === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm">
                    {stockItem?.name || 'Nieznany produkt'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Partia: {batch.batch_number}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {batch.expiry_date &&
                        new Date(batch.expiry_date).toLocaleDateString('pl-PL')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {batch.quantity_current.toFixed(2)} {stockItem?.unit || ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={severity === 'critical' ? 'destructive' : 'outline'}
                    className={
                      severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : severity === 'info'
                        ? 'bg-blue-100 text-blue-700'
                        : ''
                    }
                  >
                    {daysUntil !== null
                      ? daysUntil === 0
                        ? 'Dziś!'
                        : daysUntil === 1
                        ? '1 dzień'
                        : `${daysUntil} dni`
                      : 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}

        <Link href="/inventory/batches">
          <Button variant="outline" className="w-full" size="sm">
            Zobacz wszystkie partie
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
