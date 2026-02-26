'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventoryStore } from '@/modules/inventory/store';
import { useDeliveryStore } from '@/modules/deliveries/store';
import { DeliverySource } from '@/types/enums';
import { AIScanResult } from '@/types/delivery';
import { formatCurrency } from '@/lib/utils';
import {
  DeliveryLineTable,
  DeliveryLineRow,
  createEmptyRow,
} from './delivery-line-table';
import { AIScanReview } from './ai-scan-review';
import { Save, CheckCircle, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

const NONE_SUPPLIER = '__none__';

interface DeliveryFormData {
  warehouse_id: string;
  supplier_id: string | null;
  document_number: string | null;
  document_date: string | null;
  source: DeliverySource;
  source_image_url: string | null;
  notes: string | null;
}

interface DeliveryFormProps {
  onSaveDraft: (
    data: DeliveryFormData,
    items: DeliveryLineRow[]
  ) => Promise<void>;
  onComplete: (
    data: DeliveryFormData,
    items: DeliveryLineRow[]
  ) => Promise<void>;
}

export function DeliveryForm({ onSaveDraft, onComplete }: DeliveryFormProps) {
  const { warehouses, stockItems, loadAll: loadInventory } = useInventoryStore();
  const { suppliers, loadAll: loadDeliveries } = useDeliveryStore();

  const [warehouseId, setWarehouseId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>(NONE_SUPPLIER);
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState<DeliverySource>(DeliverySource.MANUAL);
  const [lineItems, setLineItems] = useState<DeliveryLineRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [showScanReview, setShowScanReview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInventory();
    loadDeliveries();
  }, [loadInventory, loadDeliveries]);

  // Auto-select warehouse if only one
  useEffect(() => {
    if (warehouses.length === 1 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  const validItems = useMemo(
    () =>
      lineItems.filter(
        (item) => item.stock_item_id && (item.quantity_received ?? 0) > 0
      ),
    [lineItems]
  );

  const itemCount = validItems.length;
  const totalNet = useMemo(
    () =>
      validItems.reduce((sum, item) => {
        if (item.unit_price_net != null && item.quantity_received != null) {
          return sum + item.unit_price_net * item.quantity_received;
        }
        return sum;
      }, 0),
    [validItems]
  );

  const getFormData = (): DeliveryFormData => ({
    warehouse_id: warehouseId,
    supplier_id: supplierId === NONE_SUPPLIER ? null : supplierId,
    document_number: documentNumber.trim() || null,
    document_date: documentDate || null,
    source,
    source_image_url: null,
    notes: notes.trim() || null,
  });

  const validate = (): boolean => {
    if (!warehouseId) {
      toast.error('Wybierz magazyn');
      return false;
    }
    if (validItems.length === 0) {
      toast.error('Dodaj co najmniej jedna pozycje z produktem i iloscia');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSaveDraft(getFormData(), validItems);
      toast.success('Szkic dostawy zapisany');
    } catch {
      toast.error('Nie udalo sie zapisac szkicu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onComplete(getFormData(), validItems);
      toast.success('Dostawa przyjeta');
    } catch {
      toast.error('Nie udalo sie przyjac dostawy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/v1/deliveries/scan', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        toast.error(result.error?.message ?? 'Blad skanowania');
        return;
      }

      setScanResult(result.data as AIScanResult);
      setShowScanReview(true);
    } catch {
      toast.error('Nie udalo sie przeslac dokumentu');
    } finally {
      setIsScanLoading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleScanConfirm = (matched: {
    items: DeliveryLineRow[];
    supplier_id?: string;
    document_number?: string;
    document_date?: string;
  }) => {
    // Populate header fields from scan
    if (matched.supplier_id) {
      setSupplierId(matched.supplier_id);
    }
    if (matched.document_number) {
      setDocumentNumber(matched.document_number);
    }
    if (matched.document_date) {
      setDocumentDate(matched.document_date);
    }
    // Replace line items with scanned ones
    setLineItems([...matched.items, createEmptyRow()]);
    setSource(DeliverySource.AI_SCAN);
    setShowScanReview(false);
    setScanResult(null);
    toast.success('Dane z dokumentu zaladowane');
  };

  const handleScanCancel = () => {
    setShowScanReview(false);
    setScanResult(null);
  };

  return (
    <div className="space-y-6" data-component="delivery-form">
      {/* Header fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="warehouse">Magazyn *</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger data-field="warehouse">
              <SelectValue placeholder="Wybierz magazyn" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Dostawca</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger data-field="supplier">
              <SelectValue placeholder="Bez dostawcy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_SUPPLIER}>Bez dostawcy</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-number">Nr dokumentu</Label>
          <Input
            id="document-number"
            placeholder="np. FV/2026/001"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            data-field="document-number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-date">Data dokumentu</Label>
          <Input
            id="document-date"
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            data-field="document-date"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="notes">Notatki</Label>
          <Textarea
            id="notes"
            placeholder="Dodatkowe informacje..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            data-field="notes"
          />
        </div>

        <div className="flex items-end">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
              data-field="scan-file"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleScanClick}
              disabled={isScanLoading}
              data-action="scan-document"
            >
              <ScanLine className="mr-2 h-4 w-4" />
              {isScanLoading ? 'Skanowanie...' : 'Skanuj dokument'}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Scan Review */}
      {showScanReview && scanResult && (
        <AIScanReview
          scanResult={scanResult}
          stockItems={stockItems}
          suppliers={suppliers}
          onConfirm={handleScanConfirm}
          onCancel={handleScanCancel}
        />
      )}

      {/* Line items table */}
      <DeliveryLineTable
        items={lineItems}
        onItemsChange={setLineItems}
        stockItems={stockItems}
      />

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          <span>
            Pozycji: <strong>{itemCount}</strong>
          </span>
          {totalNet > 0 && (
            <span className="ml-4">
              Suma netto: <strong>{formatCurrency(totalNet)}</strong>
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            data-action="save-draft"
          >
            <Save className="mr-2 h-4 w-4" />
            Zapisz szkic
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isSubmitting}
            data-action="complete-delivery"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Przyjmij dostawe
          </Button>
        </div>
      </div>
    </div>
  );
}
