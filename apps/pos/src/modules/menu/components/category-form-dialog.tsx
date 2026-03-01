'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  existingCount: number;
}

const COLOR_OPTIONS = [
  { value: 'from-orange-500 to-red-600', label: 'Pomaranczowy-czerwony' },
  { value: 'from-yellow-400 to-orange-500', label: 'Zolty-pomaranczowy' },
  { value: 'from-green-400 to-emerald-600', label: 'Zielony' },
  { value: 'from-blue-400 to-cyan-600', label: 'Niebieski' },
  { value: 'from-pink-400 to-rose-600', label: 'Rozowy' },
  { value: 'from-violet-400 to-purple-600', label: 'Fioletowy' },
  { value: 'from-amber-600 to-yellow-800', label: 'Brazowy' },
  { value: 'from-gray-400 to-gray-600', label: 'Szary' },
];

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSave,
  existingCount,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('from-gray-400 to-gray-600');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description ?? '');
      setColor(category.color ?? 'from-gray-400 to-gray-600');
      setSortOrder(category.sort_order);
      setIsActive(category.is_active);
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setColor('from-gray-400 to-gray-600');
      setSortOrder(existingCount + 1);
      setIsActive(true);
    }
  }, [category, existingCount, open]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!category) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
      );
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description: description || undefined,
        color,
        sort_order: sortOrder,
        is_active: isActive,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-component="category-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edytuj kategorie' : 'Nowa kategoria'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nazwa *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="np. Burgery"
                data-field="category-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="burgery"
                data-field="category-slug"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-desc">Opis</Label>
            <Input
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opis kategorii..."
              data-field="category-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kolor</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger data-field="category-color">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${color}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${opt.value}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-order">Kolejnosc</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                data-field="category-sort-order"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cat-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
              data-field="category-active"
            />
            <Label htmlFor="cat-active" className="text-sm">
              Kategoria aktywna
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="cancel"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            data-action="save-category"
          >
            {isSubmitting ? 'Zapisywanie...' : category ? 'Zapisz' : 'Dodaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
