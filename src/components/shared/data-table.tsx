'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { EmptyState } from './empty-state';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: string;
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  getRowId?: (item: T) => string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = 'Szukaj...',
  searchKey,
  isLoading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
  emptyTitle = 'Brak danych',
  emptyDescription,
  emptyAction,
  getRowId,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredData = React.useMemo(() => {
    if (!search || !searchKey) return data;
    return data.filter((item) => {
      const value = item[searchKey];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [data, search, searchKey]);

  const sortedData = React.useMemo(() => {
    if (!sortBy) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [filteredData, sortBy, sortOrder]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-component="data-table-skeleton">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-component="data-table">
      {searchKey && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-field="search"
          />
        </div>
      )}

      {sortedData.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.className}>
                      {col.sortable ? (
                        <button
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => handleSort(col.key)}
                          data-action="sort"
                          data-field={col.key}
                        >
                          {col.header}
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item, idx) => {
                  const rowId = getRowId ? getRowId(item) : String(idx);
                  return (
                    <TableRow
                      key={rowId}
                      className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => onRowClick?.(item)}
                      data-id={rowId}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render
                            ? col.render(item)
                            : (item[col.key] as React.ReactNode) ?? '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && onPageChange && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                data-action="prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Strona {page} z {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                data-action="next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
