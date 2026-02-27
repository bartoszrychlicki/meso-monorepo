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

    const { data: staffUser } = await supabase
      .from('users_users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!staffUser) {
      set({ currentUser: null, isAuthenticated: false, isLoading: false });
      return;
    }

    let location: Location | null = null;
    if (staffUser.location_id) {
      const { data: loc } = await supabase
        .from('users_locations')
        .select('*')
        .eq('id', staffUser.location_id)
        .single();
      location = loc;
    }

    const { data: locations } = await supabase
      .from('users_locations')
      .select('*')
      .eq('is_active', true);

    set({
      currentUser: staffUser as User,
      currentLocation: location,
      locations: (locations || []) as Location[],
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
