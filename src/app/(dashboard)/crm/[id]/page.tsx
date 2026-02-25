/**
 * Customer Detail Page
 *
 * View and edit customer information, loyalty history, and orders.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/modules/crm/store';
import { crmRepository } from '@/modules/crm/repository';
import { PageHeader } from '@/components/layout/page-header';
import { LoyaltyCard } from '@/modules/crm/components/loyalty-card';
import { CustomerForm } from '@/modules/crm/components/customer-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  FileText,
  History,
  Edit,
  Trash2,
} from 'lucide-react';
import { UpdateCustomerInput } from '@/schemas/crm';
import { useToast } from '@/hooks/use-toast';
import { LoyaltyTransaction } from '@/types/crm';
import { formatCurrency } from '@/lib/utils';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';

/**
 * Customer Detail Page
 * Shows customer profile, loyalty info, and transaction history
 */
export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { updateCustomer, deleteCustomer, loadCustomers } = useCRMStore();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<any>(null);
  useBreadcrumbLabel(customerId, customer ? `${customer.first_name} ${customer.last_name}` : undefined);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const customerData = await crmRepository.customers.findById(customerId);
        if (!customerData) {
          toast({
            title: 'Błąd',
            description: 'Nie znaleziono klienta',
            variant: 'destructive',
          });
          router.push('/crm');
          return;
        }
        setCustomer(customerData);

        const history = await crmRepository.getCustomerLoyaltyHistory(customerId);
        setLoyaltyHistory(history);
      } catch (error) {
        console.error('Failed to load customer:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się załadować danych klienta',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, [customerId, router, toast]);

  const handleUpdate = async (data: UpdateCustomerInput) => {
    try {
      await updateCustomer(customerId, data);
      await loadCustomers();
      const updatedCustomer = await crmRepository.customers.findById(customerId);
      setCustomer(updatedCustomer);
      setIsEditing(false);
      toast({
        title: 'Zapisano',
        description: 'Dane klienta zostały zaktualizowane',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować klienta',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunąć tego klienta?')) return;

    try {
      await deleteCustomer(customerId);
      toast({
        title: 'Usunięto',
        description: 'Klient został usunięty',
      });
      router.push('/crm');
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć klienta',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6" data-page="customer-detail" data-id={customerId}>
      <PageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        description={`Profil klienta • ID: ${customerId.slice(0, 8)}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              data-action="toggle-edit"
            >
              <Edit className="mr-2 h-4 w-4" />
              {isEditing ? 'Anuluj' : 'Edytuj'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              data-action="delete-customer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Info & Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edycja danych klienta</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerForm
                  defaultValues={{
                    first_name: customer.first_name,
                    last_name: customer.last_name,
                    email: customer.email,
                    phone: customer.phone,
                    birth_date: customer.birth_date
                      ? new Date(customer.birth_date).toISOString().split('T')[0]
                      : undefined,
                    source: customer.source,
                    marketing_consent: customer.marketing_consent,
                    notes: customer.notes,
                  }}
                  onSubmit={handleUpdate}
                  onCancel={() => setIsEditing(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profil</TabsTrigger>
                <TabsTrigger value="history">Historia punktów</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informacje kontaktowe
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span data-field="phone">{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span data-field="email">{customer.email}</span>
                      </div>
                    )}
                    {customer.birth_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(customer.birth_date).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {customer.source === 'mobile_app' && 'Aplikacja mobilna'}
                        {customer.source === 'pos_terminal' && 'Terminal POS'}
                        {customer.source === 'website' && 'Strona WWW'}
                        {customer.source === 'manual_import' && 'Import ręczny'}
                      </Badge>
                      {customer.marketing_consent && (
                        <Badge variant="secondary">Zgoda marketingowa</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {customer.addresses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Adresy dostawy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {customer.addresses.map((address: any) => (
                        <div key={address.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{address.label}</Badge>
                            {address.is_default && (
                              <Badge variant="secondary">Domyślny</Badge>
                            )}
                          </div>
                          <p className="text-sm">
                            {address.street} {address.building_number}
                            {address.apartment_number && `/${address.apartment_number}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.postal_code} {address.city}
                          </p>
                          {address.delivery_instructions && (
                            <p className="text-xs text-muted-foreground italic">
                              {address.delivery_instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {customer.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notatki
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Historia punktów lojalnościowych
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loyaltyHistory.length > 0 ? (
                      <div className="space-y-3">
                        {loyaltyHistory.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {transaction.reason === 'purchase' && 'Zakup'}
                                {transaction.reason === 'first_order' && 'Pierwsze zamówienie'}
                                {transaction.reason === 'birthday' && 'Bonus urodzinowy'}
                                {transaction.reason === 'referral' && 'Polecenie'}
                                {transaction.reason === 'redemption' && 'Wymiana punktów'}
                                {transaction.reason === 'manual_adjustment' && 'Korekta ręczna'}
                              </p>
                              {transaction.description && (
                                <p className="text-xs text-muted-foreground">
                                  {transaction.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleString('pl-PL')}
                              </p>
                            </div>
                            <div
                              className={`text-lg font-bold ${
                                transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.amount >= 0 ? '+' : ''}
                              {transaction.amount} pkt
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-6">
                        Brak transakcji punktowych
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Right Column - Loyalty Card */}
        <div className="space-y-6">
          <LoyaltyCard customer={customer} />

          <Card>
            <CardHeader>
              <CardTitle>Statystyki</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zamówienia:</span>
                <span className="font-medium">
                  {customer.order_history.total_orders}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Łącznie wydane:</span>
                <span className="font-medium">
                  {formatCurrency(customer.order_history.total_spent)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Średnia wartość:</span>
                <span className="font-medium">
                  {formatCurrency(customer.order_history.average_order_value)}
                </span>
              </div>
              {customer.order_history.first_order_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pierwszy zakup:</span>
                  <span className="font-medium">
                    {new Date(
                      customer.order_history.first_order_date
                    ).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              )}
              {customer.order_history.last_order_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ostatni zakup:</span>
                  <span className="font-medium">
                    {new Date(
                      customer.order_history.last_order_date
                    ).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
