'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StockItemWarehouseAssignment } from '@/types/inventory';

interface StockItemWarehouseSummaryProps {
  assignments: StockItemWarehouseAssignment[];
  selectedWarehouseId: string | null;
}

export function StockItemWarehouseSummary({
  assignments,
  selectedWarehouseId,
}: StockItemWarehouseSummaryProps) {
  if (assignments.length === 0) {
    return null;
  }

  const sortedAssignments = [...assignments].sort((a, b) => {
    if (selectedWarehouseId) {
      if (a.warehouse_id === selectedWarehouseId && b.warehouse_id !== selectedWarehouseId) {
        return -1;
      }
      if (b.warehouse_id === selectedWarehouseId && a.warehouse_id !== selectedWarehouseId) {
        return 1;
      }
    }

    return a.warehouse_name.localeCompare(b.warehouse_name, 'pl');
  });

  return (
    <Card data-component="stock-item-warehouse-summary">
      <CardHeader>
        <CardTitle>Stany i polozenie w magazynach</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Magazyn</TableHead>
                <TableHead className="text-right">Ilosc</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead>Polozenie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{assignment.warehouse_name}</span>
                      {selectedWarehouseId === assignment.warehouse_id && (
                        <Badge variant="secondary">Wybrany magazyn</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{assignment.quantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {assignment.min_quantity}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {assignment.storage_location || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
