import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePhase = create(
  persist(
    (set) => ({
      phase: 'normal',
      setPhase: (phase) => set({ phase }),
    }),
    { name: 'lcc-phase' }
  )
);
