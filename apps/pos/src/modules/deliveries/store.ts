'use client';

import { create } from 'zustand';
import { Supplier, DeliveryWithDetails, Delivery } from '@/types/delivery';
import { DeliverySource } from '@/types/enums';
import { deliveryRepository } from './repository';

interface DeliveryStore {
  deliveries: DeliveryWithDetails[];
  suppliers: Supplier[];
  isLoading: boolean;

  loadAll: () => Promise<void>;
  loadSuppliers: () => Promise<void>;

  createSupplier: (data: { name: string; phone?: string | null; email?: string | null; notes?: string | null }) => Promise<Supplier>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  createDelivery: (
    data: {
      warehouse_id: string;
      supplier_id?: string | null;
      document_number?: string | null;
      document_date?: string | null;
      source: DeliverySource;
      source_image_url?: string | null;
      notes?: string | null;
    },
    items: {
      stock_item_id: string;
      quantity_ordered?: number | null;
      quantity_received: number;
      supplier_quantity_received?: number | null;
      supplier_unit?: string | null;
      unit_price_net?: number | null;
      price_per_kg_net?: number | null;
      vat_rate?: string | null;
      expiry_date?: string | null;
      ai_matched_name?: string | null;
      ai_confidence?: number | null;
      notes?: string | null;
    }[]
  ) => Promise<Delivery>;
  completeDelivery: (id: string) => Promise<void>;
  updateDelivery: (id: string, data: Partial<Delivery>) => Promise<void>;
}

export const useDeliveryStore = create<DeliveryStore>()((set, get) => ({
  deliveries: [],
  suppliers: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [deliveries, suppliers] = await Promise.all([
        deliveryRepository.getAllDeliveries(),
        deliveryRepository.getAllSuppliers(),
      ]);
      set({ deliveries, suppliers });
    } finally {
      set({ isLoading: false });
    }
  },

  loadSuppliers: async () => {
    const suppliers = await deliveryRepository.getAllSuppliers();
    set({ suppliers });
  },

  createSupplier: async (data) => {
    const supplier = await deliveryRepository.createSupplier({
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      is_active: true,
    });
    set({ suppliers: [...get().suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name)) });
    return supplier;
  },

  updateSupplier: async (id, data) => {
    await deliveryRepository.updateSupplier(id, data);
    set({
      suppliers: get().suppliers.map((s) => (s.id === id ? { ...s, ...data } : s)),
    });
  },

  deleteSupplier: async (id) => {
    await deliveryRepository.deleteSupplier(id);
    set({ suppliers: get().suppliers.filter((s) => s.id !== id) });
  },

  createDelivery: async (data, items) => {
    const delivery = await deliveryRepository.createDelivery(data, items);
    const deliveries = await deliveryRepository.getAllDeliveries();
    set({ deliveries });
    return delivery;
  },

  completeDelivery: async (id) => {
    await deliveryRepository.completeDelivery(id);
    const deliveries = await deliveryRepository.getAllDeliveries();
    set({ deliveries });
  },

  updateDelivery: async (id, data) => {
    await deliveryRepository.updateDelivery(id, data);
    const deliveries = await deliveryRepository.getAllDeliveries();
    set({ deliveries });
  },
}));
