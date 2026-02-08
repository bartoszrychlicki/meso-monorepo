'use client';

import { useMemo, useState } from 'react';
import { StockCount } from '@/types/inventory';
import { StockCountType, StockCountStatus } from '@/types/enums';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getStockCountTypeLabel, getStockCountTypeIcon } from '../utils/stock-count-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StockCountListProps {
  stockCounts: StockCount[];
  warehouses?: { id: string; name: string }[];
}

export function StockCountList({ stockCounts, warehouses = [] }: StockCountListProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Group by status
  const countsByStatus = useMemo(() => {
    return {
      draft: stockCounts.filter((c) => c.status === StockCountStatus.DRAFT),
      in_progress: stockCounts.filter((c) => c.status === StockCountStatus.IN_PROGRESS),
      completed: stockCounts.filter((c) => c.status === StockCountStatus.COMPLETED),
      approved: stockCounts.filter((c) => c.status === StockCountStatus.APPROVED),
    };
  }, [stockCounts]);

  // Filter counts
  const filteredCounts = useMemo(() => {
    return stockCounts.filter((c) => {
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [stockCounts, typeFilter, statusFilter]);

  // Sort by scheduled_date desc
  const sortedCounts = useMemo(() => {
    return [...filteredCounts].sort(
      (a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
    );
  }, [filteredCounts]);

  const getWarehouseName = (id: string) => {
    const warehouse = warehouses.find((w) => w.id === id);
    return warehouse?.name ?? id;
  };

  const getStatusBadge = (status: StockCountStatus) => {
    const colors = {
      [StockCountStatus.DRAFT]: 'bg-gray-100 text-gray-700',
      [StockCountStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
      [StockCountStatus.COMPLETED]: 'bg-yellow-100 text-yellow-700',
      [StockCountStatus.APPROVED]: 'bg-green-100 text-green-700',
    };

    const labels = {
      [StockCountStatus.DRAFT]: 'Szkic',
      [StockCountStatus.IN_PROGRESS]: 'W trakcie',
      [StockCountStatus.COMPLETED]: 'Zakończone',
      [StockCountStatus.APPROVED]: 'Zatwierdzone',
    };

    return (
      <Badge variant="outline" className={colors[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const calculateVarianceStats = (count: StockCount) => {
    const items = count.items || [];
    const itemsWithVariance = items.filter((i) => i.variance && i.variance !== 0);
    const totalVarianceValue = items.reduce((sum, i) => sum + (i.variance_cost || 0), 0);

    return {
      totalItems: items.length,
      itemsWithVariance: itemsWithVariance.length,
      totalVarianceValue,
    };
  };

  if (stockCounts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Brak inwentaryzacji
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-component="stock-count-list">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              📝 Szkice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {countsByStatus.draft.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Zaplanowane</p>
          </CardContent>
        </Card>

        <Card className={countsByStatus.in_progress.length > 0 ? 'border-blue-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              W trakcie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {countsByStatus.in_progress.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Liczenie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-yellow-600" />
              Zakończone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {countsByStatus.completed.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Do zatwierdzenia</p>
          </CardContent>
        </Card>

        <Card className={countsByStatus.approved.length > 0 ? 'border-green-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Zatwierdzone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {countsByStatus.approved.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Zakończone</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-sm font-medium">
            Typ:
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger id="type-filter" className="w-48">
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {Object.values(StockCountType).map((type) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <span>{getStockCountTypeIcon(type)}</span>
                    <span>{getStockCountTypeLabel(type)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium">
            Status:
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="w-48">
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value={StockCountStatus.DRAFT}>Szkice</SelectItem>
              <SelectItem value={StockCountStatus.IN_PROGRESS}>W trakcie</SelectItem>
              <SelectItem value={StockCountStatus.COMPLETED}>Zakończone</SelectItem>
              <SelectItem value={StockCountStatus.APPROVED}>Zatwierdzone</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stock Counts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Inwentaryzacje</span>
            <Badge variant="outline">{sortedCounts.length} inwentaryzacji</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numer</TableHead>
                  <TableHead>Magazyn</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pozycje</TableHead>
                  <TableHead>Warianty</TableHead>
                  <TableHead className="text-right">Wartość wariancji</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCounts.map((count) => {
                  const stats = calculateVarianceStats(count);
                  return (
                    <TableRow key={count.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{count.count_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getWarehouseName(count.warehouse_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getStockCountTypeIcon(count.type)}</span>
                          <span className="text-sm">
                            {getStockCountTypeLabel(count.type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(count.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(count.scheduled_date).toLocaleDateString('pl-PL')}
                        </div>
                        {count.completed_at && (
                          <div className="text-xs text-muted-foreground">
                            Zakończono:{' '}
                            {new Date(count.completed_at).toLocaleDateString('pl-PL')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{stats.totalItems} pozycji</div>
                      </TableCell>
                      <TableCell>
                        {stats.itemsWithVariance > 0 ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-600">
                              {stats.itemsWithVariance}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">Zgodne</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {stats.totalVarianceValue !== 0 ? (
                          <div
                            className={`font-medium ${
                              stats.totalVarianceValue > 0
                                ? 'text-blue-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(Math.abs(stats.totalVarianceValue))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
