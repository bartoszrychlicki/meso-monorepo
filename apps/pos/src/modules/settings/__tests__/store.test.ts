import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Location,
  DeliveryConfig,
  ReceiptConfig,
  KdsConfig,
  ReceiptDefaults,
  KdsDefaults,
} from '@/types/common';
import { LocationType } from '@/types/enums';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

import { useLocationSettingsStore } from '../store';

// ---------- Factory helpers ----------

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-001',
    name: 'Test Location',
    type: LocationType.FOOD_TRUCK,
    address: {
      street: 'Test Street 1',
      city: 'Warsaw',
      postal_code: '00-001',
      country: 'PL',
    },
    phone: '+48123456789',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeDeliveryConfig(overrides: Partial<DeliveryConfig> = {}): DeliveryConfig {
  return {
    id: 'dc-001',
    location_id: 'loc-001',
    delivery_radius_km: 5,
    delivery_fee: 10,
    min_order_amount: 30,
    estimated_delivery_minutes: 45,
    is_delivery_active: true,
    is_pickup_active: true,
    opening_time: '10:00',
    closing_time: '22:00',
    pickup_time_min: 15,
    pickup_time_max: 30,
    pickup_buffer_after_open: 30,
    pickup_buffer_before_close: 30,
    pay_on_pickup_enabled: false,
    pay_on_pickup_fee: 0,
    pay_on_pickup_max_order: 0,
    ordering_paused_until_date: null,
    ordering_paused_until_time: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeReceiptConfig(overrides: Partial<ReceiptConfig> = {}): ReceiptConfig {
  return {
    id: 'rc-001',
    location_id: 'loc-001',
    receipt_header: 'MESO Food Truck',
    receipt_footer: 'Thank you!',
    print_automatically: true,
    show_logo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeKdsConfig(overrides: Partial<KdsConfig> = {}): KdsConfig {
  return {
    id: 'kds-001',
    location_id: 'loc-001',
    alert_time_minutes: 10,
    auto_accept_orders: false,
    sound_enabled: true,
    display_priority: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------- Helper to reset the chaining mock ----------

function resetChain() {
  mockSupabase.from.mockReturnThis();
  mockSupabase.select.mockReturnThis();
  mockSupabase.insert.mockReturnThis();
  mockSupabase.update.mockReturnThis();
  mockSupabase.upsert.mockReturnThis();
  mockSupabase.eq.mockReturnThis();
  mockSupabase.in.mockReturnThis();
  mockSupabase.order.mockReturnThis();
  mockSupabase.single.mockReset();
  mockSupabase.maybeSingle.mockReset();
}

describe('useLocationSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    useLocationSettingsStore.setState({
      allLocations: [],
      isLoading: false,
      editingLocation: null,
      deliveryConfig: null,
      receiptConfig: null,
      kdsConfig: null,
      isLoadingConfigs: false,
      receiptDefaults: null,
      kdsDefaults: null,
    });
  });

  // ================================================================
  // loadAllLocations
  // ================================================================
  describe('loadAllLocations', () => {
    it('sets isLoading true during load and false after', async () => {
      let resolveOrder!: (value: unknown) => void;
      mockSupabase.order.mockReturnValue(
        new Promise((resolve) => {
          resolveOrder = resolve;
        }),
      );

      const loadPromise = useLocationSettingsStore.getState().loadAllLocations();
      expect(useLocationSettingsStore.getState().isLoading).toBe(true);

      resolveOrder({ data: [] });
      await loadPromise;

      expect(useLocationSettingsStore.getState().isLoading).toBe(false);
    });

    it('stores fetched locations in allLocations', async () => {
      const locations = [
        makeLocation({ id: 'loc-1', name: 'Location A' }),
        makeLocation({ id: 'loc-2', name: 'Location B' }),
      ];
      mockSupabase.order.mockResolvedValue({ data: locations });

      await useLocationSettingsStore.getState().loadAllLocations();

      expect(useLocationSettingsStore.getState().allLocations).toEqual(locations);
    });

    it('handles empty result (null data)', async () => {
      mockSupabase.order.mockResolvedValue({ data: null });

      await useLocationSettingsStore.getState().loadAllLocations();

      expect(useLocationSettingsStore.getState().allLocations).toEqual([]);
    });
  });

  // ================================================================
  // loadLocationWithConfigs
  // ================================================================
  describe('loadLocationWithConfigs', () => {
    it('loads location + all 3 configs in parallel', async () => {
      const location = makeLocation({ id: 'loc-001' });
      const deliveryConfig = makeDeliveryConfig({ location_id: 'loc-001' });
      const receiptConfig = makeReceiptConfig({ location_id: 'loc-001' });
      const kdsConfig = makeKdsConfig({ location_id: 'loc-001' });

      // The store calls single() once and maybeSingle() three times via Promise.all.
      // Since the mock chains all return `this`, we control the terminal calls:
      mockSupabase.single.mockResolvedValue({ data: location });
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: deliveryConfig })
        .mockResolvedValueOnce({ data: receiptConfig })
        .mockResolvedValueOnce({ data: kdsConfig });

      await useLocationSettingsStore.getState().loadLocationWithConfigs('loc-001');

      const state = useLocationSettingsStore.getState();
      expect(state.editingLocation).toEqual(location);
      expect(state.deliveryConfig).toEqual(deliveryConfig);
      expect(state.receiptConfig).toEqual(receiptConfig);
      expect(state.kdsConfig).toEqual(kdsConfig);
      expect(state.isLoadingConfigs).toBe(false);
    });

    it('handles missing configs (maybeSingle returns null)', async () => {
      const location = makeLocation({ id: 'loc-001' });

      mockSupabase.single.mockResolvedValue({ data: location });
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null });

      await useLocationSettingsStore.getState().loadLocationWithConfigs('loc-001');

      const state = useLocationSettingsStore.getState();
      expect(state.editingLocation).toEqual(location);
      expect(state.deliveryConfig).toBeNull();
      expect(state.receiptConfig).toBeNull();
      expect(state.kdsConfig).toBeNull();
    });
  });

  // ================================================================
  // loadGlobalDefaults
  // ================================================================
  describe('loadGlobalDefaults', () => {
    it('fetches receipt_defaults and kds_defaults from app_config', async () => {
      const receiptDefaults: ReceiptDefaults = {
        header: 'Default Header',
        footer: 'Default Footer',
        print_automatically: true,
        show_logo: false,
      };
      const kdsDefaults: KdsDefaults = {
        alert_time_minutes: 15,
        auto_accept_orders: true,
        sound_enabled: true,
        display_priority: false,
      };

      mockSupabase.in.mockResolvedValue({
        data: [
          { key: 'receipt_defaults', value: receiptDefaults },
          { key: 'kds_defaults', value: kdsDefaults },
        ],
      });

      await useLocationSettingsStore.getState().loadGlobalDefaults();

      const state = useLocationSettingsStore.getState();
      expect(state.receiptDefaults).toEqual(receiptDefaults);
      expect(state.kdsDefaults).toEqual(kdsDefaults);
    });

    it('sets null for missing defaults', async () => {
      mockSupabase.in.mockResolvedValue({ data: [] });

      await useLocationSettingsStore.getState().loadGlobalDefaults();

      const state = useLocationSettingsStore.getState();
      expect(state.receiptDefaults).toBeNull();
      expect(state.kdsDefaults).toBeNull();
    });

    it('handles null data from supabase', async () => {
      mockSupabase.in.mockResolvedValue({ data: null });

      await useLocationSettingsStore.getState().loadGlobalDefaults();

      const state = useLocationSettingsStore.getState();
      expect(state.receiptDefaults).toBeNull();
      expect(state.kdsDefaults).toBeNull();
    });
  });

  // ================================================================
  // createLocation
  // ================================================================
  describe('createLocation', () => {
    it('inserts location and adds to allLocations', async () => {
      const newLocation = makeLocation({ id: 'loc-new', name: 'New Location' });
      mockSupabase.single.mockResolvedValue({ data: newLocation, error: null });

      const result = await useLocationSettingsStore.getState().createLocation({
        name: 'New Location',
        type: LocationType.FOOD_TRUCK,
        address: newLocation.address,
        is_active: true,
      });

      expect(result).toEqual(newLocation);
      expect(useLocationSettingsStore.getState().allLocations).toContainEqual(newLocation);
    });

    it('throws on error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(
        useLocationSettingsStore.getState().createLocation({ name: 'Bad' }),
      ).rejects.toThrow('Insert failed');
    });
  });

  // ================================================================
  // updateLocation
  // ================================================================
  describe('updateLocation', () => {
    it('updates location in DB and allLocations state', async () => {
      const existing = makeLocation({ id: 'loc-001', name: 'Old Name' });
      useLocationSettingsStore.setState({ allLocations: [existing] });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().updateLocation('loc-001', { name: 'New Name' });

      const updated = useLocationSettingsStore.getState().allLocations.find((l) => l.id === 'loc-001');
      expect(updated?.name).toBe('New Name');
    });

    it('updates editingLocation if it matches', async () => {
      const existing = makeLocation({ id: 'loc-001', name: 'Old' });
      useLocationSettingsStore.setState({
        allLocations: [existing],
        editingLocation: existing,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().updateLocation('loc-001', { name: 'Updated' });

      expect(useLocationSettingsStore.getState().editingLocation?.name).toBe('Updated');
    });

    it('does not update editingLocation if it does not match', async () => {
      const loc1 = makeLocation({ id: 'loc-001', name: 'Loc 1' });
      const loc2 = makeLocation({ id: 'loc-002', name: 'Loc 2' });
      useLocationSettingsStore.setState({
        allLocations: [loc1, loc2],
        editingLocation: loc2,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().updateLocation('loc-001', { name: 'Changed' });

      expect(useLocationSettingsStore.getState().editingLocation?.name).toBe('Loc 2');
    });

    it('throws on error', async () => {
      useLocationSettingsStore.setState({ allLocations: [makeLocation()] });
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Update failed' } });

      await expect(
        useLocationSettingsStore.getState().updateLocation('loc-001', { name: 'X' }),
      ).rejects.toThrow('Update failed');
    });
  });

  // ================================================================
  // deactivateLocation / reactivateLocation
  // ================================================================
  describe('deactivateLocation', () => {
    it('calls updateLocation with is_active false', async () => {
      const loc = makeLocation({ id: 'loc-001', is_active: true });
      useLocationSettingsStore.setState({ allLocations: [loc] });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().deactivateLocation('loc-001');

      const updated = useLocationSettingsStore.getState().allLocations.find((l) => l.id === 'loc-001');
      expect(updated?.is_active).toBe(false);
    });
  });

  describe('reactivateLocation', () => {
    it('calls updateLocation with is_active true', async () => {
      const loc = makeLocation({ id: 'loc-001', is_active: false });
      useLocationSettingsStore.setState({ allLocations: [loc] });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().reactivateLocation('loc-001');

      const updated = useLocationSettingsStore.getState().allLocations.find((l) => l.id === 'loc-001');
      expect(updated?.is_active).toBe(true);
    });
  });

  // ================================================================
  // saveDeliveryConfig
  // ================================================================
  describe('saveDeliveryConfig', () => {
    it('updates existing config when deliveryConfig is set', async () => {
      const existing = makeDeliveryConfig({ location_id: 'loc-001', delivery_fee: 10 });
      useLocationSettingsStore.setState({ deliveryConfig: existing });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().saveDeliveryConfig('loc-001', { delivery_fee: 15 });

      expect(useLocationSettingsStore.getState().deliveryConfig?.delivery_fee).toBe(15);
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('inserts new config when deliveryConfig is null', async () => {
      useLocationSettingsStore.setState({ deliveryConfig: null });

      const createdConfig = makeDeliveryConfig({ location_id: 'loc-001' });
      mockSupabase.single.mockResolvedValue({ data: createdConfig, error: null });

      await useLocationSettingsStore.getState().saveDeliveryConfig('loc-001', { delivery_fee: 10 });

      expect(useLocationSettingsStore.getState().deliveryConfig).toEqual(createdConfig);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('throws on update error', async () => {
      useLocationSettingsStore.setState({ deliveryConfig: makeDeliveryConfig() });
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Update error' } });

      await expect(
        useLocationSettingsStore.getState().saveDeliveryConfig('loc-001', { delivery_fee: 5 }),
      ).rejects.toThrow('Update error');
    });

    it('throws on insert error', async () => {
      useLocationSettingsStore.setState({ deliveryConfig: null });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Insert error' } });

      await expect(
        useLocationSettingsStore.getState().saveDeliveryConfig('loc-001', { delivery_fee: 5 }),
      ).rejects.toThrow('Insert error');
    });
  });

  // ================================================================
  // saveReceiptConfig
  // ================================================================
  describe('saveReceiptConfig', () => {
    it('updates existing config when receiptConfig is set', async () => {
      const existing = makeReceiptConfig({ location_id: 'loc-001', receipt_header: 'Old' });
      useLocationSettingsStore.setState({ receiptConfig: existing });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().saveReceiptConfig('loc-001', { receipt_header: 'New' });

      expect(useLocationSettingsStore.getState().receiptConfig?.receipt_header).toBe('New');
    });

    it('inserts new config when receiptConfig is null', async () => {
      useLocationSettingsStore.setState({ receiptConfig: null });

      const createdConfig = makeReceiptConfig({ location_id: 'loc-001' });
      mockSupabase.single.mockResolvedValue({ data: createdConfig, error: null });

      await useLocationSettingsStore.getState().saveReceiptConfig('loc-001', { receipt_header: 'Header' });

      expect(useLocationSettingsStore.getState().receiptConfig).toEqual(createdConfig);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('throws on update error', async () => {
      useLocationSettingsStore.setState({ receiptConfig: makeReceiptConfig() });
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Receipt update error' } });

      await expect(
        useLocationSettingsStore.getState().saveReceiptConfig('loc-001', { receipt_header: 'X' }),
      ).rejects.toThrow('Receipt update error');
    });

    it('throws on insert error', async () => {
      useLocationSettingsStore.setState({ receiptConfig: null });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Receipt insert error' } });

      await expect(
        useLocationSettingsStore.getState().saveReceiptConfig('loc-001', { receipt_header: 'X' }),
      ).rejects.toThrow('Receipt insert error');
    });
  });

  // ================================================================
  // saveKdsConfig
  // ================================================================
  describe('saveKdsConfig', () => {
    it('updates existing config when kdsConfig is set', async () => {
      const existing = makeKdsConfig({ location_id: 'loc-001', alert_time_minutes: 10 });
      useLocationSettingsStore.setState({ kdsConfig: existing });

      mockSupabase.eq.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().saveKdsConfig('loc-001', { alert_time_minutes: 20 });

      expect(useLocationSettingsStore.getState().kdsConfig?.alert_time_minutes).toBe(20);
    });

    it('inserts new config when kdsConfig is null', async () => {
      useLocationSettingsStore.setState({ kdsConfig: null });

      const createdConfig = makeKdsConfig({ location_id: 'loc-001' });
      mockSupabase.single.mockResolvedValue({ data: createdConfig, error: null });

      await useLocationSettingsStore.getState().saveKdsConfig('loc-001', { alert_time_minutes: 5 });

      expect(useLocationSettingsStore.getState().kdsConfig).toEqual(createdConfig);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('throws on update error', async () => {
      useLocationSettingsStore.setState({ kdsConfig: makeKdsConfig() });
      mockSupabase.eq.mockResolvedValue({ error: { message: 'KDS update error' } });

      await expect(
        useLocationSettingsStore.getState().saveKdsConfig('loc-001', { alert_time_minutes: 1 }),
      ).rejects.toThrow('KDS update error');
    });

    it('throws on insert error', async () => {
      useLocationSettingsStore.setState({ kdsConfig: null });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'KDS insert error' } });

      await expect(
        useLocationSettingsStore.getState().saveKdsConfig('loc-001', { alert_time_minutes: 1 }),
      ).rejects.toThrow('KDS insert error');
    });
  });

  // ================================================================
  // saveReceiptDefaults
  // ================================================================
  describe('saveReceiptDefaults', () => {
    it('upserts to app_config and updates state', async () => {
      const defaults: ReceiptDefaults = {
        header: 'Global Header',
        footer: 'Global Footer',
        print_automatically: true,
        show_logo: true,
      };

      mockSupabase.upsert.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().saveReceiptDefaults(defaults);

      expect(useLocationSettingsStore.getState().receiptDefaults).toEqual(defaults);
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('throws on error', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: { message: 'Upsert failed' } });

      await expect(
        useLocationSettingsStore.getState().saveReceiptDefaults({
          header: 'H',
          footer: 'F',
          print_automatically: false,
          show_logo: false,
        }),
      ).rejects.toThrow('Upsert failed');
    });
  });

  // ================================================================
  // saveKdsDefaults
  // ================================================================
  describe('saveKdsDefaults', () => {
    it('upserts to app_config and updates state', async () => {
      const defaults: KdsDefaults = {
        alert_time_minutes: 12,
        auto_accept_orders: false,
        sound_enabled: true,
        display_priority: true,
      };

      mockSupabase.upsert.mockResolvedValue({ error: null });

      await useLocationSettingsStore.getState().saveKdsDefaults(defaults);

      expect(useLocationSettingsStore.getState().kdsDefaults).toEqual(defaults);
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('throws on error', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: { message: 'KDS upsert failed' } });

      await expect(
        useLocationSettingsStore.getState().saveKdsDefaults({
          alert_time_minutes: 5,
          auto_accept_orders: true,
          sound_enabled: false,
          display_priority: false,
        }),
      ).rejects.toThrow('KDS upsert failed');
    });
  });
});
