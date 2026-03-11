'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInventoryStore } from '@/modules/inventory/store';
import { EmptyState } from '@/components/shared/empty-state';
import { Link2, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface UsageTabProps {
  itemId: string;
}

export function UsageTab({ itemId: _itemId }: UsageTabProps) {
  const { currentUsage } = useInventoryStore();

  const inComponents = currentUsage?.in_components ?? [];
  const inRecipes = currentUsage?.in_recipes ?? [];

  return (
    <div className="space-y-6" data-component="usage-tab">
      <Card>
        <CardHeader>
          <CardTitle>Receptury</CardTitle>
        </CardHeader>
        <CardContent>
          {inRecipes.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title="Brak powiazan z recepturami"
              description="Ta pozycja nie jest uzywana jako skladnik w zadnej recepturze."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa receptury</TableHead>
                  <TableHead className="text-right">Ilosc</TableHead>
                  <TableHead>Jednostka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inRecipes.map((usage) => (
                  <TableRow key={usage.recipe_id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/recipes/${usage.recipe_id}`}
                        className="hover:underline hover:text-primary"
                      >
                        {usage.recipe_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {usage.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {usage.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skladnik w innych pozycjach magazynowych</CardTitle>
        </CardHeader>
        <CardContent>
          {inComponents.length === 0 ? (
            <EmptyState
              icon={<Link2 className="h-6 w-6" />}
              title="Brak powiazan"
              description="Ta pozycja nie jest uzywana jako skladnik w zadnej innej pozycji."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa pozycji nadrzednej</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Ilosc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inComponents.map((usage) => (
                  <TableRow key={usage.parent_id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/inventory/${usage.parent_id}`}
                        className="hover:underline hover:text-primary"
                      >
                        {usage.parent_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {usage.parent_sku}
                    </TableCell>
                    <TableCell className="text-right">
                      {usage.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
