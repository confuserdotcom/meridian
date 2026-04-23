import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const getDateKey = () => new Date().toISOString().slice(0, 10);

export const useStreak = create(
  persist(
    (set, get) => ({
      count: 0,
      lastDate: null,
      checkAndUpdate: (completedCount) => {
        const today = getDateKey();
        const { lastDate, count } = get();
        if (lastDate === today) return;

        if (completedCount >= 2) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = yesterday.toISOString().slice(0, 10);
          const newCount = lastDate === yesterdayKey ? count + 1 : 1;
          set({ count: newCount, lastDate: today });
        }
      },
      reset: () => set({ count: 0, lastDate: null }),
    }),
    { name: 'lcc-streak' }
  )
);
