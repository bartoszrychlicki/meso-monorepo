'use client';

import { useMemo, useState } from 'react';
import { WastageRecord } from '@/types/inventory';
import { WastageCategory } from '@/types/enums';
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
import { formatCurrency } from '@/lib/utils';
import {
  getWastageCategoryLabel,
  getWastageCategoryIcon,
  getWastageCategoryColor,
  groupWastageByCategory,
} from '../utils/wastage-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WastageListProps {
  wastageRecords: WastageRecord[];
  stockItems?: { id: string; name: string }[];
}

export function WastageList({ wastageRecords, stockItems = [] }: WastageListProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Group by category with stats
  const wastageStats = useMemo(() => {
    return groupWastageByCategory(wastageRecords);
  }, [wastageRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (categoryFilter === 'all') return wastageRecords;
    return wastageRecords.filter((r) => r.category === categoryFilter);
  }, [wastageRecords, categoryFilter]);

  // Sort by created_at desc
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredRecords]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.cost_value, 0);
  }, [filteredRecords]);

  const getStockItemName = (id: string) => {
    const item = stockItems.find((si) => si.id === id);
    return item?.name ?? 'Nieznany produkt';
  };

  if (wastageRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Brak rekordów marnotrawstwa
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-component="wastage-list">
      {/* Summary Cards by Category */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {wastageStats.map((stat) => (
          <Card key={stat.category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="text-xl">{getWastageCategoryIcon(stat.category)}</span>
                <span className="truncate">{getWastageCategoryLabel(stat.category)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {formatCurrency(stat.total_value)}
              </div>
              <div className="text-xs text-muted-foreground">
                {stat.percentage.toFixed(1)}% wartości
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Value Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Całkowita wartość strat</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalValue)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Liczba zdarzeń</div>
              <div className="text-2xl font-bold">{filteredRecords.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="category-filter" className="text-sm font-medium">
          Kategoria:
        </label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger id="category-filter" className="w-64">
            <SelectValue placeholder="Wszystkie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kategorie</SelectItem>
            {Object.values(WastageCategory).map((category) => (
              <SelectItem key={category} value={category}>
                <span className="flex items-center gap-2">
                  <span>{getWastageCategoryIcon(category)}</span>
                  <span>{getWastageCategoryLabel(category)}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Wastage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historia marnotrawstwa</span>
            <Badge variant="outline">{sortedRecords.length} zdarzeń</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Ilość</TableHead>
                  <TableHead className="text-right">Wartość</TableHead>
                  <TableHead>Powód</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Zgłosił</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {getWastageCategoryIcon(record.category)}
                        </span>
                        <Badge
                          variant="outline"
                          className={getWastageCategoryColor(record.category)}
                        >
                          {getWastageCategoryLabel(record.category)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {getStockItemName(record.stock_item_id)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{record.quantity.toFixed(2)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-red-600">
                        {formatCurrency(record.cost_value)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-xs">
                        {record.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(record.created_at).toLocaleDateString('pl-PL')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{record.reported_by}</div>
                      {record.approved_by && (
                        <div className="text-xs text-green-600">✓ Zatwierdzone</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
