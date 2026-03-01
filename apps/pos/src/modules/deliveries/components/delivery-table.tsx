'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeliveryWithDetails, Supplier } from '@/types/delivery';
import { DELIVERY_SOURCE_LABELS, DELIVERY_STATUS_LABELS } from '@/lib/constants/delivery';
import { DeliveryStatus } from '@/types/enums';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package } from 'lucide-react';

const ALL_SUPPLIERS = '__all__';

interface DeliveryTableProps {
  deliveries: DeliveryWithDetails[];
  suppliers: Supplier[];
}

export function DeliveryTable({ deliveries, suppliers }: DeliveryTableProps) {
  const [supplierFilter, setSupplierFilter] = useState<string>(ALL_SUPPLIERS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    let result = deliveries;

    if (supplierFilter !== ALL_SUPPLIERS) {
      result = result.filter((d) => d.supplier_id === supplierFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((d) => new Date(d.created_at) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((d) => new Date(d.created_at) <= to);
    }

    return result;
  }, [deliveries, supplierFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-4" data-component="delivery-table">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Dostawca</Label>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[200px]" data-field="filter-supplier">
              <SelectValue placeholder="Wszyscy dostawcy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SUPPLIERS}>Wszyscy dostawcy</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data od</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
            data-field="filter-date-from"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data do</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
            data-field="filter-date-to"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 text-center"
          data-component="empty-state"
        >
          <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Brak dostaw</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Nie znaleziono dostaw pasujacych do filtrow.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr dostawy</TableHead>
                <TableHead>Dostawca</TableHead>
                <TableHead>Magazyn</TableHead>
                <TableHead className="text-center">Pozycji</TableHead>
                <TableHead className="text-right">Suma netto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zrodlo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((delivery) => (
                <TableRow key={delivery.id} data-id={delivery.id}>
                  <TableCell>
                    <Link
                      href={`/deliveries/${delivery.id}`}
                      className="font-medium text-primary hover:underline"
                      data-action="view-delivery"
                      data-id={delivery.id}
                    >
                      {delivery.delivery_number}
                    </Link>
                  </TableCell>
                  <TableCell>{delivery.supplier_name ?? '—'}</TableCell>
                  <TableCell>{delivery.warehouse_name}</TableCell>
                  <TableCell className="text-center">{delivery.item_count}</TableCell>
                  <TableCell className="text-right">
                    {delivery.total_net != null ? formatCurrency(delivery.total_net) : '—'}
                  </TableCell>
                  <TableCell>{formatDate(delivery.created_at)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        delivery.status === DeliveryStatus.COMPLETED
                          ? 'default'
                          : 'secondary'
                      }
                      data-status={delivery.status}
                    >
                      {DELIVERY_STATUS_LABELS[delivery.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-value={delivery.source}>
                      {DELIVERY_SOURCE_LABELS[delivery.source]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
