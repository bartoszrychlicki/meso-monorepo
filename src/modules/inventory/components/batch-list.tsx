'use client';

import { useMemo, useState } from 'react';
import { Batch, StockItem } from '@/types/inventory';
import { BatchStatus } from '@/types/enums';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle, XCircle, Clock, Package, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  getBatchStatusColor,
  getBatchStatusIcon,
  getBatchStatusLabel,
  getDaysUntilExpiry,
  getShelfLifePercentage,
} from '../utils/batch-status';
import { BatchEditDialog } from './batch-edit-dialog';

interface BatchListProps {
  batches: Batch[];
  stockItemName?: string;
  stockItems?: StockItem[];
  onBatchUpdated?: () => void;
}

export function BatchList({ batches, stockItemName, stockItems, onBatchUpdated }: BatchListProps) {
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Sort batches by expiry date (FEFO order)
  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  }, [batches]);

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setEditDialogOpen(true);
  };

  const handleBatchUpdated = () => {
    setEditDialogOpen(false);
    setEditingBatch(null);
    onBatchUpdated?.();
  };

  // Group by status
  const batchesByStatus = useMemo(() => {
    return {
      critical: batches.filter((b) => b.status === BatchStatus.CRITICAL),
      warning: batches.filter((b) => b.status === BatchStatus.WARNING),
      fresh: batches.filter((b) => b.status === BatchStatus.FRESH),
      expired: batches.filter((b) => b.status === BatchStatus.EXPIRED),
      depleted: batches.filter((b) => b.status === BatchStatus.DEPLETED),
    };
  }, [batches]);

  const getStatusIcon = (status: BatchStatus) => {
    switch (status) {
      case BatchStatus.FRESH:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case BatchStatus.WARNING:
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case BatchStatus.CRITICAL:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case BatchStatus.EXPIRED:
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case BatchStatus.DEPLETED:
        return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Brak partii dla tego produktu
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-component="batch-list">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={batchesByStatus.critical.length > 0 ? 'border-red-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Krytyczne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {batchesByStatus.critical.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">&lt;25% przydatności</p>
          </CardContent>
        </Card>

        <Card className={batchesByStatus.warning.length > 0 ? 'border-yellow-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Ostrzeżenie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {batchesByStatus.warning.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">25-50% przydatności</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Świeże
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {batchesByStatus.fresh.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">&gt;50% przydatności</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              Przeterminowane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {batchesByStatus.expired.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Do usunięcia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              Wyczerpane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {batchesByStatus.depleted.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Zużyte</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {stockItemName ? `Partie: ${stockItemName}` : 'Partie'}
            </span>
            <Badge variant="outline">FEFO (First Expired First Out)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Numer partii</TableHead>
                  <TableHead>Data produkcji</TableHead>
                  <TableHead>Data przydatności</TableHead>
                  <TableHead className="text-right">Ilość</TableHead>
                  <TableHead className="text-right">Wartość</TableHead>
                  <TableHead className="text-right">% przydatności</TableHead>
                  <TableHead className="w-[100px]">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBatches.map((batch) => {
                  const daysUntilExpiry = getDaysUntilExpiry(batch);
                  const shelfLifePercent = getShelfLifePercentage(batch);

                  return (
                    <TableRow
                      key={batch.id}
                      className={batch.status === BatchStatus.DEPLETED ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(batch.status)}
                          <span className="text-xl">{getBatchStatusIcon(batch.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{batch.batch_number}</div>
                        <Badge variant="outline" className={`mt-1 text-xs ${getBatchStatusColor(batch.status)}`}>
                          {getBatchStatusLabel(batch.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(batch.production_date).toLocaleDateString('pl-PL')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {batch.expiry_date ? (
                          <div>
                            <div className="text-sm">
                              {new Date(batch.expiry_date).toLocaleDateString('pl-PL')}
                            </div>
                            {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                za {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dzień' : 'dni'}
                              </div>
                            )}
                            {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                {Math.abs(daysUntilExpiry)} {Math.abs(daysUntilExpiry) === 1 ? 'dzień' : 'dni'} temu
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Brak</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {batch.quantity_current.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          z {batch.quantity_initial.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(batch.quantity_current * batch.cost_per_unit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {shelfLifePercent !== null ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className={`text-sm font-medium ${
                              shelfLifePercent > 50 ? 'text-green-600' :
                              shelfLifePercent > 25 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {shelfLifePercent.toFixed(0)}%
                            </div>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  shelfLifePercent > 50 ? 'bg-green-600' :
                                  shelfLifePercent > 25 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${Math.max(0, Math.min(100, shelfLifePercent))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">N/A</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditBatch(batch)}
                          data-action="edit-batch"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BatchEditDialog
        batch={editingBatch}
        stockItem={stockItems?.find((s) => s.id === editingBatch?.stock_item_id)}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleBatchUpdated}
      />
    </div>
  );
}
