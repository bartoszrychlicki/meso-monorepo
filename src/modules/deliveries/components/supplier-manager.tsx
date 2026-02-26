'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Supplier } from '@/types/delivery';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface SupplierManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  onCreateSupplier: (data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
  }) => Promise<Supplier>;
  onUpdateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export function SupplierManager({
  open,
  onOpenChange,
  suppliers,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}: SupplierManagerProps) {
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Podaj nazwe dostawcy');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateSupplier({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        notes: newNotes.trim() || null,
      });
      toast.success(`Utworzono dostawce: ${newName.trim()}`);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
    } catch {
      toast.error('Nie udalo sie utworzyc dostawcy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Podaj nazwe dostawcy');
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdateSupplier(id, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        notes: editNotes.trim() || null,
      });
      toast.success('Dostawca zaktualizowany');
      setEditingId(null);
    } catch {
      toast.error('Nie udalo sie zaktualizowac dostawcy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await onDeleteSupplier(id);
      toast.success('Dostawca usuniety');
    } catch {
      toast.error('Nie udalo sie usunac dostawcy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setEditName(supplier.name);
    setEditPhone(supplier.phone ?? '');
    setEditEmail(supplier.email ?? '');
    setEditNotes(supplier.notes ?? '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-component="supplier-manager">
        <DialogHeader>
          <DialogTitle>Zarzadzaj dostawcami</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {suppliers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak dostawcow. Dodaj pierwszego ponizej.
              </p>
            )}
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-2 rounded-md border p-3"
                data-id={s.id}
              >
                {editingId === s.id ? (
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label>Nazwa *</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        data-field="edit-supplier-name"
                      />
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        data-field="edit-supplier-phone"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        data-field="edit-supplier-email"
                      />
                    </div>
                    <div>
                      <Label>Notatki</Label>
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        data-field="edit-supplier-notes"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(s.id)}
                        disabled={isSubmitting}
                        data-action="save-supplier"
                      >
                        Zapisz
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        data-action="cancel-edit-supplier"
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium">{s.name}</p>
                      {s.phone && (
                        <p className="text-xs text-muted-foreground">{s.phone}</p>
                      )}
                      {s.email && (
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      )}
                      {s.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(s)}
                      data-action="edit-supplier"
                      data-id={s.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(s.id)}
                      disabled={isSubmitting}
                      data-action="delete-supplier"
                      data-id={s.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Dodaj nowego dostawce</p>
            <div className="space-y-2">
              <Label>Nazwa *</Label>
              <Input
                placeholder="np. Hurtownia ABC"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-field="new-supplier-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                placeholder="np. +48 123 456 789"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                data-field="new-supplier-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="np. kontakt@abc.pl"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                data-field="new-supplier-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Notatki</Label>
              <Textarea
                placeholder="Dodatkowe informacje..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                data-field="new-supplier-notes"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="close-supplier-manager"
          >
            Zamknij
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || !newName.trim()}
            data-action="create-supplier"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj dostawce
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
