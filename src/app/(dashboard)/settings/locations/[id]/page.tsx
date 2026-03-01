'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationBasicForm } from '@/modules/settings/components/location-basic-form';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import type { CreateLocationInput } from '@/schemas/location';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    editingLocation,
    isLoadingConfigs,
    loadLocationWithConfigs,
    loadGlobalDefaults,
    updateLocation,
  } = useLocationSettingsStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  useBreadcrumbLabel(id, editingLocation?.name);

  useEffect(() => {
    loadLocationWithConfigs(id);
    loadGlobalDefaults();
  }, [id, loadLocationWithConfigs, loadGlobalDefaults]);

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
      await updateLocation(id, locationData);
      toast.success('Lokalizacja zaktualizowana');
    } catch {
      toast.error('Nie udało się zaktualizować lokalizacji');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingConfigs) {
    return (
      <div className="space-y-6" data-page="location-edit">
        <LoadingSkeleton variant="form" />
      </div>
    );
  }

  if (!editingLocation) {
    return (
      <div className="space-y-6" data-page="location-edit">
        <PageHeader title="Lokalizacja nie znaleziona" />
        <Button
          variant="outline"
          onClick={() => router.push('/settings?tab=locations')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do lokalizacji
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="location-edit" data-id={id}>
      <PageHeader
        title={editingLocation.name}
        description="Edycja lokalizacji"
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
          <TabsTrigger value="delivery" data-action="tab-delivery">
            Dostawa
          </TabsTrigger>
          <TabsTrigger value="receipt" data-action="tab-receipt">
            Paragony
          </TabsTrigger>
          <TabsTrigger value="kds" data-action="tab-kds">
            KDS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <div className="max-w-2xl">
            <LocationBasicForm
              location={editingLocation}
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
