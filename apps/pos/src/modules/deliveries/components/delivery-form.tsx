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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useInventoryStore } from '@/modules/inventory/store';
import { useDeliveryStore } from '@/modules/deliveries/store';
import { DeliverySource, ProductCategory, VatRate, ConsumptionType } from '@/types/enums';
import { AIScanResult } from '@/types/delivery';
import { formatCurrency } from '@/lib/utils';
import {
  DeliveryLineTable,
  DeliveryLineRow,
  createEmptyRow,
} from './delivery-line-table';
import { AIScanReview } from './ai-scan-review';
import { Save, CheckCircle, ScanLine, Package, FileText, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { UNIT_OPTIONS } from '@/lib/constants/inventory';

const NONE_SUPPLIER = '__none__';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.RAW_MATERIAL]: 'Surowiec',
  [ProductCategory.SEMI_FINISHED]: 'Polprodukt',
  [ProductCategory.FINISHED_GOOD]: 'Gotowy produkt',
};

function generateSku(name: string): string {
  const base = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${base || 'ITEM'}-${suffix}`;
}

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
  const { warehouses, stockItems, createStockItem } = useInventoryStore();
  const { suppliers } = useDeliveryStore();

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

  // Quick-add stock item dialog state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddRowIndex, setQuickAddRowIndex] = useState(0);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddSku, setQuickAddSku] = useState('');
  const [quickAddUnit, setQuickAddUnit] = useState('kg');
  const [quickAddCategory, setQuickAddCategory] = useState<ProductCategory>(ProductCategory.RAW_MATERIAL);
  const [quickAddCost, setQuickAddCost] = useState<string>('');
  const [isQuickAddSubmitting, setIsQuickAddSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (matched.supplier_id) {
      setSupplierId(matched.supplier_id);
    }
    if (matched.document_number) {
      setDocumentNumber(matched.document_number);
    }
    if (matched.document_date) {
      setDocumentDate(matched.document_date);
    }
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

  // Quick-add stock item handlers
  const handleCreateNewItem = (searchTerm: string, rowIndex: number) => {
    setQuickAddName(searchTerm);
    setQuickAddSku(generateSku(searchTerm));
    setQuickAddUnit('kg');
    setQuickAddCategory(ProductCategory.RAW_MATERIAL);
    setQuickAddCost('');
    setQuickAddRowIndex(rowIndex);
    setShowQuickAdd(true);
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddName.trim()) {
      toast.error('Podaj nazwe produktu');
      return;
    }
    if (!quickAddSku.trim()) {
      toast.error('Podaj SKU');
      return;
    }

    setIsQuickAddSubmitting(true);
    try {
      const newItem = await createStockItem({
        name: quickAddName.trim(),
        sku: quickAddSku.trim(),
        product_category: quickAddCategory,
        unit: quickAddUnit,
        cost_per_unit: quickAddCost ? parseFloat(quickAddCost) : 0,
        allergens: [],
        is_active: true,
        vat_rate: VatRate.PTU_B,
        consumption_type: ConsumptionType.PRODUCT,
        shelf_life_days: 0,
        default_min_quantity: 0,
        storage_location: null,
      });

      // Auto-select the new item in the row
      const newItems = lineItems.map((item, i) =>
        i === quickAddRowIndex
          ? {
              ...item,
              stock_item_id: newItem.id,
              stock_item_name: newItem.name,
              unit_price_net: newItem.cost_per_unit || null,
            }
          : item
      );
      setLineItems(newItems);

      toast.success(`Dodano produkt: ${newItem.name}`);
      setShowQuickAdd(false);
    } catch {
      toast.error('Nie udalo sie utworzyc produktu');
    } finally {
      setIsQuickAddSubmitting(false);
    }
  };

  const handleQuickAddClose = () => {
    setShowQuickAdd(false);
  };

  return (
    <div className="space-y-6" data-component="delivery-form">
      {/* Document details section */}
      <Card className="shadow-sm">
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold">Szczegoly dokumentu</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="warehouse" className="text-xs font-medium text-muted-foreground">
                Magazyn <span className="text-destructive">*</span>
              </Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger data-field="warehouse" className="h-9">
                  <SelectValue placeholder="Wybierz magazyn" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                        {w.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplier" className="text-xs font-medium text-muted-foreground">
                Dostawca
              </Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger data-field="supplier" className="h-9">
                  <SelectValue placeholder="Bez dostawcy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SUPPLIER}>
                    <span className="text-muted-foreground">Bez dostawcy</span>
                  </SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="document-number" className="text-xs font-medium text-muted-foreground">
                Nr dokumentu
              </Label>
              <Input
                id="document-number"
                placeholder="np. FV/2026/001"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                data-field="document-number"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="document-date" className="text-xs font-medium text-muted-foreground">
                Data dokumentu
              </Label>
              <Input
                id="document-date"
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                data-field="document-date"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">
                Notatki
              </Label>
              <Textarea
                id="notes"
                placeholder="Dodatkowe informacje o dostawie..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                data-field="notes"
                className="resize-none text-sm"
              />
            </div>

            <div className="flex items-end">
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
                size="sm"
                onClick={handleScanClick}
                disabled={isScanLoading}
                data-action="scan-document"
                className="h-9 gap-2"
              >
                <ScanLine className="h-4 w-4" />
                {isScanLoading ? 'Skanowanie...' : 'Skanuj dokument'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Line items section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
            <Package className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">Pozycje dostawy</h3>
        </div>

        <DeliveryLineTable
          items={lineItems}
          onItemsChange={setLineItems}
          stockItems={stockItems}
          onCreateNewItem={handleCreateNewItem}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="text-muted-foreground">
            Pozycji: <span className="font-semibold text-foreground tabular-nums">{itemCount}</span>
          </div>
          {totalNet > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="text-muted-foreground">
                Suma netto: <span className="font-semibold text-foreground tabular-nums">{formatCurrency(totalNet)}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            data-action="save-draft"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Zapisz szkic
          </Button>
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={isSubmitting}
            data-action="complete-delivery"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle className="h-4 w-4" />
            Przyjmij dostawe
          </Button>
        </div>
      </div>

      {/* Quick-add stock item dialog */}
      <Dialog open={showQuickAdd} onOpenChange={(v) => { if (!v) handleQuickAddClose(); }}>
        <DialogContent className="max-w-md" data-component="quick-add-stock-item">
          <DialogHeader>
            <DialogTitle>Nowy produkt magazynowy</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="qa-name" className="text-xs font-medium">Nazwa *</Label>
              <Input
                id="qa-name"
                placeholder="np. Wolowina mielona"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                data-field="quick-add-name"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qa-sku" className="text-xs font-medium">SKU *</Label>
                <Input
                  id="qa-sku"
                  placeholder="np. WOL-001"
                  value={quickAddSku}
                  onChange={(e) => setQuickAddSku(e.target.value)}
                  data-field="quick-add-sku"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-unit" className="text-xs font-medium">Jednostka</Label>
                <Select value={quickAddUnit} onValueChange={setQuickAddUnit}>
                  <SelectTrigger id="qa-unit" data-field="quick-add-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qa-category" className="text-xs font-medium">Kategoria</Label>
                <Select value={quickAddCategory} onValueChange={(v) => setQuickAddCategory(v as ProductCategory)}>
                  <SelectTrigger id="qa-category" data-field="quick-add-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProductCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-cost" className="text-xs font-medium">Koszt/jedn. (PLN)</Label>
                <Input
                  id="qa-cost"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={quickAddCost}
                  onChange={(e) => setQuickAddCost(e.target.value)}
                  data-field="quick-add-cost"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickAddClose}
              data-action="cancel-quick-add"
            >
              Anuluj
            </Button>
            <Button
              size="sm"
              onClick={handleQuickAddSubmit}
              disabled={isQuickAddSubmitting}
              data-action="confirm-quick-add"
            >
              {isQuickAddSubmitting ? 'Dodawanie...' : 'Dodaj produkt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
