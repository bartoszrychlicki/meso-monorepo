import { Location } from '@/types/common';
import { LocationType } from '@/types/enums';

// Fixed UUIDs for cross-referencing in other seed modules
export const LOCATION_IDS = {
  CENTRAL_KITCHEN: '11111111-1111-1111-1111-111111111001',
  FOOD_TRUCK_MOKOTOW: '11111111-1111-1111-1111-111111111002',
  PUNKT_CENTRUM: '11111111-1111-1111-1111-111111111003',
} as const;

export const locations: Location[] = [
  {
    id: LOCATION_IDS.CENTRAL_KITCHEN,
    name: 'Kuchnia Centralna',
    type: LocationType.CENTRAL_KITCHEN,
    address: {
      street: 'ul. Produkcyjna 12',
      city: 'Warszawa',
      postal_code: '02-100',
      country: 'Polska',
      lat: 52.2128,
      lng: 20.9842,
    },
    phone: '+48 22 123 45 67',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: LOCATION_IDS.FOOD_TRUCK_MOKOTOW,
    name: 'Food Truck Mokotów',
    type: LocationType.FOOD_TRUCK,
    address: {
      street: 'ul. Puławska 100',
      city: 'Warszawa',
      postal_code: '02-620',
      country: 'Polska',
      lat: 52.1935,
      lng: 21.0186,
    },
    phone: '+48 22 234 56 78',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: LOCATION_IDS.PUNKT_CENTRUM,
    name: 'Punkt Centrum',
    type: LocationType.KIOSK,
    address: {
      street: 'ul. Marszałkowska 50',
      city: 'Warszawa',
      postal_code: '00-950',
      country: 'Polska',
      lat: 52.2297,
      lng: 21.0122,
    },
    phone: '+48 22 345 67 89',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];
