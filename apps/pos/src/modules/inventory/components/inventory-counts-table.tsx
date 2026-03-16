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
            <TableHead>Numer</TableHead>
            <TableHead>Magazyn</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Policzone</TableHead>
            <TableHead className="text-right">Roznice</TableHead>
            <TableHead className="hidden md:table-cell">Data utworzenia</TableHead>
            <TableHead className="w-[120px]">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {counts.map((count) => (
            <TableRow key={count.id}>
              <TableCell className="font-medium">{count.number}</TableCell>
              <TableCell className="text-muted-foreground">
                {count.warehouse_name ?? 'Wszystkie'}
              </TableCell>
              <TableCell>
                <InventoryCountStatusBadge status={count.status} />
              </TableCell>
              <TableCell className="text-right">
                {count.counted_lines ?? 0}/{count.total_lines ?? 0}
              </TableCell>
              <TableCell className="text-right">
                {count.difference_lines ?? 0}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
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
