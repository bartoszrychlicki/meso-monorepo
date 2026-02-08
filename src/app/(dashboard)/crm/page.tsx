/**
 * CRM Page
 *
 * Customer list with filters and statistics.
 */

'use client';

import { useEffect } from 'react';
import { useCRMStore } from '@/modules/crm/store';
import { PageHeader } from '@/components/layout/page-header';
import { CustomerCard } from '@/modules/crm/components/customer-card';
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

/**
 * CRM Page
 * Displays customer list with filtering and statistics
 */
export default function CRMPage() {
  const {
    loadCustomers,
    getFilteredCustomers,
    getCustomerStats,
    searchQuery,
    setSearchQuery,
    tierFilter,
    setTierFilter,
    isLoading,
  } = useCRMStore();

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = getFilteredCustomers();
  const stats = getCustomerStats();

  return (
    <div className="space-y-6" data-page="crm">
      <PageHeader
        title="Klienci CRM"
        description="Zarządzanie bazą klientów i programem lojalnościowym"
        actions={
          <Link href="/crm/new">
            <Button data-action="create-customer">
              <Plus className="mr-2 h-4 w-4" />
              Nowy klient
            </Button>
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
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
        </CardContent>
      </Card>

      {/* Customer Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ładowanie klientów...</p>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
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
    </div>
  );
}
