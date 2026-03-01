'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import {
  Location,
  DeliveryConfig,
  ReceiptConfig,
  KdsConfig,
  ReceiptDefaults,
  KdsDefaults,
} from '@/types/common';

interface LocationSettingsStore {
  allLocations: Location[];
  isLoading: boolean;

  editingLocation: Location | null;
  deliveryConfig: DeliveryConfig | null;
  receiptConfig: ReceiptConfig | null;
  kdsConfig: KdsConfig | null;
  isLoadingConfigs: boolean;

  receiptDefaults: ReceiptDefaults | null;
  kdsDefaults: KdsDefaults | null;

  loadAllLocations: () => Promise<void>;
  loadLocationWithConfigs: (locationId: string) => Promise<void>;
  loadGlobalDefaults: () => Promise<void>;

  createLocation: (data: Partial<Location>) => Promise<Location>;
  updateLocation: (id: string, data: Partial<Location>) => Promise<void>;
  deactivateLocation: (id: string) => Promise<void>;
  reactivateLocation: (id: string) => Promise<void>;

  saveDeliveryConfig: (locationId: string, data: Partial<DeliveryConfig>) => Promise<void>;
  saveReceiptConfig: (locationId: string, data: Partial<ReceiptConfig>) => Promise<void>;
  saveKdsConfig: (locationId: string, data: Partial<KdsConfig>) => Promise<void>;

  saveReceiptDefaults: (data: ReceiptDefaults) => Promise<void>;
  saveKdsDefaults: (data: KdsDefaults) => Promise<void>;
}

export const useLocationSettingsStore = create<LocationSettingsStore>()((set, get) => ({
  allLocations: [],
  isLoading: false,
  editingLocation: null,
  deliveryConfig: null,
  receiptConfig: null,
  kdsConfig: null,
  isLoadingConfigs: false,
  receiptDefaults: null,
  kdsDefaults: null,

  loadAllLocations: async () => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('users_locations')
        .select('*')
        .order('name');
      set({ allLocations: (data || []) as Location[] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadLocationWithConfigs: async (locationId: string) => {
    set({ isLoadingConfigs: true });
    try {
      const supabase = createClient();

      const [locResult, deliveryResult, receiptResult, kdsResult] = await Promise.all([
        supabase.from('users_locations').select('*').eq('id', locationId).single(),
        supabase.from('orders_delivery_config').select('*').eq('location_id', locationId).maybeSingle(),
        supabase.from('location_receipt_config').select('*').eq('location_id', locationId).maybeSingle(),
        supabase.from('location_kds_config').select('*').eq('location_id', locationId).maybeSingle(),
      ]);

      set({
        editingLocation: locResult.data as Location | null,
        deliveryConfig: deliveryResult.data as DeliveryConfig | null,
        receiptConfig: receiptResult.data as ReceiptConfig | null,
        kdsConfig: kdsResult.data as KdsConfig | null,
      });
    } finally {
      set({ isLoadingConfigs: false });
    }
  },

  loadGlobalDefaults: async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .in('key', ['receipt_defaults', 'kds_defaults']);

    const defaults: Record<string, unknown> = {};
    for (const row of data || []) {
      defaults[row.key] = row.value;
    }

    set({
      receiptDefaults: (defaults['receipt_defaults'] as ReceiptDefaults) || null,
      kdsDefaults: (defaults['kds_defaults'] as KdsDefaults) || null,
    });
  },

  createLocation: async (data) => {
    const supabase = createClient();
    const { data: created, error } = await supabase
      .from('users_locations')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const location = created as Location;
    set({ allLocations: [...get().allLocations, location] });
    return location;
  },

  updateLocation: async (id, data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('users_locations')
      .update(data)
      .eq('id', id);

    if (error) throw new Error(error.message);

    set({
      allLocations: get().allLocations.map((l) =>
        l.id === id ? { ...l, ...data } : l
      ),
      editingLocation: get().editingLocation?.id === id
        ? { ...get().editingLocation!, ...data }
        : get().editingLocation,
    });
  },

  deactivateLocation: async (id) => {
    await get().updateLocation(id, { is_active: false } as Partial<Location>);
  },

  reactivateLocation: async (id) => {
    await get().updateLocation(id, { is_active: true } as Partial<Location>);
  },

  saveDeliveryConfig: async (locationId, data) => {
    const supabase = createClient();
    const existing = get().deliveryConfig;

    if (existing) {
      const { error } = await supabase
        .from('orders_delivery_config')
        .update(data)
        .eq('location_id', locationId);
      if (error) throw new Error(error.message);
      set({ deliveryConfig: { ...existing, ...data } as DeliveryConfig });
    } else {
      const { data: created, error } = await supabase
        .from('orders_delivery_config')
        .insert({ ...data, location_id: locationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      set({ deliveryConfig: created as DeliveryConfig });
    }
  },

  saveReceiptConfig: async (locationId, data) => {
    const supabase = createClient();
    const existing = get().receiptConfig;

    if (existing) {
      const { error } = await supabase
        .from('location_receipt_config')
        .update(data)
        .eq('location_id', locationId);
      if (error) throw new Error(error.message);
      set({ receiptConfig: { ...existing, ...data } as ReceiptConfig });
    } else {
      const { data: created, error } = await supabase
        .from('location_receipt_config')
        .insert({ ...data, location_id: locationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      set({ receiptConfig: created as ReceiptConfig });
    }
  },

  saveKdsConfig: async (locationId, data) => {
    const supabase = createClient();
    const existing = get().kdsConfig;

    if (existing) {
      const { error } = await supabase
        .from('location_kds_config')
        .update(data)
        .eq('location_id', locationId);
      if (error) throw new Error(error.message);
      set({ kdsConfig: { ...existing, ...data } as KdsConfig });
    } else {
      const { data: created, error } = await supabase
        .from('location_kds_config')
        .insert({ ...data, location_id: locationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      set({ kdsConfig: created as KdsConfig });
    }
  },

  saveReceiptDefaults: async (data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'receipt_defaults', value: data });
    if (error) throw new Error(error.message);
    set({ receiptDefaults: data });
  },

  saveKdsDefaults: async (data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'kds_defaults', value: data });
    if (error) throw new Error(error.message);
    set({ kdsDefaults: data });
  },
}));
