/**
 * Customer Card Component
 *
 * Displays customer summary with loyalty information.
 */

'use client';

import { Customer } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, Mail, Award, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  getTierDisplayName,
  getTierColorClass,
  formatPoints,
} from '@/modules/crm/utils/loyalty-calculator';
import Link from 'next/link';

interface CustomerCardProps {
  customer: Customer;
}

/**
 * Customer Card
 * Displays customer summary with loyalty tier and statistics
 */
export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Link href={`/crm/${customer.id}`}>
      <Card
        data-component="customer-card"
        data-id={customer.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
      >
        <CardHeader>
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
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Contact Information */}
          <div className="space-y-2">
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
                {customer.order_history.total_orders}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Wydane:</span>
              </div>
              <span className="font-medium" data-field="total-spent">
                {formatCurrency(customer.order_history.total_spent)}
              </span>
            </div>
          </div>

          {/* Last Order */}
          {customer.order_history.last_order_date && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Ostatnie zamówienie:{' '}
                {new Date(customer.order_history.last_order_date).toLocaleDateString(
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
