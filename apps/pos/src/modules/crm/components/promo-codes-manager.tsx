'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CreatePromotionalCodeSchema,
  type CreatePromotionalCodeInput,
} from '@/schemas/crm';
import type { PromotionalCode } from '@/types/crm';
import { LoyaltyTier } from '@/types/enums';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ProductOption = {
  id: string;
  name: string;
  price: number;
};

const nativeSelectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background';

const defaultValues: CreatePromotionalCodeInput = {
  code: '',
  name: '',
  description: null,
  discount_type: 'percent',
  discount_value: 10,
  free_item_id: null,
  min_order_amount: null,
  first_order_only: false,
  required_loyalty_tier: null,
  max_uses: null,
  max_uses_per_customer: 1,
  valid_from: new Date().toISOString(),
  valid_until: null,
  is_active: true,
  channels: ['delivery', 'pickup'],
};

const channelLabels = {
  delivery: 'Dostawa',
  pickup: 'Odbiór',
};

const tierLabels: Record<LoyaltyTier, string> = {
  bronze: 'Brązowy',
  silver: 'Srebrny',
  gold: 'Złoty',
};

const discountLabels: Record<PromotionalCode['discount_type'], string> = {
  percent: 'Rabat procentowy',
  fixed: 'Rabat kwotowy',
  free_item: 'Darmowy produkt',
  free_delivery: 'Darmowa dostawa',
};

const supportedDiscountTypes: Array<Exclude<PromotionalCode['discount_type'], 'free_item'>> = [
  'percent',
  'fixed',
  'free_delivery',
];

