'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Delivery, DeliveryItemWithDetails } from '@/types/delivery';
import { DeliveryStatus } from '@/types/enums';
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_SOURCE_LABELS,
} from '@/lib/constants/delivery';
import { deliveryRepository } from '@/modules/deliveries/repository';
import { useDeliveryStore } from '@/modules/deliveries/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const NONE_SUPPLIER = '__none__';

export default function DeliveryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { suppliers, loadAll, updateDelivery, completeDelivery } =
    useDeliveryStore();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [items, setItems] = useState<DeliveryItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [supplierId, setSupplierId] = useState<string>(NONE_SUPPLIER);
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    async function loadDeliveryData() {
      setIsLoading(true);
      try {
        const [deliveryData, itemsData] = await Promise.all([
          deliveryRepository.getDeliveryById(id),
          deliveryRepository.getDeliveryItems(id),
        ]);
        if (deliveryData) {
          setDelivery(deliveryData);
          setSupplierId(deliveryData.supplier_id ?? NONE_SUPPLIER);
          setDocumentNumber(deliveryData.document_number ?? '');
          setDocumentDate(deliveryData.document_date ?? '');
          setNotes(deliveryData.notes ?? '');
        }
        setItems(itemsData);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadDeliveryData();
    }
  }, [id]);

  const handleFieldChange = (setter: (val: string) => void) => (val: string) => {
    setter(val);
    setHasChanges(true);
  };

  const totalNet = useMemo(() => {
    const hasAnyPrice = items.some((i) => i.unit_price_net != null);
    if (!hasAnyPrice) return null;
    return items.reduce((sum, i) => {
      if (i.unit_price_net != null) {
        return sum + i.unit_price_net * i.quantity_received;
      }
      return sum;
    }, 0);
  }, [items]);

  const handleSaveChanges = async () => {
    if (!delivery) return;
    setIsSaving(true);
    try {
      await updateDelivery(delivery.id, {
        supplier_id: supplierId === NONE_SUPPLIER ? null : supplierId,
        document_number: documentNumber.trim() || null,
        document_date: documentDate || null,
        notes: notes.trim() || null,
      });
      const updated = await deliveryRepository.getDeliveryById(delivery.id);
      if (updated) setDelivery(updated);
      setHasChanges(false);
      toast.success('Zmiany zapisane');
    } catch {
      toast.error('Nie udalo sie zapisac zmian');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!delivery) return;
    setIsSaving(true);
    try {
      if (hasChanges) {
        await updateDelivery(delivery.id, {
          supplier_id: supplierId === NONE_SUPPLIER ? null : supplierId,
          document_number: documentNumber.trim() || null,
          document_date: documentDate || null,
          notes: notes.trim() || null,
        });
      }
      await completeDelivery(delivery.id);
      const updated = await deliveryRepository.getDeliveryById(delivery.id);
      if (updated) setDelivery(updated);
      setHasChanges(false);
      toast.success('Dostawa przyjeta');
    } catch {
      toast.error('Nie udalo sie przyjac dostawy');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="delivery-detail">
        <PageHeader title="Dostawa" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="space-y-6" data-page="delivery-detail">
        <PageHeader
          title="Nie znaleziono dostawy"
          actions={
            <Button variant="ghost" asChild>
              <Link href="/deliveries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrot do listy
              </Link>
            </Button>
          }
        />
        <p className="text-muted-foreground">
          Dostawa o podanym ID nie istnieje.
        </p>
      </div>
    );
  }

  const isDraft = delivery.status === DeliveryStatus.DRAFT;
  const isCompleted = delivery.status === DeliveryStatus.COMPLETED;

  return (
    <div className="space-y-6" data-page="delivery-detail">
      <PageHeader
        title={delivery.delivery_number}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" asChild data-action="back-to-deliveries">
              <Link href="/deliveries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrot
              </Link>
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={handleSaveChanges}
                disabled={isSaving}
                data-action="save-changes"
              >
                <Save className="mr-2 h-4 w-4" />
                Zapisz zmiany
              </Button>
            )}
            {isDraft && (
              <Button
                onClick={handleComplete}
                disabled={isSaving}
                data-action="complete-delivery"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Przyjmij dostawe
              </Button>
            )}
          </div>
        }
      />

      {/* Status badges */}
      <div className="flex items-center gap-2">
        <Badge
          variant={isCompleted ? 'default' : 'secondary'}
          data-status={delivery.status}
        >
          {DELIVERY_STATUS_LABELS[delivery.status]}
        </Badge>
        <Badge variant="outline" data-value={delivery.source}>
          {DELIVERY_SOURCE_LABELS[delivery.source]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatDate(delivery.created_at)}
        </span>
      </div>

      {/* Delivery info - editable fields */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-component="delivery-info"
      >
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Magazyn</Label>
          <p className="text-sm font-medium">{delivery.warehouse_id}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="detail-supplier">Dostawca</Label>
          <Select
            value={supplierId}
            onValueChange={handleFieldChange(setSupplierId)}
          >
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
          <Label htmlFor="detail-document-number">Nr dokumentu</Label>
          <Input
            id="detail-document-number"
            value={documentNumber}
            onChange={(e) => handleFieldChange(setDocumentNumber)(e.target.value)}
            placeholder="np. FV/2026/001"
            data-field="document-number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="detail-document-date">Data dokumentu</Label>
          <Input
            id="detail-document-date"
            type="date"
            value={documentDate}
            onChange={(e) => handleFieldChange(setDocumentDate)(e.target.value)}
            data-field="document-date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="detail-notes">Notatki</Label>
        <Textarea
          id="detail-notes"
          value={notes}
          onChange={(e) => handleFieldChange(setNotes)(e.target.value)}
          rows={2}
          placeholder="Dodatkowe informacje..."
          data-field="notes"
        />
      </div>

      {/* Summary */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Pozycji: </span>
          <strong>{items.length}</strong>
        </div>
        {totalNet != null && (
          <div>
            <span className="text-muted-foreground">Suma netto: </span>
            <strong>{formatCurrency(totalNet)}</strong>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="rounded-md border" data-component="delivery-items-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produkt</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Zamowiono</TableHead>
              <TableHead className="text-right">Przyjeto</TableHead>
              <TableHead className="text-right">Cena netto</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead>Data waznosci</TableHead>
              <TableHead>Notatki</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Brak pozycji
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} data-id={item.id}>
                  <TableCell className="font-medium">
                    {item.stock_item_name}
                    {item.ai_matched_name && (
                      <span className="block text-xs text-muted-foreground">
                        Skan: {item.ai_matched_name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.stock_item_sku}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity_ordered != null
                      ? `${item.quantity_ordered} ${item.stock_item_unit}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity_received} {item.stock_item_unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.unit_price_net != null
                      ? formatCurrency(item.unit_price_net)
                      : '—'}
                  </TableCell>
                  <TableCell>{item.vat_rate ?? '—'}</TableCell>
                  <TableCell>
                    {item.expiry_date ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.notes ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
