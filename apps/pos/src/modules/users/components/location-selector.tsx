'use client';

import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserStore } from '../store';
import { MapPin, Building2, Truck, Store } from 'lucide-react';
import { LocationType } from '@/types/enums';

const LOCATION_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [LocationType.CENTRAL_KITCHEN]: Building2,
  [LocationType.FOOD_TRUCK]: Truck,
  [LocationType.KIOSK]: Store,
  [LocationType.RESTAURANT]: Store,
};

interface LocationSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function LocationSelector({ value, onValueChange, className }: LocationSelectorProps) {
  const { locations, currentLocation, loadLocations, setCurrentLocation } = useUserStore();

  useEffect(() => {
    if (locations.length === 0) {
      loadLocations();
    }
  }, [locations.length, loadLocations]);

  const selectedValue = value ?? currentLocation?.id ?? '';

  const handleChange = (val: string) => {
    if (onValueChange) {
      onValueChange(val);
    } else {
      setCurrentLocation(val);
    }
  };

  return (
    <Select value={selectedValue} onValueChange={handleChange}>
      <SelectTrigger className={className} data-field="location-selector">
        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Wybierz lokalizację" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => {
          const Icon = LOCATION_TYPE_ICONS[location.type] ?? MapPin;
          return (
            <SelectItem
              key={location.id}
              value={location.id}
              data-id={location.id}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {location.name}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
