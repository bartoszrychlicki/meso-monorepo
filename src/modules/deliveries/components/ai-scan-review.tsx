'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AIScanResult } from '@/types/delivery';
import { Supplier } from '@/types/delivery';
import { StockItem } from '@/types/inventory';
import { findBestMatch, findBestSupplierMatch } from '@/modules/deliveries/utils/fuzzy-match';
import { DeliveryLineRow } from './delivery-line-table';
import { Check, XCircle } from 'lucide-react';

const UNMATCHED = '__unmatched__';

interface MatchedLineItem {
  original_name: string;
  quantity: number | null;
  unit: string | null;
  unit_price_net: number | null;
  vat_rate: string | null;
  expiry_date: string | null;
  matched_stock_item_id: string;
  confidence: number;
}

interface AIScanReviewProps {
  scanResult: AIScanResult;
  stockItems: StockItem[];
  suppliers: Supplier[];
  onConfirm: (matched: {
    items: DeliveryLineRow[];
    supplier_id?: string;
    document_number?: string;
    document_date?: string;
  }) => void;
  onCancel: () => void;
}

function getConfidenceBadge(confidence: number, isUnmatched: boolean) {
  if (isUnmatched) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-600">
        Brak
      </Badge>
    );
  }
  if (confidence >= 0.8) {
    return (
      <Badge variant="default" className="bg-green-600">
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  if (confidence >= 0.6) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      {Math.round(confidence * 100)}%
    </Badge>
  );
}

function generateTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function AIScanReview({
  scanResult,
  stockItems,
  suppliers,
  onConfirm,
  onCancel,
}: AIScanReviewProps) {
  // Run fuzzy matching on mount
  const initialMatches = useMemo(() => {
    const candidates = stockItems.map((si) => ({
      id: si.id,
      name: si.name,
      sku: si.sku,
    }));

    return scanResult.items.map((item) => {
      const match = findBestMatch(item.name, candidates);
      return {
        original_name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_net: item.unit_price_net,
        vat_rate: item.vat_rate,
        expiry_date: item.expiry_date,
        matched_stock_item_id: match.candidate_id ?? UNMATCHED,
        confidence: match.confidence,
      };
    });
  }, [scanResult.items, stockItems]);

  const supplierMatch = useMemo(() => {
    if (!scanResult.supplier_name) return { id: null, confidence: 0 };
    return findBestSupplierMatch(
      scanResult.supplier_name,
      suppliers.map((s) => ({ id: s.id, name: s.name }))
    );
  }, [scanResult.supplier_name, suppliers]);

  const [matchedItems, setMatchedItems] = useState<MatchedLineItem[]>(initialMatches);

  const handleStockItemChange = (index: number, stockItemId: string) => {
    setMatchedItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              matched_stock_item_id: stockItemId,
              confidence: stockItemId === UNMATCHED ? 0 : 1.0,
            }
          : item
      )
    );
  };

  const handleConfirm = () => {
    const items: DeliveryLineRow[] = matchedItems
      .filter((item) => item.matched_stock_item_id !== UNMATCHED)
      .map((item) => {
        const stockItem = stockItems.find(
          (si) => si.id === item.matched_stock_item_id
        );
        return {
          id: generateTempId(),
          stock_item_id: item.matched_stock_item_id,
          stock_item_name: stockItem?.name ?? '',
          quantity_ordered: item.quantity,
          quantity_received: item.quantity,
          unit_price_net: item.unit_price_net,
          vat_rate: item.vat_rate,
          expiry_date: item.expiry_date,
          notes: '',
          ai_matched_name: item.original_name,
          ai_confidence: item.confidence,
        };
      });

    onConfirm({
      items,
      supplier_id: supplierMatch.id ?? undefined,
      document_number: scanResult.document_number ?? undefined,
      document_date: scanResult.document_date ?? undefined,
    });
  };

  return (
    <div
      className="rounded-lg border bg-card p-4 space-y-4"
      data-component="ai-scan-review"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Przejrzyj wyniki skanowania</h3>
          <p className="text-sm text-muted-foreground">
            Sprawdz dopasowanie pozycji i popraw jesli trzeba.
          </p>
        </div>
      </div>

      {/* Document info */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
        {scanResult.document_number && (
          <div>
            <span className="text-muted-foreground">Nr dokumentu: </span>
            <strong>{scanResult.document_number}</strong>
          </div>
        )}
        {scanResult.document_date && (
          <div>
            <span className="text-muted-foreground">Data: </span>
            <strong>{scanResult.document_date}</strong>
          </div>
        )}
        {scanResult.supplier_name && (
          <div>
            <span className="text-muted-foreground">Dostawca: </span>
            <strong>{scanResult.supplier_name}</strong>
            {supplierMatch.id && (
              <Badge variant="outline" className="ml-2 text-xs">
                Dopasowano ({Math.round(supplierMatch.confidence * 100)}%)
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Items review table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa z dokumentu</TableHead>
              <TableHead className="w-[280px]">Dopasowana pozycja</TableHead>
              <TableHead className="w-[100px] text-center">Pewnosc</TableHead>
              <TableHead className="w-[80px] text-right">Ilosc</TableHead>
              <TableHead className="w-[100px] text-right">Cena netto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matchedItems.map((item, index) => (
              <TableRow key={index} data-row={index}>
                <TableCell className="font-medium">{item.original_name}</TableCell>
                <TableCell>
                  <Select
                    value={item.matched_stock_item_id}
                    onValueChange={(value) => handleStockItemChange(index, value)}
                  >
                    <SelectTrigger
                      className="w-full"
                      data-field="matched-product"
                      data-row={index}
                    >
                      <SelectValue placeholder="Wybierz pozycje..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMATCHED}>-- Nie dopasowano --</SelectItem>
                      {stockItems.map((si) => (
                        <SelectItem key={si.id} value={si.id}>
                          {si.name} ({si.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  {getConfidenceBadge(
                    item.confidence,
                    item.matched_stock_item_id === UNMATCHED
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.quantity ?? '—'}
                  {item.unit && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {item.unit}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.unit_price_net != null
                    ? `${item.unit_price_net.toFixed(2)} zl`
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} data-action="cancel-scan">
          <XCircle className="mr-2 h-4 w-4" />
          Anuluj
        </Button>
        <Button onClick={handleConfirm} data-action="confirm-scan">
          <Check className="mr-2 h-4 w-4" />
          Potwierdz
        </Button>
      </div>
    </div>
  );
}