function asNullableString(value: string): string | null {
  return value === '' ? null : value;
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function PromoCodesManager() {
  const [promoCodes, setPromoCodes] = useState<PromotionalCode[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromotionalCode | null>(null);

  const form = useForm<CreatePromotionalCodeInput>({
    resolver: zodResolver(CreatePromotionalCodeSchema) as Resolver<CreatePromotionalCodeInput>,
    defaultValues,
  });

  const discountType = form.watch('discount_type');
  const channels = form.watch('channels');
  const availableDiscountTypes = editingCode?.discount_type === 'free_item'
    ? [...supportedDiscountTypes, 'free_item' as const]
    : supportedDiscountTypes;

  async function loadData() {
    setIsLoading(true);
    try {
      const [codesResponse, productsResponse] = await Promise.all([
        fetch('/api/v1/crm/promo-codes', { cache: 'no-store' }),
        fetch('/api/crm/product-options', { cache: 'no-store' }),
      ]);

      const codesJson = await codesResponse.json();
      const productsJson = await productsResponse.json();

      if (!codesResponse.ok || !codesJson.success) {
        throw new Error(codesJson.error?.message || 'Nie udało się pobrać kodów promocyjnych');
      }

      if (!productsResponse.ok || !Array.isArray(productsJson.data)) {
        throw new Error(productsJson.error?.message || 'Nie udało się pobrać produktów');
      }

      setPromoCodes(codesJson.data);
      setProducts(productsJson.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się pobrać danych';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const sortedCodes = useMemo(
    () => [...promoCodes].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [promoCodes]
  );

  function openCreateDialog() {
    setEditingCode(null);
    form.reset({
      ...defaultValues,
      valid_from: new Date().toISOString(),
    });
    setDialogOpen(true);
  }

  function openEditDialog(code: PromotionalCode) {
    setEditingCode(code);
    form.reset({
      code: code.code ?? '',
      name: code.name,
      description: code.description,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      free_item_id: code.free_item_id,
      min_order_amount: code.min_order_amount,
      first_order_only: code.first_order_only,
      required_loyalty_tier: code.required_loyalty_tier,
      max_uses: code.max_uses,
      max_uses_per_customer: code.max_uses_per_customer,
      valid_from: code.valid_from,
      valid_until: code.valid_until,
      is_active: code.is_active,
      channels: code.channels,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: CreatePromotionalCodeInput) {
    setIsSaving(true);
    try {
      const payload = {
        ...values,
        code: values.code.toUpperCase(),
      };

      const url = editingCode
        ? `/api/v1/crm/promo-codes/${editingCode.id}`
        : '/api/v1/crm/promo-codes';
      const method = editingCode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Nie udało się zapisać kodu promocyjnego');
      }

      toast.success(editingCode ? 'Kod promocyjny został zaktualizowany' : 'Kod promocyjny został dodany');
      setDialogOpen(false);
      setEditingCode(null);
      form.reset(defaultValues);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać kodu promocyjnego';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Czy na pewno chcesz usunąć ten kod promocyjny?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/crm/promo-codes/${id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Nie udało się usunąć kodu promocyjnego');
      }
      toast.success('Kod promocyjny został usunięty');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się usunąć kodu promocyjnego';
      toast.error(message);
    }
  }

  function toggleChannel(channel: 'delivery' | 'pickup') {
    const next = channels.includes(channel)
      ? channels.filter((value) => value !== channel)
      : [...channels, channel];
    form.setValue('channels', next, { shouldValidate: true });
  }

  return (
    <div className="space-y-4" data-view="promo-codes-manager">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Kody promocyjne</CardTitle>
            <CardDescription>
              Twórz współdzielone kody promocyjne dostępne w koszyku aplikacji delivery.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-action="create-promo-code">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj kod promocyjny
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingCode ? 'Edytuj kod promocyjny' : 'Nowy kod promocyjny'}</DialogTitle>
                <DialogDescription>
                  Ten kod promocyjny może być używany przez wielu klientów według ustawionych limitów.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                data-component="promo-code-form"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="promo-code">Kod promocyjny</Label>
                    <Input
                      id="promo-code"
                      value={form.watch('code')}
                      onChange={(event) =>
                        form.setValue('code', event.target.value.toUpperCase(), { shouldValidate: true })
                      }
                      placeholder="np. MESO10"
                      data-field="promo-code"
                    />
                    {form.formState.errors.code && (
                      <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-name">Nazwa</Label>
                    <Input id="promo-name" {...form.register('name')} data-field="promo-name" />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="promo-description">Opis</Label>
                    <Textarea
                      id="promo-description"
                      value={form.watch('description') ?? ''}
                      onChange={(event) => form.setValue('description', asNullableString(event.target.value))}
                      data-field="promo-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-discount-type">Typ kodu</Label>
                    <select
                      id="promo-discount-type"
                      className={nativeSelectClassName}
                      value={discountType}
                      onChange={(event) =>
                        form.setValue('discount_type', event.target.value as CreatePromotionalCodeInput['discount_type'], {
                          shouldValidate: true,
                        })
                      }
                      data-field="promo-discount-type"
                    >
                      {availableDiscountTypes.map((type) => (
                        <option key={type} value={type}>
                          {discountLabels[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(discountType === 'percent' || discountType === 'fixed') && (
                    <div className="space-y-2">
                      <Label htmlFor="promo-discount-value">
                        {discountType === 'percent' ? 'Rabat (%)' : 'Rabat (PLN)'}
                      </Label>
                      <Input
                        id="promo-discount-value"
                        type="number"
                        step="0.01"
                        {...form.register('discount_value', {
                          setValueAs: (value) => (value === '' ? null : Number(value)),
                        })}
                        data-field="promo-discount-value"
                      />
                      {form.formState.errors.discount_value && (
                        <p className="text-sm text-destructive">{form.formState.errors.discount_value.message}</p>
                      )}
                    </div>
                  )}
                  {discountType === 'free_item' && (
                    <div className="space-y-2">
                      <Label htmlFor="promo-product">Produkt</Label>
                      <select
                        id="promo-product"
                        className={nativeSelectClassName}
                        value={form.watch('free_item_id') ?? ''}
                        onChange={(event) =>
                          form.setValue('free_item_id', event.target.value || null, { shouldValidate: true })
                        }
                        data-field="promo-product"
                      >
                        <option value="">Wybierz produkt</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({formatCurrency(product.price)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="promo-min-order">Minimalna kwota zamówienia (PLN)</Label>
                    <Input
                      id="promo-min-order"
                      type="number"
                      step="0.01"
                      {...form.register('min_order_amount', {
                        setValueAs: (value) => (value === '' ? null : Number(value)),
                      })}
                      data-field="promo-min-order"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-tier">Minimalny poziom klienta</Label>
                    <select
                      id="promo-tier"
                      className={nativeSelectClassName}
                      value={form.watch('required_loyalty_tier') ?? ''}
                      onChange={(event) =>
                        form.setValue('required_loyalty_tier', (event.target.value || null) as LoyaltyTier | null, {
                          shouldValidate: true,
                        })
                      }
                      data-field="promo-tier"
                    >
                      <option value="">Brak wymogu</option>
                      <option value="bronze">Brązowy</option>
                      <option value="silver">Srebrny</option>
                      <option value="gold">Złoty</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-max-uses">Łączny limit użyć</Label>
                    <Input
                      id="promo-max-uses"
                      type="number"
                      {...form.register('max_uses', {
                        setValueAs: (value) => (value === '' ? null : Number(value)),
                      })}
                      data-field="promo-max-uses"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-max-uses-customer">Limit użyć na klienta</Label>
                    <Input
                      id="promo-max-uses-customer"
                      type="number"
                      {...form.register('max_uses_per_customer', {
                        setValueAs: (value) => (value === '' ? null : Number(value)),
                      })}
                      data-field="promo-max-uses-customer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-valid-from">Aktywny od</Label>
                    <Input
                      id="promo-valid-from"
                      type="datetime-local"
                      value={toDateTimeLocal(form.watch('valid_from'))}
                      onChange={(event) => form.setValue('valid_from', toIsoOrNull(event.target.value) ?? new Date().toISOString(), {
                        shouldValidate: true,
                      })}
                      data-field="promo-valid-from"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-valid-until">Aktywny do</Label>
                    <Input
                      id="promo-valid-until"
                      type="datetime-local"
                      value={toDateTimeLocal(form.watch('valid_until'))}
                      onChange={(event) => form.setValue('valid_until', toIsoOrNull(event.target.value), {
                        shouldValidate: true,
                      })}
                      data-field="promo-valid-until"
                    />
                    {form.formState.errors.valid_until && (
                      <p className="text-sm text-destructive">{form.formState.errors.valid_until.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Kanały</Label>
                    <div className="flex flex-wrap gap-3 rounded-lg border p-3">
                      {(['delivery', 'pickup'] as const).map((channel) => (
                        <label key={channel} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={channels.includes(channel)}
                            onChange={() => toggleChannel(channel)}
                          />
                          {channelLabels[channel]}
                        </label>
                      ))}
                    </div>
                    {form.formState.errors.channels && (
                      <p className="text-sm text-destructive">{form.formState.errors.channels.message}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Tylko na pierwsze zamówienie</p>
                      <p className="text-sm text-muted-foreground">Kod zadziała tylko dla klientów bez wcześniejszych zamówień.</p>
                    </div>
                    <Switch
                      checked={form.watch('first_order_only')}
                      onCheckedChange={(checked) => form.setValue('first_order_only', checked, { shouldValidate: true })}
                      data-field="promo-first-order-only"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Aktywny</p>
                      <p className="text-sm text-muted-foreground">Nieaktywny kod promocyjny nie przejdzie walidacji w koszyku.</p>
                    </div>
                    <Switch
                      checked={form.watch('is_active')}
                      onCheckedChange={(checked) => form.setValue('is_active', checked, { shouldValidate: true })}
                      data-field="promo-is-active"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingCode ? 'Zapisz zmiany' : 'Dodaj kod promocyjny'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </CardContent>
        </Card>
      ) : sortedCodes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Brak zdefiniowanych kodów promocyjnych.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedCodes.map((code) => (
            <Card key={code.id} data-item-id={code.id}>
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{code.code}</CardTitle>
                    <CardDescription>{code.name}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={code.is_active ? 'default' : 'secondary'}>
                      {code.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </Badge>
                    {code.required_loyalty_tier ? (
                      <Badge variant="outline">Od {tierLabels[code.required_loyalty_tier]}</Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Typ</p>
                    <p className="font-medium">{discountLabels[code.discount_type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wartość</p>
                    <p className="font-medium">
                      {code.discount_type === 'percent' && code.discount_value != null
                        ? `${code.discount_value}%`
                        : code.discount_value != null
                          ? formatCurrency(code.discount_value)
                          : code.discount_type === 'free_delivery'
                            ? 'Darmowa dostawa'
                            : 'Darmowy produkt'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kanały</p>
                    <p className="font-medium">{code.channels.map((channel) => channelLabels[channel]).join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Limity użyć</p>
                    <p className="font-medium">
                      {code.max_uses != null ? `${code.current_uses}/${code.max_uses}` : 'Bez limitu'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Na klienta</p>
                    <p className="font-medium">{code.max_uses_per_customer ?? 'Bez limitu'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ważność</p>
                    <p className="font-medium">
                      {formatDateTime(code.valid_from)}
                      {code.valid_until ? ` - ${formatDateTime(code.valid_until)}` : ' - bez końca'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEditDialog(code)} data-action="edit-promo-code">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(code.id)} data-action="delete-promo-code">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
