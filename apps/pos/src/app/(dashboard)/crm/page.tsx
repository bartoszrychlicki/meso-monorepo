/**
 * CRM Page
 *
 * Customer list with filters and statistics.
 */

'use client';

import { useEffect, useState } from 'react';
import { useCRMStore } from '@/modules/crm/store';
import { PageHeader } from '@/components/layout/page-header';
import { CustomerTable } from '@/modules/crm/components/customer-table';
import { CustomerDetailsSheet } from '@/modules/crm/components/customer-details-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Users, Award } from 'lucide-react';
import { LoyaltyTier } from '@/types/enums';
import Link from 'next/link';
import { getTierDisplayName } from '@/modules/crm/utils/loyalty-calculator';
import { seedAll } from '@/seed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RewardsManager } from '@/modules/crm/components/rewards-manager';
import { PromoCodesManager } from '@/modules/crm/components/promo-codes-manager';
import {
  DEFAULT_CUSTOMER_SORT,
  getDefaultCustomerSortOrder,
  sortCustomers,
  type CustomerSort,
  type CustomerSortKey,
} from '@/modules/crm/utils/customer-list';
import { crmRepository } from '@/modules/crm/repository';
import { toast } from 'sonner';

/**
 * CRM Page
 * Displays customer list with filtering and statistics
 */
export default function CRMPage() {
  const {
    loadCustomers,
    getFilteredCustomers,
    getSelectedCustomer,
    getCustomerStats,
    selectedCustomerId,
    setSelectedCustomerId,
    searchQuery,
    setSearchQuery,
    tierFilter,
    setTierFilter,
    isLoading,
  } = useCRMStore();
  const [sort, setSort] = useState<CustomerSort>(DEFAULT_CUSTOMER_SORT);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const selectedCustomer = getSelectedCustomer();

  useEffect(() => {
    seedAll();
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (selectedCustomerId && !selectedCustomer) {
      setSelectedCustomerId(null);
    }
  }, [selectedCustomer, selectedCustomerId, setSelectedCustomerId]);

  const filteredCustomers = sortCustomers(getFilteredCustomers(), sort);
  const stats = getCustomerStats();

  const handleSortChange = (key: CustomerSortKey) => {
    setSort((currentSort) => {
      if (currentSort.key === key) {
        return {
          key,
          order: currentSort.order === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key,
        order: getDefaultCustomerSortOrder(key),
      };
    });
  };

  const handleSaveNote = async (customerId: string, note: string | null) => {
    setIsSavingNote(true);

    try {
      const updatedCustomer = await crmRepository.customers.update(customerId, {
        notes: note,
        updated_at: new Date().toISOString(),
      });

      useCRMStore.setState((state) => ({
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === updatedCustomer.id ? updatedCustomer : customer
        ),
      }));

      toast.success('Notatka klienta została zapisana');
    } catch (error) {
      console.error('Failed to save customer note:', error);
      toast.error('Nie udało się zapisać notatki');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-6" data-page="crm">
      <PageHeader
        title="Klienci CRM"
        description="Zarządzanie klientami, nagrodami i kodami promocyjnymi"
        actions={
          <Link href="/crm/new">
            <Button data-action="create-customer">
              <Plus className="mr-2 h-4 w-4" />
              Nowy klient
            </Button>
          </Link>
        }
      />
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="customers">Klienci</TabsTrigger>
          <TabsTrigger value="rewards">Nagrody</TabsTrigger>
          <TabsTrigger value="promo-codes">Kody promocyjne</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Łącznie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-metric="total-customers">
                  {stats.total}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-600" />
                  Brąz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-metric="bronze-customers">
                  {stats.bronze}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-gray-600" />
                  Srebro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-metric="silver-customers">
                  {stats.silver}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-600" />
                  Złoto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-metric="gold-customers">
                  {stats.gold}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj po imieniu, nazwisku, telefonie, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-field="search-query"
                  />
                </div>
                <Select
                  value={tierFilter}
                  onValueChange={(value) =>
                    setTierFilter(value as LoyaltyTier | 'all')
                  }
                >
                  <SelectTrigger className="w-full sm:w-[200px]" data-field="tier-filter">
                    <SelectValue placeholder="Filtruj po tierze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie tiery</SelectItem>
                    <SelectItem value={LoyaltyTier.BRONZE}>
                      {getTierDisplayName(LoyaltyTier.BRONZE)}
                    </SelectItem>
                    <SelectItem value={LoyaltyTier.SILVER}>
                      {getTierDisplayName(LoyaltyTier.SILVER)}
                    </SelectItem>
                    <SelectItem value={LoyaltyTier.GOLD}>
                      {getTierDisplayName(LoyaltyTier.GOLD)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Kliknij wiersz klienta, aby otworzyć boczny panel ze szczegółami i notatką.
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ładowanie klientów...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <CustomerTable
              customers={filteredCustomers}
              sort={sort}
              onSortChange={handleSortChange}
              onSelectCustomer={setSelectedCustomerId}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Brak klientów</p>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || tierFilter !== 'all'
                    ? 'Spróbuj zmienić kryteria wyszukiwania'
                    : 'Dodaj pierwszego klienta do systemu'}
                </p>
                {!searchQuery && tierFilter === 'all' && (
                  <Link href="/crm/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj klienta
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rewards">
          <RewardsManager />
        </TabsContent>

        <TabsContent value="promo-codes">
          <PromoCodesManager />
        </TabsContent>
      </Tabs>

      <CustomerDetailsSheet
        customer={selectedCustomer}
        open={selectedCustomer !== null}
        isSavingNote={isSavingNote}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCustomerId(null);
          }
        }}
        onSaveNote={handleSaveNote}
      />
    </div>
  );
}
