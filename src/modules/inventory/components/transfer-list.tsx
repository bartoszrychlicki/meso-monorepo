'use client';

import { useMemo, useState } from 'react';
import { StockTransfer } from '@/types/inventory';
import { TransferStatus } from '@/types/enums';
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
import { Truck, Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  getTransferStatusLabel,
  getTransferStatusColor,
  getTransferStatusIcon,
} from '../utils/transfer-workflow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransferActions } from './transfer-actions';

interface TransferListProps {
  transfers: StockTransfer[];
  warehouses?: { id: string; name: string }[];
  onTransferUpdated?: () => void;
}

export function TransferList({ transfers, warehouses = [], onTransferUpdated }: TransferListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  // Group by status for summary cards
  const transfersByStatus = useMemo(() => {
    return {
      draft: transfers.filter((t) => t.status === TransferStatus.DRAFT),
      pending: transfers.filter((t) => t.status === TransferStatus.PENDING),
      in_transit: transfers.filter((t) => t.status === TransferStatus.IN_TRANSIT),
      completed: transfers.filter((t) => t.status === TransferStatus.COMPLETED),
      cancelled: transfers.filter((t) => t.status === TransferStatus.CANCELLED),
    };
  }, [transfers]);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesWarehouse =
        warehouseFilter === 'all' ||
        t.from_warehouse_id === warehouseFilter ||
        t.to_warehouse_id === warehouseFilter;

      return matchesStatus && matchesWarehouse;
    });
  }, [transfers, statusFilter, warehouseFilter]);

  // Sort by created_at desc
  const sortedTransfers = useMemo(() => {
    return [...filteredTransfers].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredTransfers]);

  const getWarehouseName = (id: string) => {
    const warehouse = warehouses.find((w) => w.id === id);
    return warehouse?.name ?? id;
  };

  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Brak transferów magazynowych
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-component="transfer-list">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={transfersByStatus.draft.length > 0 ? 'border-gray-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              📝 Szkice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {transfersByStatus.draft.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">W przygotowaniu</p>
          </CardContent>
        </Card>

        <Card className={transfersByStatus.pending.length > 0 ? 'border-blue-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Oczekujące
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {transfersByStatus.pending.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Do odbioru</p>
          </CardContent>
        </Card>

        <Card
          className={transfersByStatus.in_transit.length > 0 ? 'border-purple-200' : ''}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-600" />
              W transporcie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {transfersByStatus.in_transit.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">W drodze</p>
          </CardContent>
        </Card>

        <Card className={transfersByStatus.completed.length > 0 ? 'border-green-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Zakończone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transfersByStatus.completed.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dostarczone</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              Anulowane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {transfersByStatus.cancelled.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Odwołane</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
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
              <SelectItem value={TransferStatus.DRAFT}>Szkice</SelectItem>
              <SelectItem value={TransferStatus.PENDING}>Oczekujące</SelectItem>
              <SelectItem value={TransferStatus.IN_TRANSIT}>W transporcie</SelectItem>
              <SelectItem value={TransferStatus.COMPLETED}>Zakończone</SelectItem>
              <SelectItem value={TransferStatus.CANCELLED}>Anulowane</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {warehouses.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="warehouse-filter" className="text-sm font-medium">
              Magazyn:
            </label>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger id="warehouse-filter" className="w-64">
                <SelectValue placeholder="Wszystkie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transfery magazynowe</span>
            <Badge variant="outline">{sortedTransfers.length} transferów</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Numer</TableHead>
                  <TableHead>Trasa</TableHead>
                  <TableHead>Produkty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data zlecenia</TableHead>
                  <TableHead>Notatki</TableHead>
                  <TableHead className="w-[200px]">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{transfer.transfer_number}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium">
                            {getWarehouseName(transfer.from_warehouse_id)}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            → {getWarehouseName(transfer.to_warehouse_id)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {transfer.items.length}{' '}
                        {transfer.items.length === 1 ? 'produkt' : 'produkty'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {getTransferStatusIcon(transfer.status)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`${getTransferStatusColor(transfer.status)}`}
                        >
                          {getTransferStatusLabel(transfer.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(transfer.requested_at).toLocaleDateString('pl-PL')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(transfer.requested_at).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transfer.notes && (
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {transfer.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <TransferActions
                        transfer={transfer}
                        onSuccess={() => onTransferUpdated?.()}
                      />
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
