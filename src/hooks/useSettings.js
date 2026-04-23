import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettings = create(
  persist(
    (set) => ({
      darkMode: false,
      wakeOffset: 0,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setWakeOffset: (offset) => set({ wakeOffset: offset }),
    }),
    { name: 'lcc-settings' }
  )
);
