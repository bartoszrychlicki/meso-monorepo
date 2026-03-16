'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InventoryCount } from '@/types/inventory';
import { InventoryCountStatusBadge } from './inventory-count-status-badge';

interface InventoryCountsTableProps {
  counts: InventoryCount[];
}

export function InventoryCountsTable({ counts }: InventoryCountsTableProps) {
  if (counts.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" />}
        title="Brak inwentaryzacji"
        description="Rozpocznij pierwsza inwentaryzacje, aby liczyc stany magazynowe bez korekty na zywo."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border" data-component="inventory-counts-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dokument</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Postep</TableHead>
            <TableHead className="hidden xl:table-cell">Data utworzenia</TableHead>
            <TableHead className="w-[120px]">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {counts.map((count) => (
            <TableRow key={count.id}>
              <TableCell className="min-w-[220px]">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{count.number}</span>
                  <span className="text-sm text-muted-foreground">
                    {count.warehouse_name ?? 'Wszystkie magazyny'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <InventoryCountStatusBadge status={count.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {count.counted_lines ?? 0}/{count.total_lines ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Roznice: {count.difference_lines ?? 0}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell text-muted-foreground">
                {new Date(count.created_at).toLocaleDateString('pl-PL')}
              </TableCell>
              <TableCell>
                <Link href={`/inventory/counts/${count.id}`}>
                  <Button variant="outline" size="sm" data-action="open-inventory-count" data-id={count.id}>
                    Otworz
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
