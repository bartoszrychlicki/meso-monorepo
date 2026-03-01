'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { seedAll } from '@/seed';
import { formatCurrency, formatTime } from '@/lib/utils';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/constants';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  Activity,
  AlertTriangle,
  Package,
  Star,
} from 'lucide-react';
import { Order } from '@/types/order';
import { Product } from '@/types/menu';
import { OrderStatus } from '@/types/enums';

const STORAGE_PREFIX = 'mesopos_';

function loadFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

interface StockItem {
  id: string;
  name: string;
  current_stock: number;
  min_stock_level: number;
  unit: string;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  useEffect(() => {
    seedAll();
    // Load data from localStorage
    const loadedOrders = loadFromStorage<Order>('orders');
    const loadedProducts = loadFromStorage<Product>('products');
    const loadedStock = loadFromStorage<StockItem>('stock_items');
    setOrders(loadedOrders);
    setProducts(loadedProducts);
    setStockItems(loadedStock);
    setIsLoading(false);
  }, []);

  // Compute KPI stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart);
    const deliveredToday = todayOrders.filter((o) => o.status === OrderStatus.DELIVERED);

    const revenueToday = deliveredToday.reduce((sum, o) => sum + o.total, 0);
    const orderCountToday = todayOrders.length;
    const avgOrderValue = orderCountToday > 0 ? revenueToday / Math.max(deliveredToday.length, 1) : 0;

    const activeOrders = orders.filter(
      (o) =>
        o.status !== OrderStatus.DELIVERED &&
        o.status !== OrderStatus.CANCELLED
    );

    // Average prep time from all orders (simulated)
    const avgPrepTime = orders.length > 0 ? 12 : 0;

    return {
      revenueToday,
      orderCountToday,
      avgOrderValue,
      avgPrepTime,
      activeOrderCount: activeOrders.length,
    };
  }, [orders]);

  // Recent orders (last 5)
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [orders]);

  // Top products by frequency in orders
  const topProducts = useMemo(() => {
    const productCounts: Record<string, { name: string; count: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!productCounts[item.product_id]) {
          productCounts[item.product_id] = { name: item.product_name, count: 0 };
        }
        productCounts[item.product_id].count += item.quantity;
      }
    }
    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));
  }, [orders]);

  // Low stock alerts
  const lowStockAlerts = useMemo(() => {
    return stockItems.filter((item) => item.current_stock <= item.min_stock_level);
  }, [stockItems]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="dashboard">
        <PageHeader title="Dashboard" description="Przeglad najwazniejszych wskaznikow" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="dashboard">
      <PageHeader
        title="Dashboard"
        description="Przeglad najwazniejszych wskaznikow"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Przychod dzisiaj"
          value={formatCurrency(stats.revenueToday)}
          trend={stats.revenueToday > 0 ? { direction: 'up', percentage: 12 } : undefined}
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
        />
        <KpiCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Zamowienia dzisiaj"
          value={stats.orderCountToday}
          trend={stats.orderCountToday > 0 ? { direction: 'up', percentage: 8 } : undefined}
          className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Srednia wartosc"
          value={formatCurrency(stats.avgOrderValue)}
          className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Czas realizacji"
          value={stats.avgPrepTime > 0 ? `${stats.avgPrepTime} min` : '-'}
          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
        />
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          label="Aktywne zamowienia"
          value={stats.activeOrderCount}
          className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20"
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Card className="py-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              Ostatnie zamowienia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Brak zamowien
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    data-id={order.id}
                    data-component="recent-order"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          #{order.order_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customer_name ?? 'Klient'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatCurrency(order.total)}
                      </span>
                      <StatusBadge
                        status={order.status}
                        colorMap={ORDER_STATUS_COLORS}
                        labelMap={ORDER_STATUS_LABELS}
                      />
                      <span className="text-xs text-muted-foreground">
                        {formatTime(order.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card className="py-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-muted-foreground" />
              Top 5 produktow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Brak danych o produktach
              </p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    data-id={product.id}
                    data-component="top-product"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{product.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {product.count} szt.
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Alerts */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 py-4 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Alerty magazynowe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockAlerts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-amber-950/30"
                  data-id={item.id}
                  data-component="stock-alert"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                      {item.current_stock} / {item.min_stock_level} {item.unit}
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200">
                      Niski stan
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* If no alerts, show a positive status */}
      {lowStockAlerts.length === 0 && stockItems.length > 0 && (
        <Card className="border-green-200 bg-green-50/50 py-4 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Stany magazynowe w normie
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Wszystkie produkty maja wystarczajacy zapas
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
