'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInventoryStore } from '@/modules/inventory/store';
import { ConsumptionType } from '@/types/enums';
import { EmptyState } from '@/components/shared/empty-state';
import { ComponentSearchDialog } from './component-search-dialog';
import { Plus, Trash2, Layers, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ComponentsTabProps {
  itemId: string;
  consumptionType: ConsumptionType;
}

export function ComponentsTab({ itemId, consumptionType }: ComponentsTabProps) {
  const { currentComponents, addComponent, updateComponent, removeComponent } = useInventoryStore();
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);

  const handleAddComponent = async (componentId: string, quantity: number) => {
    try {
      await addComponent(itemId, componentId, quantity);
      toast.success('Dodano skladnik');
      setShowSearchDialog(false);
    } catch {
      toast.error('Nie udalo sie dodac skladnika');
    }
  };

  const handleUpdateQuantity = async (componentId: string) => {
    if (editQty <= 0) {
      toast.error('Ilosc musi byc dodatnia');
      return;
    }
    try {
      await updateComponent(componentId, editQty);
      toast.success('Zaktualizowano ilosc');
      setEditingId(null);
    } catch {
      toast.error('Nie udalo sie zaktualizowac ilosci');
    }
  };

  const handleRemove = async (componentId: string) => {
    try {
      await removeComponent(componentId, itemId);
      toast.success('Usunieto skladnik');
    } catch {
      toast.error('Nie udalo sie usunac skladnika');
    }
  };

  const existingComponentIds = currentComponents.map((c) => c.component_stock_item_id);

  return (
    <div className="space-y-4" data-component="components-tab">
      {consumptionType === ConsumptionType.PRODUCT && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Zmien rozchod na &ldquo;Skladowe&rdquo; w zakladce Opis, aby aktywowac automatyczne sciaganie skladnikow ze stanu magazynowego.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Skladowe (BOM)</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowSearchDialog(true)}
            data-action="add-component"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj skladnik
          </Button>
        </CardHeader>
        <CardContent>
          {currentComponents.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title="Brak skladnikow"
              description="Dodaj skladniki, aby zdefiniowac z czego sklada sie ta pozycja."
              action={
                <Button
                  variant="outline"
                  onClick={() => setShowSearchDialog(true)}
                  data-action="add-first-component"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj pierwszy skladnik
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="text-right">Ilosc</TableHead>
                  <TableHead className="hidden sm:table-cell">Jednostka</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Stan magazynowy</TableHead>
                  <TableHead className="w-[100px]">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentComponents.map((comp) => (
                  <TableRow key={comp.id} data-id={comp.id}>
                    <TableCell className="font-medium">{comp.component_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {comp.component_sku}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === comp.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={0.001}
                            step={0.001}
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value))}
                            className="w-20 h-7 text-right text-sm"
                            data-field="edit-quantity"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateQuantity(comp.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => handleUpdateQuantity(comp.id)}
                            data-action="confirm-edit-qty"
                          >
                            OK
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="cursor-pointer hover:underline"
                          onClick={() => {
                            setEditingId(comp.id);
                            setEditQty(comp.quantity);
                          }}
                          data-action="edit-quantity"
                        >
                          {comp.quantity}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {comp.component_unit}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <Badge variant="outline">{comp.current_total_stock}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(comp.id)}
                        data-action="remove-component"
                        data-id={comp.id}
                        title="Usun skladnik"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ComponentSearchDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        onAdd={handleAddComponent}
        excludeItemId={itemId}
        excludeComponentIds={existingComponentIds}
      />
    </div>
  );
}
