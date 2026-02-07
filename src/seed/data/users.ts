import { User } from '@/types/user';
import { UserRole } from '@/types/enums';
import { LOCATION_IDS } from './locations';

// Fixed UUIDs for cross-referencing
export const USER_IDS = {
  ADMIN: '22222222-2222-2222-2222-222222222001',
  MANAGER: '22222222-2222-2222-2222-222222222002',
  CHEF: '22222222-2222-2222-2222-222222222003',
  CASHIER: '22222222-2222-2222-2222-222222222004',
  DELIVERY: '22222222-2222-2222-2222-222222222005',
} as const;

export const users: User[] = [
  {
    id: USER_IDS.ADMIN,
    username: 'admin',
    name: 'Jan Kowalski',
    email: 'jan.kowalski@mesopos.pl',
    role: UserRole.ADMIN,
    pin: '1234',
    location_id: LOCATION_IDS.CENTRAL_KITCHEN,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: USER_IDS.MANAGER,
    username: 'manager',
    name: 'Anna Nowak',
    email: 'anna.nowak@mesopos.pl',
    role: UserRole.MANAGER,
    pin: '2345',
    location_id: LOCATION_IDS.CENTRAL_KITCHEN,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: USER_IDS.CHEF,
    username: 'chef',
    name: 'Piotr Wiśniewski',
    email: 'piotr.wisniewski@mesopos.pl',
    role: UserRole.CHEF,
    pin: '3456',
    location_id: LOCATION_IDS.CENTRAL_KITCHEN,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: USER_IDS.CASHIER,
    username: 'cashier',
    name: 'Maria Zielińska',
    email: 'maria.zielinska@mesopos.pl',
    role: UserRole.CASHIER,
    pin: '4567',
    location_id: LOCATION_IDS.FOOD_TRUCK_MOKOTOW,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: USER_IDS.DELIVERY,
    username: 'delivery',
    name: 'Tomasz Lewandowski',
    email: 'tomasz.lewandowski@mesopos.pl',
    role: UserRole.DELIVERY,
    pin: '5678',
    location_id: LOCATION_IDS.PUNKT_CENTRUM,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];
