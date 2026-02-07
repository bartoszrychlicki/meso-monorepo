'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateEmployeeSchema, type CreateEmployeeInput } from '@/schemas/employee';
import { EmploymentType } from '@/types/enums';
import { Employee } from '@/types/employee';
import { useUserStore } from '@/modules/users/store';
import { Loader2, Save } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'chef', label: 'Szef kuchni' },
  { value: 'cook', label: 'Kucharz' },
  { value: 'cashier', label: 'Kasjer' },
  { value: 'delivery', label: 'Dostawa' },
  { value: 'manager', label: 'Kierownik' },
  { value: 'warehouse', label: 'Magazynier' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: EmploymentType.FULL_TIME, label: 'Pełny etat' },
  { value: EmploymentType.PART_TIME, label: 'Pół etatu' },
  { value: EmploymentType.CONTRACT, label: 'Umowa zlecenie' },
];

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: CreateEmployeeInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function EmployeeForm({ employee, onSubmit, isSubmitting = false }: EmployeeFormProps) {
  const { locations, loadLocations } = useUserStore();

  useEffect(() => {
    if (locations.length === 0) loadLocations();
  }, [locations.length, loadLocations]);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: employee
      ? {
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email ?? '',
          phone: employee.phone ?? '',
          employee_code: employee.employee_code,
          pin: employee.pin,
          role: employee.role,
          employment_type: employee.employment_type,
          hourly_rate: employee.hourly_rate,
          overtime_rate: employee.overtime_rate,
          location_id: employee.location_id,
          is_active: employee.is_active,
        }
      : {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          employee_code: '',
          pin: '',
          role: '',
          employment_type: EmploymentType.FULL_TIME,
          hourly_rate: 0,
          overtime_rate: undefined,
          location_id: '',
          is_active: true,
        },
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
      data-component="employee-form"
    >
      <Card>
        <CardHeader>
          <CardTitle>Dane osobowe</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">Imię</Label>
            <Input
              id="first_name"
              placeholder="Jan"
              {...form.register('first_name')}
              data-field="first_name"
            />
            {form.formState.errors.first_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.first_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Nazwisko</Label>
            <Input
              id="last_name"
              placeholder="Kowalski"
              {...form.register('last_name')}
              data-field="last_name"
            />
            {form.formState.errors.last_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.last_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jan@mesopos.pl"
              {...form.register('email')}
              data-field="email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              placeholder="+48 500 000 000"
              {...form.register('phone')}
              data-field="phone"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dane pracownika</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employee_code">Kod pracownika</Label>
            <Input
              id="employee_code"
              placeholder="EMP001"
              {...form.register('employee_code')}
              data-field="employee_code"
            />
            {form.formState.errors.employee_code && (
              <p className="text-sm text-destructive">
                {form.formState.errors.employee_code.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">PIN (4 cyfry)</Label>
            <Input
              id="pin"
              type="password"
              maxLength={4}
              placeholder="****"
              inputMode="numeric"
              {...form.register('pin')}
              data-field="pin"
            />
            {form.formState.errors.pin && (
              <p className="text-sm text-destructive">
                {form.formState.errors.pin.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Rola</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(val) => form.setValue('role', val, { shouldValidate: true })}
            >
              <SelectTrigger data-field="role">
                <SelectValue placeholder="Wybierz rolę" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-destructive">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Forma zatrudnienia</Label>
            <Select
              value={form.watch('employment_type')}
              onValueChange={(val) =>
                form.setValue('employment_type', val as EmploymentType, { shouldValidate: true })
              }
            >
              <SelectTrigger data-field="employment_type">
                <SelectValue placeholder="Wybierz formę" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Stawka godzinowa (PLN)</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.5"
              min="0"
              {...form.register('hourly_rate', { valueAsNumber: true })}
              data-field="hourly_rate"
            />
            {form.formState.errors.hourly_rate && (
              <p className="text-sm text-destructive">
                {form.formState.errors.hourly_rate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="overtime_rate">Stawka za nadgodziny (PLN)</Label>
            <Input
              id="overtime_rate"
              type="number"
              step="0.5"
              min="0"
              {...form.register('overtime_rate', { valueAsNumber: true })}
              data-field="overtime_rate"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Domyślna lokalizacja</Label>
            <Select
              value={form.watch('location_id')}
              onValueChange={(val) =>
                form.setValue('location_id', val, { shouldValidate: true })
              }
            >
              <SelectTrigger data-field="location_id">
                <SelectValue placeholder="Wybierz lokalizację" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.location_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.location_id.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} data-action="save-employee">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {employee ? 'Zapisz zmiany' : 'Dodaj pracownika'}
        </Button>
      </div>
    </form>
  );
}
