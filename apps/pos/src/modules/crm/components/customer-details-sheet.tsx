'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Customer, CustomerAddress } from '@/types/crm';
import { CustomerSource } from '@/types/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/utils';
import {
  formatPoints,
  getTierColorClass,
  getTierDisplayName,
} from '@/modules/crm/utils/loyalty-calculator';
import {
  getCustomerFavoriteProduct,
  getCustomerFullName,
  getCustomerOrderHistory,
} from '@/modules/crm/utils/customer-list';

interface CustomerDetailsSheetProps {
  customer: Customer | null;
  open: boolean;
  isSavingNote: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveNote: (customerId: string, note: string | null) => Promise<void>;
}

const sourceLabels: Record<CustomerSource, string> = {
  [CustomerSource.MOBILE_APP]: 'Aplikacja mobilna',
  [CustomerSource.POS_TERMINAL]: 'Terminal POS',
  [CustomerSource.WEBSITE]: 'Strona WWW',
  [CustomerSource.MANUAL_IMPORT]: 'Import ręczny',
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function AddressCard({ address }: { address: CustomerAddress }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline">{address.label}</Badge>
        {address.is_default ? <Badge variant="secondary">Domyślny</Badge> : null}
      </div>
      <p className="text-sm">
        {address.street} {address.building_number}
        {address.apartment_number ? `/${address.apartment_number}` : ''}
      </p>
      <p className="text-sm text-muted-foreground">
        {address.postal_code} {address.city}
      </p>
      {address.delivery_instructions ? (
        <p className="mt-2 text-xs text-muted-foreground">{address.delivery_instructions}</p>
      ) : null}
    </div>
  );
}

export function CustomerDetailsSheet({
  customer,
  open,
  isSavingNote,
  onOpenChange,
  onSaveNote,
}: CustomerDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {customer ? (
          <CustomerDetailsSheetContent
            key={`${customer.id}:${customer.updated_at}`}
            customer={customer}
            isSavingNote={isSavingNote}
            onSaveNote={onSaveNote}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CustomerDetailsSheetContent({
  customer,
  isSavingNote,
  onSaveNote,
}: {
  customer: Customer;
  isSavingNote: boolean;
  onSaveNote: (customerId: string, note: string | null) => Promise<void>;
}) {
  const [noteValue, setNoteValue] = useState(customer.notes ?? '');
  const favoriteProduct = getCustomerFavoriteProduct(customer);
  const orderHistory = getCustomerOrderHistory(customer);
  const noteChanged = (customer.notes ?? '') !== noteValue;

  const handleSave = async () => {
    if (!noteChanged) return;
    const normalizedNote = noteValue.trim() ? noteValue.trim() : null;
    await onSaveNote(customer.id, normalizedNote);
  };

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>{getCustomerFullName(customer)}</SheetTitle>
            <Badge
              className={getTierColorClass(customer.loyalty_tier)}
              data-status={customer.loyalty_tier}
            >
              {getTierDisplayName(customer.loyalty_tier)}
            </Badge>
            {customer.marketing_consent ? (
              <Badge variant="secondary">Zgoda marketingowa</Badge>
            ) : null}
          </div>
          <SheetDescription>
            Szczegóły klienta, historia zakupów i notatka wewnętrzna.
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="space-y-6 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Od kiedy
            </p>
            <p className="mt-1 text-sm">
              {new Date(customer.registration_date).toLocaleDateString('pl-PL')}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Wydana kwota
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatCurrency(orderHistory.total_spent)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Zamówienia
            </p>
            <p className="mt-1 text-sm">{orderHistory.total_orders}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Punkty
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatPoints(customer.loyalty_points)}
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Kontakt i status</h3>
            <p className="text-sm text-muted-foreground">
              Dane podstawowe klienta widoczne od razu bez przechodzenia na osobny ekran.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem label="Telefon" value={customer.phone} />
            <DetailItem
              label="Email"
              value={customer.email || 'Brak adresu email'}
            />
            <DetailItem
              label="Status"
              value={getTierDisplayName(customer.loyalty_tier)}
            />
            <DetailItem
              label="Źródło"
              value={sourceLabels[customer.source] ?? customer.source}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Zakupy</h3>
            <p className="text-sm text-muted-foreground">
              Najważniejsze dane o aktywności klienta w jednym miejscu.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem
              label="Ulubiona potrawa"
              value={
                favoriteProduct
                  ? `${favoriteProduct.product_name} (${favoriteProduct.order_count}x)`
                  : 'Brak danych'
              }
            />
            <DetailItem
              label="Średnia wartość koszyka"
              value={formatCurrency(orderHistory.average_order_value)}
            />
            <DetailItem
              label="Pierwsze zamówienie"
              value={
                orderHistory.first_order_date
                  ? new Date(orderHistory.first_order_date).toLocaleDateString(
                      'pl-PL'
                    )
                  : 'Brak danych'
              }
            />
            <DetailItem
              label="Ostatnie zamówienie"
              value={
                orderHistory.last_order_date
                  ? new Date(orderHistory.last_order_date).toLocaleDateString(
                      'pl-PL'
                    )
                  : 'Brak danych'
              }
            />
          </div>
        </section>

        {customer.addresses.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Adresy</h3>
              <p className="text-sm text-muted-foreground">
                Dodatkowe informacje, które nie muszą być stale widoczne w tabeli.
              </p>
            </div>
            <div className="space-y-3">
              {customer.addresses.map((address) => (
                <AddressCard key={address.id} address={address} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Notatka wewnętrzna</h3>
            <p className="text-sm text-muted-foreground">
              Możesz szybko dopisać ustalenia albo ważny kontekst o kliencie.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-note">Treść notatki</Label>
            <Textarea
              id="customer-note"
              value={noteValue}
              onChange={(event) => setNoteValue(event.target.value)}
              placeholder="Np. preferuje odbiór osobisty po 18:00 albo ma stałe zamówienie na lunch."
              rows={6}
              data-field="customer-note"
            />
          </div>
        </section>
      </div>

      <SheetFooter className="border-t">
        <Button
          type="button"
          variant="outline"
          asChild
        >
          <Link href={`/crm/${customer.id}`}>Pełny profil klienta</Link>
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!noteChanged || isSavingNote}
          data-action="save-customer-note"
        >
          {isSavingNote ? 'Zapisywanie...' : 'Zapisz notatkę'}
        </Button>
      </SheetFooter>
    </>
  );
}
