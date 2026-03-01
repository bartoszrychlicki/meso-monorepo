'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  UpdateReceiptDefaultsSchema,
  UpdateKdsDefaultsSchema,
  type UpdateReceiptDefaultsInput,
  type UpdateKdsDefaultsInput,
} from '@/schemas/location';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Resolver } from 'react-hook-form';

/* ------------------------------------------------------------------ */
/*  ReceiptDefaultsCard                                               */
/* ------------------------------------------------------------------ */

export function ReceiptDefaultsCard() {
  const { receiptDefaults, loadGlobalDefaults, saveReceiptDefaults } =
    useLocationSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateReceiptDefaultsInput>({
    resolver: zodResolver(
      UpdateReceiptDefaultsSchema
    ) as Resolver<UpdateReceiptDefaultsInput>,
    defaultValues: {
      header: receiptDefaults?.header ?? '',
      footer: receiptDefaults?.footer ?? '',
      print_automatically: receiptDefaults?.print_automatically ?? false,
      show_logo: receiptDefaults?.show_logo ?? false,
    },
  });

  useEffect(() => {
    loadGlobalDefaults();
  }, [loadGlobalDefaults]);

  useEffect(() => {
    if (receiptDefaults) {
      form.reset({
        header: receiptDefaults.header,
        footer: receiptDefaults.footer,
        print_automatically: receiptDefaults.print_automatically,
        show_logo: receiptDefaults.show_logo,
      });
    }
  }, [receiptDefaults, form]);

  const handleSubmit = async (data: UpdateReceiptDefaultsInput) => {
    setIsSubmitting(true);
    try {
      await saveReceiptDefaults(data);
      toast.success('Domyślne ustawienia paragonów zapisane');
    } catch {
      toast.error('Nie udało się zapisać ustawień paragonów');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card data-component="receipt-defaults-card">
      <CardHeader>
        <CardTitle>Domyślne ustawienia paragonów</CardTitle>
        <CardDescription>
          Te ustawienia są używane jako domyślne dla wszystkich lokalizacji
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="receipt-default-header">Nagłówek</Label>
            <Textarea
              id="receipt-default-header"
              {...form.register('header')}
              rows={3}
              data-field="receipt-default-header"
            />
            {form.formState.errors.header && (
              <p className="text-sm text-destructive">
                {form.formState.errors.header.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-default-footer">Stopka</Label>
            <Textarea
              id="receipt-default-footer"
              {...form.register('footer')}
              rows={3}
              data-field="receipt-default-footer"
            />
            {form.formState.errors.footer && (
              <p className="text-sm text-destructive">
                {form.formState.errors.footer.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="receipt-default-print-auto">
                Drukuj automatycznie
              </Label>
            </div>
            <Switch
              id="receipt-default-print-auto"
              checked={form.watch('print_automatically')}
              onCheckedChange={(checked) =>
                form.setValue('print_automatically', checked, {
                  shouldValidate: true,
                })
              }
              data-field="receipt-default-print-automatically"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="receipt-default-show-logo">Pokazuj logo</Label>
            </div>
            <Switch
              id="receipt-default-show-logo"
              checked={form.watch('show_logo')}
              onCheckedChange={(checked) =>
                form.setValue('show_logo', checked, {
                  shouldValidate: true,
                })
              }
              data-field="receipt-default-show-logo"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              data-action="save-receipt-defaults"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Zapisz
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  KdsDefaultsCard                                                   */
/* ------------------------------------------------------------------ */

export function KdsDefaultsCard() {
  const { kdsDefaults, loadGlobalDefaults, saveKdsDefaults } =
    useLocationSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateKdsDefaultsInput>({
    resolver: zodResolver(
      UpdateKdsDefaultsSchema
    ) as Resolver<UpdateKdsDefaultsInput>,
    defaultValues: {
      alert_time_minutes: kdsDefaults?.alert_time_minutes ?? 5,
      auto_accept_orders: kdsDefaults?.auto_accept_orders ?? false,
      sound_enabled: kdsDefaults?.sound_enabled ?? true,
      display_priority: kdsDefaults?.display_priority ?? false,
    },
  });

  useEffect(() => {
    loadGlobalDefaults();
  }, [loadGlobalDefaults]);

  useEffect(() => {
    if (kdsDefaults) {
      form.reset({
        alert_time_minutes: kdsDefaults.alert_time_minutes,
        auto_accept_orders: kdsDefaults.auto_accept_orders,
        sound_enabled: kdsDefaults.sound_enabled,
        display_priority: kdsDefaults.display_priority,
      });
    }
  }, [kdsDefaults, form]);

  const handleSubmit = async (data: UpdateKdsDefaultsInput) => {
    setIsSubmitting(true);
    try {
      await saveKdsDefaults(data);
      toast.success('Domyślne ustawienia KDS zapisane');
    } catch {
      toast.error('Nie udało się zapisać ustawień KDS');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card data-component="kds-defaults-card">
      <CardHeader>
        <CardTitle>Domyślne ustawienia KDS</CardTitle>
        <CardDescription>
          Te ustawienia są używane jako domyślne dla wszystkich lokalizacji
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="kds-default-alert-time">
              Czas alertu (minuty)
            </Label>
            <Input
              id="kds-default-alert-time"
              type="number"
              min={1}
              {...form.register('alert_time_minutes', { valueAsNumber: true })}
              data-field="kds-default-alert-time-minutes"
            />
            {form.formState.errors.alert_time_minutes && (
              <p className="text-sm text-destructive">
                {form.formState.errors.alert_time_minutes.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="kds-default-auto-accept">
                Automatyczna akceptacja zamówień
              </Label>
            </div>
            <Switch
              id="kds-default-auto-accept"
              checked={form.watch('auto_accept_orders')}
              onCheckedChange={(checked) =>
                form.setValue('auto_accept_orders', checked, {
                  shouldValidate: true,
                })
              }
              data-field="kds-default-auto-accept-orders"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="kds-default-sound">Dźwięk powiadomień</Label>
            </div>
            <Switch
              id="kds-default-sound"
              checked={form.watch('sound_enabled')}
              onCheckedChange={(checked) =>
                form.setValue('sound_enabled', checked, {
                  shouldValidate: true,
                })
              }
              data-field="kds-default-sound-enabled"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="kds-default-priority">
                Priorytet wyświetlania
              </Label>
            </div>
            <Switch
              id="kds-default-priority"
              checked={form.watch('display_priority')}
              onCheckedChange={(checked) =>
                form.setValue('display_priority', checked, {
                  shouldValidate: true,
                })
              }
              data-field="kds-default-display-priority"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              data-action="save-kds-defaults"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Zapisz
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
