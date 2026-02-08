/**
 * New Customer Page
 *
 * Form for creating a new customer.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCRMStore } from '@/modules/crm/store';
import { PageHeader } from '@/components/layout/page-header';
import { CustomerForm } from '@/modules/crm/components/customer-form';
import { Card, CardContent } from '@/components/ui/card';
import { CreateCustomerInput } from '@/schemas/crm';
import { useToast } from '@/hooks/use-toast';

/**
 * New Customer Page
 * Create a new customer record
 */
export default function NewCustomerPage() {
  const router = useRouter();
  const { createCustomer, isLoading } = useCRMStore();
  const { toast } = useToast();

  const handleSubmit = async (data: CreateCustomerInput) => {
    try {
      const customer = await createCustomer(data);
      toast({
        title: 'Klient utworzony',
        description: `${customer.first_name} ${customer.last_name} został dodany do systemu`,
      });
      router.push(`/crm/${customer.id}`);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się utworzyć klienta',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6" data-page="new-customer">
      <PageHeader
        title="Nowy klient"
        description="Dodaj klienta do programu lojalnościowego"
      />

      <Card>
        <CardContent className="pt-6">
          <CustomerForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
