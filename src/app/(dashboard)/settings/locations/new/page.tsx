'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationBasicForm } from '@/modules/settings/components/location-basic-form';
import { useLocationSettingsStore } from '@/modules/settings/store';
import type { CreateLocationInput } from '@/schemas/location';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationNewPage() {
  const router = useRouter();
  const { createLocation } = useLocationSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateLocationInput) => {
    setIsSubmitting(true);
    try {
      const { address, phone, ...rest } = data;
      const locationData = {
        ...rest,
        phone: phone ?? undefined,
        address: {
          ...address,
          lat: address.lat ?? undefined,
          lng: address.lng ?? undefined,
        },
      };
      const created = await createLocation(locationData);
      toast.success('Lokalizacja utworzona');
      router.push(`/settings/locations/${created.id}`);
    } catch {
      toast.error('Nie udało się utworzyć lokalizacji');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-page="location-new">
      <PageHeader
        title="Nowa lokalizacja"
        description="Dodaj nowy punkt sprzedaży lub magazyn"
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/settings?tab=locations')}
            data-action="back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do lokalizacji
          </Button>
        }
      />

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic" data-action="tab-basic">
            Dane podstawowe
          </TabsTrigger>
          <TabsTrigger value="delivery" disabled data-action="tab-delivery">
            Dostawa
          </TabsTrigger>
          <TabsTrigger value="receipt" disabled data-action="tab-receipt">
            Paragony
          </TabsTrigger>
          <TabsTrigger value="kds" disabled data-action="tab-kds">
            KDS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <div className="max-w-2xl">
            <LocationBasicForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfiguracja dostawy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <p>Konfiguracja dostępna wkrótce</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfiguracja paragonów</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <p>Konfiguracja dostępna wkrótce</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kds" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfiguracja KDS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <p>Konfiguracja dostępna wkrótce</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
