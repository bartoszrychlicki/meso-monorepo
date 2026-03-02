'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { useUserStore } from '@/modules/users/store';
import { UserRole, LocationType } from '@/types/enums';
import { Location } from '@/types/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Building2, Truck, Store, Plus, Pencil } from 'lucide-react';

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  [LocationType.CENTRAL_KITCHEN]: 'Kuchnia Centralna',
  [LocationType.FOOD_TRUCK]: 'Food Truck',
  [LocationType.KIOSK]: 'Kiosk',
  [LocationType.RESTAURANT]: 'Restauracja',
};

function getLocationIcon(type: LocationType) {
  switch (type) {
    case LocationType.CENTRAL_KITCHEN:
      return <Building2 className="h-4 w-4 text-muted-foreground" />;
    case LocationType.FOOD_TRUCK:
      return <Truck className="h-4 w-4 text-muted-foreground" />;
    case LocationType.KIOSK:
    case LocationType.RESTAURANT:
      return <Store className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Store className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatAddress(location: Location): string {
  const { address } = location;
  if (!address) return '-';
  const parts = [address.street, address.postal_code, address.city].filter(Boolean);
  return parts.join(', ') || '-';
}

export function LocationList() {
  const router = useRouter();
  const { allLocations, isLoading, loadAllLocations } = useLocationSettingsStore();
  const { currentUser } = useUserStore();

  useEffect(() => {
    loadAllLocations();
  }, [loadAllLocations]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const filteredLocations = !currentUser || isAdmin
    ? allLocations
    : allLocations.filter((loc) => loc.id === currentUser.location_id);

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <div className="space-y-4" data-component="location-list">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={() => router.push('/settings/locations/new')}
            data-action="add-location"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj lokalizację
          </Button>
        </div>
      )}

      {filteredLocations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Store className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="font-medium mb-1">Brak lokalizacji</p>
          <p>Nie znaleziono żadnych lokalizacji do wyświetlenia</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLocations.map((location) => (
              <TableRow key={location.id} data-id={location.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getLocationIcon(location.type)}
                    <span className="font-medium">{location.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" data-value={location.type}>
                    {LOCATION_TYPE_LABELS[location.type] || location.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatAddress(location)}
                </TableCell>
                <TableCell>
                  {location.is_active ? (
                    <Badge
                      variant="default"
                      className="bg-green-600 hover:bg-green-600"
                      data-status="active"
                    >
                      Aktywna
                    </Badge>
                  ) : (
                    <Badge variant="destructive" data-status="inactive">
                      Nieaktywna
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/settings/locations/${location.id}`)}
                    data-action="edit-location"
                    data-id={location.id}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edytuj
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
