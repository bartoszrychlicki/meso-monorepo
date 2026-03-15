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
import { formatCurrency } from '@/lib/utils';
import {
  CreateRewardSchema,
  type CreateRewardInput,
} from '@/schemas/crm';
import type { LoyaltyRewardDefinition } from '@/types/crm';
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

const defaultValues: CreateRewardInput = {
  name: '',
  description: null,
  points_cost: 100,
  reward_type: 'free_delivery',
  discount_value: null,
  free_product_id: null,
  icon: null,
  min_tier: LoyaltyTier.BRONZE,
  sort_order: 0,
  is_active: true,
};

const tierLabels: Record<LoyaltyTier, string> = {
  bronze: 'Brązowy',
  silver: 'Srebrny',
  gold: 'Złoty',
};

const rewardLabels: Record<LoyaltyRewardDefinition['reward_type'], string> = {
  free_delivery: 'Darmowa dostawa',
  discount: 'Rabat',
  free_product: 'Darmowy produkt',
};

function asNullableString(value: string): string | null {
  return value === '' ? null : value;
}

export function RewardsManager() {
  const [rewards, setRewards] = useState<LoyaltyRewardDefinition[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyRewardDefinition | null>(null);

  const form = useForm<CreateRewardInput>({
    resolver: zodResolver(CreateRewardSchema) as Resolver<CreateRewardInput>,
    defaultValues,
  });

  const rewardType = form.watch('reward_type');

  async function loadData() {
    setIsLoading(true);
    try {
      const [rewardsResponse, productsResponse] = await Promise.all([
        fetch('/api/v1/crm/rewards', { cache: 'no-store' }),
        fetch('/api/crm/product-options', { cache: 'no-store' }),
      ]);

      const rewardsJson = await rewardsResponse.json();
      const productsJson = await productsResponse.json();

      if (!rewardsResponse.ok || !rewardsJson.success) {
        throw new Error(rewardsJson.error?.message || 'Nie udało się pobrać nagród');
      }

      if (!productsResponse.ok || !Array.isArray(productsJson.data)) {
        throw new Error(productsJson.error?.message || 'Nie udało się pobrać produktów');
      }

      setRewards(rewardsJson.data);
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

  const sortedRewards = useMemo(
    () => [...rewards].sort((left, right) => left.sort_order - right.sort_order || left.points_cost - right.points_cost),
    [rewards]
  );

  function openCreateDialog() {
    setEditingReward(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  }

  function openEditDialog(reward: LoyaltyRewardDefinition) {
    setEditingReward(reward);
    form.reset({
      name: reward.name,
      description: reward.description,
      points_cost: reward.points_cost,
      reward_type: reward.reward_type,
      discount_value: reward.discount_value,
      free_product_id: reward.free_product_id,
      icon: reward.icon,
      min_tier: reward.min_tier,
      sort_order: reward.sort_order,
      is_active: reward.is_active,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: CreateRewardInput) {
    setIsSaving(true);
    try {
      const payload = {
        ...values,
        description: values.description ?? null,
        icon: values.icon ?? null,
        free_product_id: values.free_product_id ?? null,
        discount_value: values.reward_type === 'discount' ? values.discount_value : values.discount_value ?? null,
      };
      const url = editingReward
        ? `/api/v1/crm/rewards/${editingReward.id}`
        : '/api/v1/crm/rewards';
      const method = editingReward ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Nie udało się zapisać nagrody');
      }

      toast.success(editingReward ? 'Nagroda została zaktualizowana' : 'Nagroda została dodana');
      setDialogOpen(false);
      setEditingReward(null);
      form.reset(defaultValues);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać nagrody';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Czy na pewno chcesz usunąć tę nagrodę?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/crm/rewards/${id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Nie udało się usunąć nagrody');
      }
      toast.success('Nagroda została usunięta');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się usunąć nagrody';
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4" data-view="rewards-manager">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Nagrody</CardTitle>
            <CardDescription>
              Zarządzaj katalogiem nagród, które klient może aktywować za punkty.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-action="create-reward">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj nagrodę
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingReward ? 'Edytuj nagrodę' : 'Nowa nagroda'}</DialogTitle>
                <DialogDescription>
                  Nagroda tworzy klientowi jednorazowy kupon w aplikacji delivery.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                data-component="reward-form"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="reward-name">Nazwa nagrody</Label>
                    <Input id="reward-name" {...form.register('name')} data-field="reward-name" />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="reward-description">Opis</Label>
                    <Textarea
                      id="reward-description"
                      value={form.watch('description') ?? ''}
                      onChange={(event) => form.setValue('description', asNullableString(event.target.value))}
                      data-field="reward-description"
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reward-type">Typ nagrody</Label>
                    <select
                      id="reward-type"
                      className={nativeSelectClassName}
                      value={rewardType}
                      onChange={(event) =>
                        form.setValue('reward_type', event.target.value as CreateRewardInput['reward_type'], {
                          shouldValidate: true,
                        })
                      }
                      data-field="reward-type"
                    >
                      <option value="free_delivery">Darmowa dostawa</option>
                      <option value="discount">Rabat</option>
                      <option value="free_product">Darmowy produkt</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reward-points-cost">Koszt w punktach</Label>
                    <Input
                      id="reward-points-cost"
                      type="number"
                      {...form.register('points_cost', { valueAsNumber: true })}
                      data-field="reward-points-cost"
                    />
                    {form.formState.errors.points_cost && (
                      <p className="text-sm text-destructive">{form.formState.errors.points_cost.message}</p>
                    )}
                  </div>
                  {rewardType === 'discount' && (
                    <div className="space-y-2">
                      <Label htmlFor="reward-discount-value">Wartość rabatu (PLN)</Label>
                      <Input
                        id="reward-discount-value"
                        type="number"
                        step="0.01"
                        {...form.register('discount_value', {
                          setValueAs: (value) => (value === '' ? null : Number(value)),
                        })}
                        data-field="reward-discount-value"
                      />
                      {form.formState.errors.discount_value && (
                        <p className="text-sm text-destructive">{form.formState.errors.discount_value.message}</p>
                      )}
                    </div>
                  )}
                  {rewardType === 'free_product' && (
                    <div className="space-y-2">
                      <Label htmlFor="reward-product">Produkt powiązany</Label>
                      <select
                        id="reward-product"
                        className={nativeSelectClassName}
                        value={form.watch('free_product_id') ?? ''}
                        onChange={(event) =>
                          form.setValue('free_product_id', event.target.value || null, { shouldValidate: true })
                        }
                        data-field="reward-product"
                      >
                        <option value="">Bez wskazanego produktu</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({formatCurrency(product.price)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reward-min-tier">Minimalny poziom</Label>
                    <select
                      id="reward-min-tier"
                      className={nativeSelectClassName}
                      value={form.watch('min_tier')}
                      onChange={(event) =>
                        form.setValue('min_tier', event.target.value as LoyaltyTier, { shouldValidate: true })
                      }
                      data-field="reward-min-tier"
                    >
                      <option value="bronze">Brązowy</option>
                      <option value="silver">Srebrny</option>
                      <option value="gold">Złoty</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reward-sort-order">Kolejność</Label>
                    <Input
                      id="reward-sort-order"
                      type="number"
                      {...form.register('sort_order', { valueAsNumber: true })}
                      data-field="reward-sort-order"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reward-icon">Ikona</Label>
                    <Input
                      id="reward-icon"
                      value={form.watch('icon') ?? ''}
                      onChange={(event) => form.setValue('icon', asNullableString(event.target.value))}
                      placeholder="np. 🎁"
                      data-field="reward-icon"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Aktywna</p>
                      <p className="text-sm text-muted-foreground">Nieaktywna nagroda nie będzie widoczna dla klientów.</p>
                    </div>
                    <Switch
                      checked={form.watch('is_active')}
                      onCheckedChange={(checked) => form.setValue('is_active', checked, { shouldValidate: true })}
                      data-field="reward-is-active"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingReward ? 'Zapisz zmiany' : 'Dodaj nagrodę'}
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
      ) : sortedRewards.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Brak zdefiniowanych nagród.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedRewards.map((reward) => (
            <Card key={reward.id} data-item-id={reward.id}>
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{reward.name}</CardTitle>
                    <CardDescription>{reward.description || 'Brak opisu'}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={reward.is_active ? 'default' : 'secondary'}>
                      {reward.is_active ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>
                    <Badge variant="outline">{tierLabels[reward.min_tier]}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Typ</p>
                    <p className="font-medium">{rewardLabels[reward.reward_type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Koszt</p>
                    <p className="font-medium">{reward.points_cost} pkt</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wartość</p>
                    <p className="font-medium">
                      {reward.discount_value != null ? formatCurrency(reward.discount_value) : 'Automatyczna lub brak'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kolejność</p>
                    <p className="font-medium">{reward.sort_order}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEditDialog(reward)} data-action="edit-reward">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(reward.id)} data-action="delete-reward">
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
