import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

export const useSettings = create(
  persist(
    (set, get) => ({
      darkMode: false,
      wakeOffset: 0,
      toggleDarkMode: () => {
        set((s) => ({ darkMode: !s.darkMode }));
        const { darkMode } = get();
        if (isAuthenticated()) {
          api.put('/settings', { darkMode }).catch(err => console.warn('sync failed:', err));
        }
      },
      setWakeOffset: (offset) => {
        set({ wakeOffset: offset });
        if (isAuthenticated()) {
          api.put('/settings', { wakeOffset: offset }).catch(err => console.warn('sync failed:', err));
        }
      },
    }),
    { name: 'lcc-settings' }
  )
);
