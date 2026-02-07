'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StockItem } from '@/types/inventory';
import { AlertTriangle, ShoppingCart } from 'lucide-react';

interface StockAlertCardProps {
  lowStockItems: StockItem[];
}

export function StockAlertCard({ lowStockItems }: StockAlertCardProps) {
  if (lowStockItems.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50/50" data-component="stock-alert-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Niski stan magazynowy ({lowStockItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lowStockItems.map((item) => {
            const deficit = item.min_quantity - item.quantity_available;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-3"
                data-id={item.id}
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Stan:{' '}
                    <span className="text-red-600 font-semibold">
                      {item.quantity_available} {item.unit}
                    </span>
                    {' / Min: '}
                    {item.min_quantity} {item.unit}
                    {' (brakuje: '}
                    <span className="text-red-600">{deficit} {item.unit}</span>)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  data-action="order"
                  data-id={item.id}
                >
                  <ShoppingCart className="mr-1 h-3 w-3" />
                  Zamów
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
