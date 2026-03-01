'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateLocationSchema, type CreateLocationInput } from '@/schemas/location';
import { LocationType } from '@/types/enums';
import { Location } from '@/types/common';
import { Loader2, Save } from 'lucide-react';
import type { Resolver } from 'react-hook-form';

const LOCATION_TYPE_OPTIONS = [
  { value: LocationType.CENTRAL_KITCHEN, label: 'Kuchnia Centralna' },
  { value: LocationType.FOOD_TRUCK, label: 'Food Truck' },
  { value: LocationType.KIOSK, label: 'Kiosk' },
  { value: LocationType.RESTAURANT, label: 'Restauracja' },
];

interface LocationBasicFormProps {
  location?: Location;
  onSubmit: (data: CreateLocationInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function LocationBasicForm({
  location,
  onSubmit,
  isSubmitting = false,
}: LocationBasicFormProps) {
  const form = useForm<CreateLocationInput>({
    resolver: zodResolver(CreateLocationSchema) as Resolver<CreateLocationInput>,
    defaultValues: location
      ? {
          name: location.name,
          type: location.type,
          address: {
            street: location.address?.street ?? '',
            city: location.address?.city ?? '',
            postal_code: location.address?.postal_code ?? '',
            country: location.address?.country ?? 'PL',
          },
          phone: location.phone ?? '',
          is_active: location.is_active,
        }
      : {
          name: '',
          type: undefined as unknown as LocationType,
          address: {
            street: '',
            city: '',
            postal_code: '',
            country: 'PL',
          },
          phone: '',
          is_active: true,
        },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        type: location.type,
        address: {
          street: location.address?.street ?? '',
          city: location.address?.city ?? '',
          postal_code: location.address?.postal_code ?? '',
          country: location.address?.country ?? 'PL',
        },
        phone: location.phone ?? '',
        is_active: location.is_active,
      });
    }
  }, [location, form]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
      data-component="location-basic-form"
    >
      <Card>
        <CardHeader>
          <CardTitle>Dane podstawowe</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa lokalizacji</Label>
            <Input
              id="name"
              placeholder="np. Food Truck Centrum"
              {...form.register('name')}
              data-field="name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Typ lokalizacji</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(val) =>
                form.setValue('type', val as LocationType, { shouldValidate: true })
              }
            >
              <SelectTrigger data-field="type">
                <SelectValue placeholder="Wybierz typ" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.street">Ulica</Label>
            <Input
              id="address.street"
              placeholder="ul. Przykładowa 1"
              {...form.register('address.street')}
              data-field="address-street"
            />
            {form.formState.errors.address?.street && (
              <p className="text-sm text-destructive">
                {form.formState.errors.address.street.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.city">Miasto</Label>
            <Input
              id="address.city"
              placeholder="Warszawa"
              {...form.register('address.city')}
              data-field="address-city"
            />
            {form.formState.errors.address?.city && (
              <p className="text-sm text-destructive">
                {form.formState.errors.address.city.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.postal_code">Kod pocztowy</Label>
            <Input
              id="address.postal_code"
              placeholder="00-001"
              {...form.register('address.postal_code')}
              data-field="address-postal-code"
            />
            {form.formState.errors.address?.postal_code && (
              <p className="text-sm text-destructive">
                {form.formState.errors.address.postal_code.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
            <Input
              id="phone"
              placeholder="+48 500 000 000"
              {...form.register('phone')}
              data-field="phone"
            />
          </div>
        </CardContent>
      </Card>

      {location && (
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Lokalizacja aktywna</Label>
                {!form.watch('is_active') && (
                  <p className="text-sm text-destructive">
                    Wyłączenie lokalizacji spowoduje, że nie będzie widoczna w systemie
                    zamówień i nie będzie można do niej przypisywać pracowników.
                  </p>
                )}
              </div>
              <Switch
                id="is_active"
                checked={form.watch('is_active')}
                onCheckedChange={(checked) =>
                  form.setValue('is_active', checked, { shouldValidate: true })
                }
                data-field="is_active"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} data-action="save-location">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {location ? 'Zapisz' : 'Dodaj lokalizację'}
        </Button>
      </div>
    </form>
  );
}
