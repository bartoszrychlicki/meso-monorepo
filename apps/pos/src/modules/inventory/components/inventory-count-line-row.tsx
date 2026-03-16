'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryCategory, InventoryCountLine } from '@/types/inventory';
import { toast } from 'sonner';

interface InventoryCountLineRowProps {
  categories: InventoryCategory[];
  isReadonly: boolean;
  line: InventoryCountLine;
  onSave: (lineId: string, patch: Partial<InventoryCountLine>) => Promise<void>;
}

const NONE_CATEGORY = '__none__';

export function InventoryCountLineRow({
  categories,
  isReadonly,
  line,
  onSave,
}: InventoryCountLineRowProps) {
  const [countedQuantity, setCountedQuantity] = useState<number | null>(line.counted_quantity);
  const [categoryId, setCategoryId] = useState(line.edited_inventory_category_id ?? NONE_CATEGORY);
  const [storageLocation, setStorageLocation] = useState(line.edited_storage_location ?? '');
  const [note, setNote] = useState(line.note ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCountedQuantity(line.counted_quantity);
    setCategoryId(line.edited_inventory_category_id ?? NONE_CATEGORY);
    setStorageLocation(line.edited_storage_location ?? '');
    setNote(line.note ?? '');
  }, [line]);

  const difference = useMemo(() => {
    if (countedQuantity == null) {
      return null;
    }

    return countedQuantity - line.expected_quantity;
  }, [countedQuantity, line.expected_quantity]);

  const rowClassName = difference == null
    ? 'bg-amber-50/50'
    : difference !== 0
      ? 'bg-red-50/40'
      : '';

  const savePatch = async (patch: Partial<InventoryCountLine>) => {
    if (isReadonly) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(line.id, patch);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udalo sie zapisac pozycji';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className={rowClassName}>
      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{line.stock_item_name}</span>
          <span className="text-xs text-muted-foreground">
            {line.stock_item_sku} · {line.stock_item_unit}
          </span>
          {isSaving && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Zapisywanie...
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-top text-right whitespace-nowrap">
        {line.expected_quantity} {line.stock_item_unit}
      </td>
      <td className="px-3 py-3 align-top min-w-[140px]">
        <DecimalInput
          value={countedQuantity}
          onChange={setCountedQuantity}
          onBlur={() => {
            if (countedQuantity !== line.counted_quantity) {
              void savePatch({ counted_quantity: countedQuantity });
            }
          }}
          disabled={isReadonly}
          data-field="counted-quantity"
        />
      </td>
      <td className={`px-3 py-3 align-top text-right font-medium ${
        difference == null ? 'text-amber-700' : difference !== 0 ? 'text-red-700' : 'text-green-700'
      }`}>
        {difference == null ? 'Brak' : difference}
      </td>
      <td className="px-3 py-3 align-top min-w-[180px]">
        <Select
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value);
            void savePatch({
              edited_inventory_category_id: value === NONE_CATEGORY ? null : value,
            });
          }}
          disabled={isReadonly}
        >
          <SelectTrigger data-field="inventory-category">
            <SelectValue placeholder="Bez kategorii" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_CATEGORY}>Bez kategorii</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-3 align-top min-w-[180px]">
        <Input
          value={storageLocation}
          onChange={(event) => setStorageLocation(event.target.value)}
          onBlur={() => {
            if ((storageLocation || '') !== (line.edited_storage_location ?? '')) {
              void savePatch({
                edited_storage_location: storageLocation.trim() || null,
              });
            }
          }}
          disabled={isReadonly}
          placeholder="np. Regal A / Polka 2"
          data-field="storage-location"
        />
      </td>
      <td className="px-3 py-3 align-top min-w-[220px]">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if ((note || '') !== (line.note ?? '')) {
              void savePatch({ note: note.trim() || null });
            }
          }}
          disabled={isReadonly}
          rows={2}
          placeholder="Opcjonalna uwaga..."
          data-field="line-note"
        />
      </td>
    </tr>
  );
}
