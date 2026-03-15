'use client';

import type { Customer } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  type CustomerSort,
  type CustomerSortKey,
  getCustomerFullName,
  getCustomerOrderHistory,
} from '@/modules/crm/utils/customer-list';
import {
  formatPoints,
  getTierColorClass,
  getTierDisplayName,
} from '@/modules/crm/utils/loyalty-calculator';

interface CustomerTableProps {
  customers: Customer[];
  sort: CustomerSort;
  onSortChange: (key: CustomerSortKey) => void;
  onSelectCustomer: (customerId: string) => void;
}

interface SortableHeaderProps {
  label: string;
  sortKey: CustomerSortKey;
  sort: CustomerSort;
  onSortChange: (key: CustomerSortKey) => void;
  align?: 'left' | 'right';
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSortChange,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = sort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : sort.order === 'asc' ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      className={`flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground transition-colors hover:text-foreground ${
        align === 'right' ? 'ml-auto justify-end' : ''
      }`}
      onClick={() => onSortChange(sortKey)}
      data-action="sort-customers"
      data-field={sortKey}
      aria-label={`Sortuj po: ${label}`}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function CustomerTable({
  customers,
  sort,
  onSortChange,
  onSelectCustomer,
}: CustomerTableProps) {
  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[220px]">
              <SortableHeader
                label="Imię i nazwisko"
                sortKey="name"
                sort={sort}
                onSortChange={onSortChange}
              />
            </TableHead>
            <TableHead className="min-w-[140px]">
              <SortableHeader
                label="Telefon"
                sortKey="phone"
                sort={sort}
                onSortChange={onSortChange}
              />
            </TableHead>
            <TableHead className="min-w-[120px]">
              <SortableHeader
                label="Status"
                sortKey="status"
                sort={sort}
                onSortChange={onSortChange}
              />
            </TableHead>
            <TableHead className="min-w-[130px]">
              <SortableHeader
                label="Od kiedy"
                sortKey="registration_date"
                sort={sort}
                onSortChange={onSortChange}
              />
            </TableHead>
            <TableHead className="min-w-[140px] text-right">
              <SortableHeader
                label="Wydana kwota"
                sortKey="total_spent"
                sort={sort}
                onSortChange={onSortChange}
                align="right"
              />
            </TableHead>
            <TableHead className="min-w-[100px] text-right">
              <SortableHeader
                label="Zamówień"
                sortKey="total_orders"
                sort={sort}
                onSortChange={onSortChange}
                align="right"
              />
            </TableHead>
            <TableHead className="min-w-[120px] text-right">
              <SortableHeader
                label="Ilość punktów"
                sortKey="loyalty_points"
                sort={sort}
                onSortChange={onSortChange}
                align="right"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const orderHistory = getCustomerOrderHistory(customer);

            return (
              <TableRow
                key={customer.id}
                data-id={customer.id}
                className="cursor-pointer"
                onClick={() => onSelectCustomer(customer.id)}
                title="Kliknij, aby zobaczyć szczegóły klienta"
              >
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div>{getCustomerFullName(customer)}</div>
                    {customer.email ? (
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{customer.phone}</TableCell>
                <TableCell>
                  <Badge
                    className={getTierColorClass(customer.loyalty_tier)}
                    data-status={customer.loyalty_tier}
                  >
                    {getTierDisplayName(customer.loyalty_tier)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(customer.registration_date).toLocaleDateString('pl-PL')}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(orderHistory.total_spent)}
                </TableCell>
                <TableCell className="text-right">
                  {orderHistory.total_orders}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPoints(customer.loyalty_points)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
