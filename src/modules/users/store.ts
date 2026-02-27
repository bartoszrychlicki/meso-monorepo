'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';
import { Location } from '@/types/common';
import { usersRepository } from './repository';
import { createRepository } from '@/lib/data/repository-factory';

const locationsRepo = createRepository<Location>('locations');

interface UserStore {
  currentUser: User | null;
  currentLocation: Location | null;
  locations: Location[];
  isAuthenticated: boolean;
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setCurrentLocation: (locationId: string) => void;
  loadLocations: () => Promise<void>;
  getCurrentUser: () => User | null;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentLocation: null,
      locations: [],
      isAuthenticated: false,

      login: async (email: string, _password: string) => {
        // Prototype: any password works, just check email exists
        const user = await usersRepository.findByEmail(email);
        if (!user) return false;

        // Load location for the user
        const location = await locationsRepo.findById(user.location_id);

        set({
          currentUser: user,
          currentLocation: location,
          isAuthenticated: true,
        });
        return true;
      },

      logout: () => {
        set({
          currentUser: null,
          currentLocation: null,
          isAuthenticated: false,
        });
      },

      setCurrentLocation: (locationId: string) => {
        const { locations } = get();
        const location = locations.find((l) => l.id === locationId) ?? null;
        set({ currentLocation: location });
      },

      loadLocations: async () => {
        const result = await locationsRepo.findAll();
        set({ locations: result.data });
      },

      getCurrentUser: () => get().currentUser,
    }),
    {
      name: 'mesopos_auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentLocation: state.currentLocation,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
