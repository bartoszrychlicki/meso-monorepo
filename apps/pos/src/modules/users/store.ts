'use client';

import { create } from 'zustand';
import { User } from '@/types/user';
import { Location } from '@/types/common';
import { createClient } from '@/lib/supabase/client';

interface UserStore {
  currentUser: User | null;
  currentLocation: Location | null;
  locations: Location[];
  isAuthenticated: boolean;
  isLoading: boolean;
  loadUser: () => Promise<void>;
  loadLocations: () => Promise<void>;
  setCurrentLocation: (locationId: string) => void;
  setCurrentUserLocale: (locale: 'pl' | 'en' | null) => void;
  reset: () => void;
}

export const useUserStore = create<UserStore>()((set, get) => ({
  currentUser: null,
  currentLocation: null,
  locations: [],
  isAuthenticated: false,
  isLoading: true,

  loadUser: async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      set({ currentUser: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const { data: activeLocations } = await supabase
      .from('users_locations')
      .select('*')
      .eq('is_active', true);

    const { data: staffUserById } = await supabase
      .from('users_users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    let staffUser = (staffUserById as User | null) ?? null;

    // Fallback for legacy data where users_users.id may not match auth.users.id.
    if (!staffUser && authUser.email) {
      const { data: staffUserByEmail } = await supabase
        .from('users_users')
        .select('*')
        .ilike('email', authUser.email)
        .maybeSingle();
      staffUser = (staffUserByEmail as User | null) ?? null;
    }

    // Auto-provision missing staff profile from auth metadata.
    // This fixes legacy/migrated accounts that have auth.users entry but no users_users row.
    if (!staffUser && authUser.email && authUser.user_metadata?.app_role === 'staff') {
      const usernameBase = authUser.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '') || 'staff';
      const username = `${usernameBase}-${authUser.id.slice(0, 8)}`;
      const roleFromMeta =
        typeof authUser.user_metadata?.role === 'string'
          ? authUser.user_metadata.role
          : 'cashier';
      const nameFromMeta =
        typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name.trim()
          ? authUser.user_metadata.name.trim()
          : usernameBase;

      const { data: createdStaffUser } = await supabase
        .from('users_users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: nameFromMeta,
          username,
          role: roleFromMeta,
          is_active: true,
        })
        .select('*')
        .maybeSingle();

      staffUser = (createdStaffUser as User | null) ?? null;

      if (!staffUser) {
        const { data: staffUserByEmailAfterInsert } = await supabase
          .from('users_users')
          .select('*')
          .ilike('email', authUser.email)
          .maybeSingle();
        staffUser = (staffUserByEmailAfterInsert as User | null) ?? null;
      }
    }

    let location: Location | null = null;
    if (staffUser?.location_id) {
      const assignedLocationId = staffUser.location_id;
      location =
        ((activeLocations || []) as Location[]).find((loc) => loc.id === assignedLocationId) ||
        null;

      // Assigned location may be inactive, fetch it directly when absent in active list.
      if (!location) {
        const { data: loc } = await supabase
          .from('users_locations')
          .select('*')
          .eq('id', assignedLocationId)
          .maybeSingle();
        location = (loc as Location | null) ?? null;
      }
    }

    set({
      currentUser: staffUser,
      currentLocation: location,
      locations: (activeLocations || []) as Location[],
      isAuthenticated: true,
      isLoading: false,
    });
  },

  loadLocations: async () => {
    const supabase = createClient();
    const { data: locations } = await supabase
      .from('users_locations')
      .select('*')
      .eq('is_active', true);

    set({ locations: (locations || []) as Location[] });
  },

  setCurrentLocation: (locationId: string) => {
    const { locations } = get();
    const location = locations.find((l) => l.id === locationId) ?? null;
    set({ currentLocation: location });
  },

  setCurrentUserLocale: (locale) => {
    const { currentUser } = get();
    if (!currentUser) return;

    set({
      currentUser: {
        ...currentUser,
        ui_language: locale,
      },
    });
  },

  reset: () => {
    set({
      currentUser: null,
      currentLocation: null,
      locations: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
