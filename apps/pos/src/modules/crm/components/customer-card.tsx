/**
 * Customer Card Component
 *
 * Displays customer summary with loyalty information.
 */

'use client';

import { Customer } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users, Phone, Mail, Award, ShoppingCart, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  getTierDisplayName,
  getTierColorClass,
  formatPoints,
} from '@/modules/crm/utils/loyalty-calculator';
import { getCustomerOrderHistory } from '@/modules/crm/utils/customer-list';
import Link from 'next/link';

interface CustomerCardProps {
  customer: Customer;
}

/**
 * Customer Card
 * Displays customer summary with loyalty tier and statistics
 */
const PRODUCT_COLORS = [
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
];

function getProductInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const orderHistory = getCustomerOrderHistory(customer);
  const topProducts = orderHistory.top_ordered_products?.slice(0, 3) ?? [];

  return (
    <Link href={`/crm/${customer.id}`}>
      <Card
        data-component="customer-card"
        data-id={customer.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              {customer.first_name} {customer.last_name}
            </CardTitle>
            <Badge
              className={getTierColorClass(customer.loyalty_tier)}
              data-status={customer.loyalty_tier}
            >
              <Award className="mr-1 h-3 w-3" />
              {getTierDisplayName(customer.loyalty_tier)}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>od {new Date(customer.registration_date).toLocaleDateString('pl-PL')}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Contact Information */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span data-field="phone">{customer.phone}</span>
            </div>

            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span data-field="email" className="truncate">
                  {customer.email}
                </span>
              </div>
            )}
          </div>

          {/* Top 3 ordered products */}
          {topProducts.length > 0 && (
            <TooltipProvider>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">Top:</span>
                <div className="flex -space-x-1" data-field="top-products">
                  {topProducts.map((product, i) => (
                    <Tooltip key={product.product_id}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-background cursor-default ${PRODUCT_COLORS[i % PRODUCT_COLORS.length]}`}
                          data-product-id={product.product_id}
                        >
                          {getProductInitials(product.product_name)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{product.product_name}</p>
                        <p className="text-muted-foreground">{product.order_count}x zamowione</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </TooltipProvider>
          )}

          {/* Loyalty & Stats */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Award className="h-4 w-4" />
                <span>Punkty:</span>
              </div>
              <span className="font-bold" data-field="loyalty-points">
                {formatPoints(customer.loyalty_points)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span>Zamówienia:</span>
              </div>
              <span data-field="total-orders">
                {orderHistory.total_orders}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Wydane:</span>
              </div>
              <span className="font-medium" data-field="total-spent">
                {formatCurrency(orderHistory.total_spent)}
              </span>
            </div>
          </div>

          {/* Last Order */}
          {orderHistory.last_order_date && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Ostatnie zamówienie:{' '}
                {new Date(orderHistory.last_order_date).toLocaleDateString(
                  'pl-PL'
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
