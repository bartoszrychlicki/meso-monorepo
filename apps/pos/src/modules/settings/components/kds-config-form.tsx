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
  UpdateKdsConfigSchema,
  type UpdateKdsConfigInput,
} from '@/schemas/location';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Resolver } from 'react-hook-form';

interface KdsConfigFormProps {
  locationId: string;
}

interface TriStateSwitchProps {
  label: string;
  localValue: boolean | null;
  globalDefault: boolean;
  onChange: (value: boolean | null) => void;
  dataField: string;
}

function TriStateSwitch({
  label,
  localValue,
  globalDefault,
  onChange,
  dataField,
}: TriStateSwitchProps) {
  const isGlobal = localValue === null;
  const effectiveValue = isGlobal ? globalDefault : localValue;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">
          {isGlobal ? '(globalne)' : '(lokalne)'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!isGlobal && (
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() => onChange(null)}
          >
            Resetuj do globalnego
          </button>
        )}
        <Switch
          checked={effectiveValue}
          onCheckedChange={(checked) => onChange(checked)}
          className={isGlobal ? 'opacity-60' : ''}
          data-field={dataField}
        />
      </div>
    </div>
  );
}

export function KdsConfigForm({ locationId }: KdsConfigFormProps) {
  const { kdsConfig, kdsDefaults, saveKdsConfig } = useLocationSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateKdsConfigInput>({
    resolver: zodResolver(UpdateKdsConfigSchema) as Resolver<UpdateKdsConfigInput>,
    defaultValues: {
      alert_time_minutes: kdsConfig?.alert_time_minutes ?? null,
      auto_accept_orders: kdsConfig?.auto_accept_orders ?? null,
      sound_enabled: kdsConfig?.sound_enabled ?? null,
      display_priority: kdsConfig?.display_priority ?? null,
    },
  });

  useEffect(() => {
    form.reset({
      alert_time_minutes: kdsConfig?.alert_time_minutes ?? null,
      auto_accept_orders: kdsConfig?.auto_accept_orders ?? null,
      sound_enabled: kdsConfig?.sound_enabled ?? null,
      display_priority: kdsConfig?.display_priority ?? null,
    });
  }, [kdsConfig, form]);

  const alertTimeValue = form.watch('alert_time_minutes');

  const handleSubmit = async (data: UpdateKdsConfigInput) => {
    setIsSubmitting(true);
    try {
      await saveKdsConfig(locationId, data);
      toast.success('Ustawienia KDS zapisane');
    } catch {
      toast.error('Nie udalo sie zapisac ustawien KDS');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-6 max-w-2xl"
      data-component="kds-config-form"
    >
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia KDS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="alert_time_minutes">Czas alertu (min)</Label>
            <Input
              id="alert_time_minutes"
              type="number"
              placeholder={
                kdsDefaults?.alert_time_minutes
                  ? `Globalne: ${kdsDefaults.alert_time_minutes}`
                  : 'Czas alertu...'
              }
              value={alertTimeValue ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                form.setValue(
                  'alert_time_minutes',
                  val === '' ? null : Number(val),
                  { shouldValidate: true }
                );
              }}
              data-field="alert_time_minutes"
            />
            <p className="text-xs text-muted-foreground">
              Puste = globalne ustawienie
              {kdsDefaults?.alert_time_minutes
                ? ` (${kdsDefaults.alert_time_minutes} min)`
                : ''}
            </p>
            {form.formState.errors.alert_time_minutes && (
              <p className="text-sm text-destructive">
                {form.formState.errors.alert_time_minutes.message}
              </p>
            )}
          </div>

          <TriStateSwitch
            label="Automatyczna akceptacja zamowien"
            localValue={form.watch('auto_accept_orders')}
            globalDefault={kdsDefaults?.auto_accept_orders ?? false}
            onChange={(value) =>
              form.setValue('auto_accept_orders', value, { shouldValidate: true })
            }
            dataField="auto_accept_orders"
          />

          <TriStateSwitch
            label="Dzwiek powiadomien"
            localValue={form.watch('sound_enabled')}
            globalDefault={kdsDefaults?.sound_enabled ?? true}
            onChange={(value) =>
              form.setValue('sound_enabled', value, { shouldValidate: true })
            }
            dataField="sound_enabled"
          />

          <TriStateSwitch
            label="Priorytet wyswietlania"
            localValue={form.watch('display_priority')}
            globalDefault={kdsDefaults?.display_priority ?? false}
            onChange={(value) =>
              form.setValue('display_priority', value, { shouldValidate: true })
            }
            dataField="display_priority"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} data-action="save-kds-config">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Zapisz ustawienia KDS
        </Button>
      </div>
    </form>
  );
}
