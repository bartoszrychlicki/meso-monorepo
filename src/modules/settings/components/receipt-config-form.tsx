'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UpdateReceiptConfigSchema,
  type UpdateReceiptConfigInput,
} from '@/schemas/location';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Resolver } from 'react-hook-form';

interface ReceiptConfigFormProps {
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

export function ReceiptConfigForm({ locationId }: ReceiptConfigFormProps) {
  const { receiptConfig, receiptDefaults, saveReceiptConfig } =
    useLocationSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateReceiptConfigInput>({
    resolver: zodResolver(UpdateReceiptConfigSchema) as Resolver<UpdateReceiptConfigInput>,
    defaultValues: {
      receipt_header: receiptConfig?.receipt_header ?? null,
      receipt_footer: receiptConfig?.receipt_footer ?? null,
      print_automatically: receiptConfig?.print_automatically ?? null,
      show_logo: receiptConfig?.show_logo ?? null,
    },
  });

  useEffect(() => {
    form.reset({
      receipt_header: receiptConfig?.receipt_header ?? null,
      receipt_footer: receiptConfig?.receipt_footer ?? null,
      print_automatically: receiptConfig?.print_automatically ?? null,
      show_logo: receiptConfig?.show_logo ?? null,
    });
  }, [receiptConfig, form]);

  const handleSubmit = async (data: UpdateReceiptConfigInput) => {
    setIsSubmitting(true);
    try {
      // Convert empty strings to null for text fields
      const payload: UpdateReceiptConfigInput = {
        ...data,
        receipt_header: data.receipt_header?.trim() || null,
        receipt_footer: data.receipt_footer?.trim() || null,
      };
      await saveReceiptConfig(locationId, payload);
      toast.success('Ustawienia paragonu zapisane');
    } catch {
      toast.error('Nie udalo sie zapisac ustawien paragonu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-6 max-w-2xl"
      data-component="receipt-config-form"
    >
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia paragonu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="receipt_header">Naglowek paragonu</Label>
            <Textarea
              id="receipt_header"
              placeholder={receiptDefaults?.header || 'Naglowek paragonu...'}
              value={form.watch('receipt_header') ?? ''}
              onChange={(e) =>
                form.setValue('receipt_header', e.target.value || null, {
                  shouldValidate: true,
                })
              }
              rows={3}
              data-field="receipt_header"
            />
            <p className="text-xs text-muted-foreground">
              Puste = globalne ustawienie
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_footer">Stopka paragonu</Label>
            <Textarea
              id="receipt_footer"
              placeholder={receiptDefaults?.footer || 'Stopka paragonu...'}
              value={form.watch('receipt_footer') ?? ''}
              onChange={(e) =>
                form.setValue('receipt_footer', e.target.value || null, {
                  shouldValidate: true,
                })
              }
              rows={3}
              data-field="receipt_footer"
            />
            <p className="text-xs text-muted-foreground">
              Puste = globalne ustawienie
            </p>
          </div>

          <TriStateSwitch
            label="Drukuj automatycznie"
            localValue={form.watch('print_automatically')}
            globalDefault={receiptDefaults?.print_automatically ?? false}
            onChange={(value) =>
              form.setValue('print_automatically', value, { shouldValidate: true })
            }
            dataField="print_automatically"
          />

          <TriStateSwitch
            label="Pokazuj logo"
            localValue={form.watch('show_logo')}
            globalDefault={receiptDefaults?.show_logo ?? false}
            onChange={(value) =>
              form.setValue('show_logo', value, { shouldValidate: true })
            }
            dataField="show_logo"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} data-action="save-receipt-config">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Zapisz ustawienia paragonu
        </Button>
      </div>
    </form>
  );
}
