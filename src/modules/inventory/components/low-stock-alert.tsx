/**
 * Low Stock Alert Widget
 *
 * Shows stock items below minimum quantity threshold.
 */

'use client';

import { useEffect, useState } from 'react';
import { StockItem } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown, Package } from 'lucide-react';
import { inventoryRepository } from '@/modules/inventory/repository';
import Link from 'next/link';

interface LowStockAlertProps {
  maxItems?: number;
}

export function LowStockAlert({ maxItems = 5 }: LowStockAlertProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const lowStock = await inventoryRepository.getLowStockItems();
        setStockItems(lowStock.slice(0, maxItems));
      } catch (error) {
        console.error('Failed to load low stock items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [maxItems]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Niskie stany magazynowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (stockItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-green-600" />
            Niskie stany magazynowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ✅ Wszystkie produkty mają wystarczający stan magazynowy
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200" data-component="low-stock-alert">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Niskie stany magazynowe
          </CardTitle>
          <Badge variant="destructive">{stockItems.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stockItems.map((item) => {
          const percentOfMin = (item.quantity_available / item.min_quantity) * 100;
          const severity =
            percentOfMin < 25
              ? 'critical'
              : percentOfMin < 50
              ? 'warning'
              : 'info';

          return (
            <div
              key={item.id}
              className={`p-3 rounded-md border ${
                severity === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : severity === 'warning'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    SKU: {item.sku}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Dostępne: {item.quantity_available.toFixed(2)} {item.unit}
                    </div>
                    <div className="text-muted-foreground">
                      Min: {item.min_quantity.toFixed(2)} {item.unit}
                    </div>
                  </div>
                  {item.quantity_reserved > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Zarezerwowane: {item.quantity_reserved.toFixed(2)} {item.unit}
                    </div>
                  )}
                  {item.quantity_in_transit > 0 && (
                    <div className="text-xs text-blue-600">
                      W drodze: {item.quantity_in_transit.toFixed(2)} {item.unit}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <Badge
                    variant={severity === 'critical' ? 'destructive' : 'outline'}
                    className={
                      severity === 'warning'
                        ? 'bg-orange-100 text-orange-700'
                        : severity === 'info'
                        ? 'bg-yellow-100 text-yellow-700'
                        : ''
                    }
                  >
                    {percentOfMin.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}

        <Link href="/inventory">
          <Button variant="outline" className="w-full" size="sm">
            Zobacz magazyn
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
