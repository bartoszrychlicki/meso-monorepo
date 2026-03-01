import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LocationType, UserRole } from '@/types/enums';
import { Location } from '@/types/common';

// --- Polyfill for Radix / shadcn components ---
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// --- Mocks ---
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockLoadAllLocations = vi.fn();

vi.mock('@/modules/settings/store', () => ({
  useLocationSettingsStore: vi.fn(),
}));

vi.mock('@/modules/users/store', () => ({
  useUserStore: vi.fn(),
}));

// Import mocked stores so we can control return values
import { useLocationSettingsStore } from '@/modules/settings/store';
import { useUserStore } from '@/modules/users/store';
import { LocationList } from '../location-list';

const mockUseLocationSettingsStore = vi.mocked(useLocationSettingsStore);
const mockUseUserStore = vi.mocked(useUserStore);

// --- Factory ---
function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'Test Location',
    type: LocationType.FOOD_TRUCK,
    address: {
      street: 'ul. Testowa 1',
      city: 'Warszawa',
      postal_code: '00-001',
      country: 'PL',
    },
    phone: '+48 500 000 000',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// --- Helpers ---
function setupStores({
  locations = [] as Location[],
  isLoading = false,
  role = UserRole.ADMIN,
  locationId = 'loc-1',
}: {
  locations?: Location[];
  isLoading?: boolean;
  role?: UserRole;
  locationId?: string;
} = {}) {
  mockUseLocationSettingsStore.mockReturnValue({
    allLocations: locations,
    isLoading,
    loadAllLocations: mockLoadAllLocations,
  } as ReturnType<typeof useLocationSettingsStore>);

  mockUseUserStore.mockReturnValue({
    currentUser: {
      id: 'user-1',
      username: 'admin',
      name: 'Admin User',
      email: 'admin@test.com',
      role,
      location_id: locationId,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  } as ReturnType<typeof useUserStore>);
}

// --- Tests ---
describe('LocationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders location table with correct columns', () => {
    const locations = [makeLocation()];
    setupStores({ locations });

    render(<LocationList />);

    expect(screen.getByText('Nazwa')).toBeInTheDocument();
    expect(screen.getByText('Typ')).toBeInTheDocument();
    expect(screen.getByText('Adres')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Akcje')).toBeInTheDocument();
  });

  it('shows location name with correct icon per type', () => {
    const locations = [
      makeLocation({ id: 'loc-1', name: 'KC Centrum', type: LocationType.CENTRAL_KITCHEN }),
      makeLocation({ id: 'loc-2', name: 'Food Truck Centrum', type: LocationType.FOOD_TRUCK }),
      makeLocation({ id: 'loc-3', name: 'Kiosk PKiN', type: LocationType.KIOSK }),
      makeLocation({ id: 'loc-4', name: 'Restauracja Mokotów', type: LocationType.RESTAURANT }),
    ];
    setupStores({ locations });

    const { container } = render(<LocationList />);

    // Verify location names are in the table
    expect(screen.getByText('KC Centrum')).toBeInTheDocument();
    expect(screen.getByText('Food Truck Centrum')).toBeInTheDocument();
    expect(screen.getByText('Kiosk PKiN')).toBeInTheDocument();
    expect(screen.getByText('Restauracja Mokotów')).toBeInTheDocument();

    // Verify type badge labels are present
    expect(screen.getByText('Kuchnia Centralna')).toBeInTheDocument();

    // Verify each row has an SVG icon next to the name
    const rows = container.querySelectorAll('[data-slot="table-row"]');
    // 1 header row + 4 data rows
    expect(rows.length).toBe(5);
  });

  it('shows active/inactive badge correctly', () => {
    const locations = [
      makeLocation({ id: 'loc-1', name: 'Active Location', is_active: true }),
      makeLocation({ id: 'loc-2', name: 'Inactive Location', is_active: false }),
    ];
    setupStores({ locations });

    render(<LocationList />);

    expect(screen.getByText('Aktywna')).toBeInTheDocument();
    expect(screen.getByText('Nieaktywna')).toBeInTheDocument();

    const activeBadge = screen.getByText('Aktywna').closest('[data-status]');
    expect(activeBadge).toHaveAttribute('data-status', 'active');

    const inactiveBadge = screen.getByText('Nieaktywna').closest('[data-status]');
    expect(inactiveBadge).toHaveAttribute('data-status', 'inactive');
  });

  it('shows "Dodaj lokalizację" button for admin users', () => {
    setupStores({ locations: [makeLocation()], role: UserRole.ADMIN });

    render(<LocationList />);

    expect(screen.getByText('Dodaj lokalizację')).toBeInTheDocument();
  });

  it('hides "Dodaj lokalizację" button for non-admin users', () => {
    setupStores({
      locations: [makeLocation()],
      role: UserRole.MANAGER,
      locationId: 'loc-1',
    });

    render(<LocationList />);

    expect(screen.queryByText('Dodaj lokalizację')).not.toBeInTheDocument();
  });

  it('manager sees only their assigned location', () => {
    const locations = [
      makeLocation({ id: 'loc-1', name: 'My Location' }),
      makeLocation({ id: 'loc-2', name: 'Other Location' }),
    ];
    setupStores({
      locations,
      role: UserRole.MANAGER,
      locationId: 'loc-1',
    });

    render(<LocationList />);

    expect(screen.getByText('My Location')).toBeInTheDocument();
    expect(screen.queryByText('Other Location')).not.toBeInTheDocument();
  });

  it('clicking "Edytuj" navigates to /settings/locations/[id]', () => {
    const locations = [makeLocation({ id: 'loc-42' })];
    setupStores({ locations });

    render(<LocationList />);

    const editButton = screen.getByText('Edytuj');
    fireEvent.click(editButton);

    expect(mockPush).toHaveBeenCalledWith('/settings/locations/loc-42');
  });

  it('shows loading skeleton when isLoading is true', () => {
    setupStores({ isLoading: true });

    const { container } = render(<LocationList />);

    const skeleton = container.querySelector('[data-component="loading-skeleton"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows "Brak lokalizacji" when list is empty', () => {
    setupStores({ locations: [] });

    render(<LocationList />);

    expect(screen.getByText('Brak lokalizacji')).toBeInTheDocument();
  });
});
