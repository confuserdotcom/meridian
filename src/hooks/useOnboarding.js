import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboarding = create(
  persist(
    (set) => ({
      completed: false,
      tourSeen: false,
      name: '',
      workHours: null, // { start: 'HH:MM', end: 'HH:MM' } | null
      hobbies: [],
      nonAcademicInterests: [],

      setName: (name) => set({ name }),
      setWorkHours: (workHours) => set({ workHours }),
      setHobbies: (hobbies) => set({ hobbies }),
      setNonAcademicInterests: (nonAcademicInterests) => set({ nonAcademicInterests }),
      completeWizard: () => set({ completed: true }),
      completeTour: () => set({ tourSeen: true }),
    }),
    { name: 'lcc-onboarding' }
  )
);
