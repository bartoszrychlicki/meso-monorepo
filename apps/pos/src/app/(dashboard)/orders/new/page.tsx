'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { OrderForm } from '@/modules/orders/components/order-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewOrderPage() {
  const router = useRouter();

  const handleOrderCreated = (orderId: string) => {
    toast.success('Zamowienie zostalo zlozone!', {
      description: 'Mozesz sledzic jego status na stronie szczegulow.',
    });
    router.push(`/orders/${orderId}`);
  };

  return (
    <div className="space-y-6" data-page="new-order">
      <PageHeader
        title="Nowe zamowienie"
        description="Stworz nowe zamowienie POS"
        actions={
          <Link href="/orders">
            <Button variant="outline" data-action="back-to-orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wroc do zamowien
            </Button>
          </Link>
        }
      />

      <OrderForm onOrderCreated={handleOrderCreated} />
    </div>
  );
}
