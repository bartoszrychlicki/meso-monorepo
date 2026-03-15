'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { OrderEditForm } from '@/modules/orders/components/order-edit-form';
import { useOrder } from '@/modules/orders/hooks';
import { useOrdersStore } from '@/modules/orders/store';

export default function OrderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { order, isLoading } = useOrder(id);
  const { updateOrder } = useOrdersStore();
  const [isSaving, setIsSaving] = useState(false);

  useBreadcrumbLabel(id, order ? `${order.order_number} - edycja` : undefined);

  const handleSave = async (input: Parameters<typeof updateOrder>[1]) => {
    setIsSaving(true);
    try {
      await updateOrder(id, input);
      toast.success('Zmiany w zamówieniu zostały zapisane');
      router.push(`/orders/${id}`);
    } catch (error) {
      toast.error('Nie udało się zapisać zmian', {
        description: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="space-y-6" data-page="order-edit">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="order-edit" data-id={id}>
      <PageHeader
        title={`Edytuj ${order.order_number}`}
        description="Zmień skład zamówienia, telefon klienta i notatkę."
        actions={
          <Link href={`/orders/${id}`}>
            <Button variant="outline" data-action="back-to-order-detail">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do zamówienia
            </Button>
          </Link>
        }
      />

      <OrderEditForm
        key={order.id}
        order={order}
        isSaving={isSaving}
        onSave={handleSave}
      />
    </div>
  );
}
