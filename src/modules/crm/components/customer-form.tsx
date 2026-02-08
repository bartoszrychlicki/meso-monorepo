/**
 * Customer Form Component
 *
 * Multi-step form for creating and editing customers.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCustomerSchema, CreateCustomerInput } from '@/schemas/crm';
import { CustomerSource } from '@/types/enums';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface CustomerFormProps {
  defaultValues?: Partial<CreateCustomerInput>;
  onSubmit: (data: CreateCustomerInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Customer Form
 * Form for creating or editing customer information
 */
export function CustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomerFormProps) {
  const form = useForm<any>({
    resolver: zodResolver(CreateCustomerSchema) as any,
    defaultValues: {
      first_name: defaultValues?.first_name || '',
      last_name: defaultValues?.last_name || '',
      email: defaultValues?.email || undefined,
      phone: defaultValues?.phone || '',
      birth_date: defaultValues?.birth_date || undefined,
      source: defaultValues?.source || CustomerSource.POS_TERMINAL,
      marketing_consent: defaultValues?.marketing_consent || false,
      addresses: defaultValues?.addresses || [],
      preferences: defaultValues?.preferences || undefined,
      notes: defaultValues?.notes || undefined,
    },
  });

  const handleSubmit = async (data: CreateCustomerInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        data-component="customer-form"
      >
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dane podstawowe</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Jan"
                      data-field="first-name"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwisko *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Kowalski"
                      data-field="last-name"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="+48 500 123 456"
                      data-field="phone"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Wymagany do identyfikacji klienta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="jan.kowalski@example.com"
                      data-field="email"
                      disabled={isLoading}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Opcjonalny</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data urodzenia</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      data-field="birth-date"
                      disabled={isLoading}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Do bonusów urodzinowych
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Źródło rejestracji</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger data-field="source">
                        <SelectValue placeholder="Wybierz źródło" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CustomerSource.POS_TERMINAL}>
                        Terminal POS
                      </SelectItem>
                      <SelectItem value={CustomerSource.MOBILE_APP}>
                        Aplikacja mobilna
                      </SelectItem>
                      <SelectItem value={CustomerSource.WEBSITE}>
                        Strona WWW
                      </SelectItem>
                      <SelectItem value={CustomerSource.MANUAL_IMPORT}>
                        Import ręczny
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Marketing Consent */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Zgody marketingowe</h3>

          <FormField
            control={form.control}
            name="marketing_consent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-field="marketing-consent"
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Zgoda na komunikację marketingową (RODO)
                  </FormLabel>
                  <FormDescription>
                    Klient wyraża zgodę na otrzymywanie powiadomień SMS/Email
                    o promocjach i statusie zamówień
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notatki wewnętrzne</h3>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notatki</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Dodatkowe informacje o kliencie (np. preferencje, uwagi)..."
                    rows={4}
                    data-field="notes"
                    disabled={isLoading}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>
                  Widoczne tylko dla pracowników
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-action="cancel"
            >
              Anuluj
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            data-action="submit-customer"
          >
            {isLoading ? 'Zapisywanie...' : 'Zapisz klienta'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
