import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const getDateKey = () => new Date().toISOString().slice(0, 10);

export const useCheckin = create(
  persist(
    (set, get) => ({
      date: null,
      mood: null,       // 'low' | 'medium' | 'high'
      energy: null,     // 'low' | 'medium' | 'high'
      availableHours: 5,
      completedBlocks: [],
      history: [],

      submitCheckin: (mood, energy, hours) => {
        const today = getDateKey();
        set({ date: today, mood, energy, availableHours: hours });
      },

      hasCheckedInToday: () => get().date === getDateKey(),

      logBlockCompletion: (blockIndex, completed) =>
        set((s) => {
          const blocks = [...s.completedBlocks];
          blocks[blockIndex] = completed;
          return { completedBlocks: blocks };
        }),

      submitEndOfDay: () => {
        const { mood, energy, availableHours, completedBlocks, history } = get();
        const completed = completedBlocks.filter(Boolean).length;
        const total = completedBlocks.length;
        const entry = {
          date: getDateKey(),
          mood,
          energy,
          availableHours,
          completedBlocks: completed,
          totalBlocks: total,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
        set({
          history: [...history.slice(-29), entry],
        });
      },

      getCompletionRate: () => {
        const { completedBlocks } = get();
        const total = completedBlocks.length;
        if (total === 0) return 0;
        return Math.round((completedBlocks.filter(Boolean).length / total) * 100);
      },

      getAverageCompletion: () => {
        const { history } = get();
        if (history.length === 0) return 0;
        const sum = history.reduce((acc, h) => acc + h.completionRate, 0);
        return Math.round(sum / history.length);
      },

      resetToday: () =>
        set({ date: null, mood: null, energy: null, availableHours: 5, completedBlocks: [] }),
    }),
    { name: 'lcc-checkin' }
  )
);
