'use client';

import { useState, useEffect } from 'react';
import { Product, ProductVariant, MenuModifier } from '@/types/menu';
import { OrderItemModifier } from '@/types/order';
import { ModifierAction } from '@/types/enums';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ModifierSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  modifiers: MenuModifier[];
  variant?: ProductVariant | null;
  onConfirm: (selectedModifiers: OrderItemModifier[]) => void;
}

export function ModifierSelectionDialog({
  open,
  onOpenChange,
  product,
  modifiers,
  onConfirm,
}: ModifierSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  const toggleModifier = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedMods: OrderItemModifier[] = modifiers
      .filter((m) => selectedIds.has(m.id))
      .map((m) => ({
        modifier_id: m.id,
        name: m.name,
        price: m.price,
        quantity: 1,
        modifier_action: m.modifier_action,
      }));
    onConfirm(selectedMods);
  };

  const handleSkip = () => {
    onConfirm([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        data-component="modifier-selection-dialog"
      >
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Wybierz modyfikatory:
          </p>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {modifiers.map((mod) => (
            <label
              key={mod.id}
              className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              data-id={mod.id}
            >
              <Checkbox
                checked={selectedIds.has(mod.id)}
                onCheckedChange={() => toggleModifier(mod.id)}
                aria-label={mod.name}
              />
              <span className="flex-1 text-sm font-medium">{mod.name}</span>
              <Badge variant={mod.modifier_action === ModifierAction.REMOVE ? 'destructive' : 'secondary'}>
                {mod.modifier_action === ModifierAction.REMOVE
                  ? 'Usun'
                  : mod.price > 0
                  ? `+${formatCurrency(mod.price)}`
                  : mod.price < 0
                  ? formatCurrency(mod.price)
                  : 'bezplatnie'}
              </Badge>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleSkip}
            data-action="skip-modifiers"
          >
            Bez modyfikatorow
          </Button>
          <Button
            onClick={handleConfirm}
            data-action="confirm-modifiers"
          >
            Dodaj do zamowienia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
