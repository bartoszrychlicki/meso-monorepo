'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UpdateDeliveryConfigSchema,
  type UpdateDeliveryConfigInput,
} from '@/schemas/location';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Resolver } from 'react-hook-form';

interface DeliveryConfigFormProps {
  locationId: string;
}

function trimTimeSeconds(time: string | undefined | null): string {
  if (!time) return '';
  // "HH:MM:SS" -> "HH:MM"
  return time.replace(/^(\d{2}:\d{2}):\d{2}$/, '$1');
}

export function DeliveryConfigForm({ locationId }: DeliveryConfigFormProps) {
  const { deliveryConfig, saveDeliveryConfig } = useLocationSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateDeliveryConfigInput>({
    resolver: zodResolver(UpdateDeliveryConfigSchema) as Resolver<UpdateDeliveryConfigInput>,
    defaultValues: {
      is_delivery_active: deliveryConfig?.is_delivery_active ?? false,
      delivery_radius_km: deliveryConfig?.delivery_radius_km ?? 5,
      delivery_fee: deliveryConfig?.delivery_fee ?? 0,
      min_order_amount: deliveryConfig?.min_order_amount ?? 0,
      estimated_delivery_minutes: deliveryConfig?.estimated_delivery_minutes ?? 30,
      opening_time: trimTimeSeconds(deliveryConfig?.opening_time) || '08:00',
      closing_time: trimTimeSeconds(deliveryConfig?.closing_time) || '22:00',
      pickup_time_min: deliveryConfig?.pickup_time_min ?? 10,
      pickup_time_max: deliveryConfig?.pickup_time_max ?? 30,
      pickup_buffer_after_open: deliveryConfig?.pickup_buffer_after_open ?? 0,
      pickup_buffer_before_close: deliveryConfig?.pickup_buffer_before_close ?? 0,
      pay_on_pickup_enabled: deliveryConfig?.pay_on_pickup_enabled ?? false,
      pay_on_pickup_fee: deliveryConfig?.pay_on_pickup_fee ?? 0,
      pay_on_pickup_max_order: deliveryConfig?.pay_on_pickup_max_order ?? 0,
    },
  });

  useEffect(() => {
    if (deliveryConfig) {
      form.reset({
        is_delivery_active: deliveryConfig.is_delivery_active,
        delivery_radius_km: deliveryConfig.delivery_radius_km,
        delivery_fee: deliveryConfig.delivery_fee,
        min_order_amount: deliveryConfig.min_order_amount,
        estimated_delivery_minutes: deliveryConfig.estimated_delivery_minutes,
        opening_time: trimTimeSeconds(deliveryConfig.opening_time) || '08:00',
        closing_time: trimTimeSeconds(deliveryConfig.closing_time) || '22:00',
        pickup_time_min: deliveryConfig.pickup_time_min,
        pickup_time_max: deliveryConfig.pickup_time_max,
        pickup_buffer_after_open: deliveryConfig.pickup_buffer_after_open,
        pickup_buffer_before_close: deliveryConfig.pickup_buffer_before_close,
        pay_on_pickup_enabled: deliveryConfig.pay_on_pickup_enabled,
        pay_on_pickup_fee: deliveryConfig.pay_on_pickup_fee,
        pay_on_pickup_max_order: deliveryConfig.pay_on_pickup_max_order,
      });
    }
  }, [deliveryConfig, form]);

  const isDeliveryActive = form.watch('is_delivery_active');

  const handleSubmit = async (data: UpdateDeliveryConfigInput) => {
    setIsSubmitting(true);
    try {
      await saveDeliveryConfig(locationId, data);
      toast.success('Ustawienia dostawy zapisane');
    } catch {
      toast.error('Nie udalo sie zapisac ustawien dostawy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-6 max-w-2xl"
      data-component="delivery-config-form"
    >
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia dostawy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_delivery_active">Dostawa aktywna</Label>
              {!isDeliveryActive && (
                <p className="text-sm text-muted-foreground">
                  Wlacz, aby skonfigurowac ustawienia dostawy
                </p>
              )}
            </div>
            <Switch
              id="is_delivery_active"
              checked={isDeliveryActive}
              onCheckedChange={(checked) =>
                form.setValue('is_delivery_active', checked, { shouldValidate: true })
              }
              data-field="is_delivery_active"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="delivery_radius_km">Promien dostawy (km)</Label>
              <Input
                id="delivery_radius_km"
                type="number"
                step="0.1"
                disabled={!isDeliveryActive}
                {...form.register('delivery_radius_km', { valueAsNumber: true })}
                data-field="delivery_radius_km"
              />
              {form.formState.errors.delivery_radius_km && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.delivery_radius_km.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_fee">Oplata za dostawe (PLN)</Label>
              <Input
                id="delivery_fee"
                type="number"
                step="0.01"
                disabled={!isDeliveryActive}
                {...form.register('delivery_fee', { valueAsNumber: true })}
                data-field="delivery_fee"
              />
              {form.formState.errors.delivery_fee && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.delivery_fee.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_order_amount">Minimalna kwota zamowienia (PLN)</Label>
              <Input
                id="min_order_amount"
                type="number"
                step="0.01"
                disabled={!isDeliveryActive}
                {...form.register('min_order_amount', { valueAsNumber: true })}
                data-field="min_order_amount"
              />
              {form.formState.errors.min_order_amount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.min_order_amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_delivery_minutes">Szacowany czas dostawy (min)</Label>
              <Input
                id="estimated_delivery_minutes"
                type="number"
                disabled={!isDeliveryActive}
                {...form.register('estimated_delivery_minutes', { valueAsNumber: true })}
                data-field="estimated_delivery_minutes"
              />
              {form.formState.errors.estimated_delivery_minutes && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.estimated_delivery_minutes.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="opening_time">Godzina otwarcia</Label>
              <Input
                id="opening_time"
                type="time"
                disabled={!isDeliveryActive}
                {...form.register('opening_time')}
                data-field="opening_time"
              />
              {form.formState.errors.opening_time && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.opening_time.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing_time">Godzina zamkniecia</Label>
              <Input
                id="closing_time"
                type="time"
                disabled={!isDeliveryActive}
                {...form.register('closing_time')}
                data-field="closing_time"
              />
              {form.formState.errors.closing_time && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.closing_time.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Odbior osobisty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickup_time_min">Minimalny czas odbioru (min)</Label>
              <Input
                id="pickup_time_min"
                type="number"
                disabled={!isDeliveryActive}
                {...form.register('pickup_time_min', { valueAsNumber: true })}
                data-field="pickup_time_min"
              />
              {form.formState.errors.pickup_time_min && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pickup_time_min.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_time_max">Maksymalny czas odbioru (min)</Label>
              <Input
                id="pickup_time_max"
                type="number"
                disabled={!isDeliveryActive}
                {...form.register('pickup_time_max', { valueAsNumber: true })}
                data-field="pickup_time_max"
              />
              {form.formState.errors.pickup_time_max && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pickup_time_max.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickup_buffer_after_open">Bufor po otwarciu (min)</Label>
              <Input
                id="pickup_buffer_after_open"
                type="number"
                disabled={!isDeliveryActive}
                {...form.register('pickup_buffer_after_open', { valueAsNumber: true })}
                data-field="pickup_buffer_after_open"
              />
              {form.formState.errors.pickup_buffer_after_open && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pickup_buffer_after_open.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_buffer_before_close">Bufor przed zamknieciem (min)</Label>
              <Input
                id="pickup_buffer_before_close"
                type="number"
                disabled={!isDeliveryActive}
                {...form.register('pickup_buffer_before_close', { valueAsNumber: true })}
                data-field="pickup_buffer_before_close"
              />
              {form.formState.errors.pickup_buffer_before_close && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pickup_buffer_before_close.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platnosc przy odbiorze</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="pay_on_pickup_enabled">Platnosc przy odbiorze</Label>
            <Switch
              id="pay_on_pickup_enabled"
              checked={form.watch('pay_on_pickup_enabled')}
              onCheckedChange={(checked) =>
                form.setValue('pay_on_pickup_enabled', checked, { shouldValidate: true })
              }
              disabled={!isDeliveryActive}
              data-field="pay_on_pickup_enabled"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay_on_pickup_fee">Oplata za platnosc przy odbiorze (PLN)</Label>
              <Input
                id="pay_on_pickup_fee"
                type="number"
                step="0.01"
                disabled={!isDeliveryActive}
                {...form.register('pay_on_pickup_fee', { valueAsNumber: true })}
                data-field="pay_on_pickup_fee"
              />
              {form.formState.errors.pay_on_pickup_fee && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pay_on_pickup_fee.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_on_pickup_max_order">Max kwota zamowienia (PLN)</Label>
              <Input
                id="pay_on_pickup_max_order"
                type="number"
                step="0.01"
                disabled={!isDeliveryActive}
                {...form.register('pay_on_pickup_max_order', { valueAsNumber: true })}
                data-field="pay_on_pickup_max_order"
              />
              {form.formState.errors.pay_on_pickup_max_order && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pay_on_pickup_max_order.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} data-action="save-delivery-config">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Zapisz ustawienia dostawy
        </Button>
      </div>
    </form>
  );
}
