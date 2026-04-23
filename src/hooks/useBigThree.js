import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const getDateKey = () => new Date().toISOString().slice(0, 10);

export const useBigThree = create(
  persist(
    (set, get) => ({
      date: getDateKey(),
      tasks: [
        { text: '', done: false },
        { text: '', done: false },
        { text: '', done: false },
      ],
      ensureToday: () => {
        const today = getDateKey();
        if (get().date !== today) {
          set({
            date: today,
            tasks: [
              { text: '', done: false },
              { text: '', done: false },
              { text: '', done: false },
            ],
          });
        }
      },
      setTask: (index, text) =>
        set((state) => {
          const tasks = [...state.tasks];
          tasks[index] = { ...tasks[index], text };
          return { tasks };
        }),
      toggleTask: (index) =>
        set((state) => {
          const tasks = [...state.tasks];
          tasks[index] = { ...tasks[index], done: !tasks[index].done };
          return { tasks };
        }),
      getCompletedCount: () => get().tasks.filter((t) => t.done).length,
    }),
    { name: 'lcc-big-three' }
  )
);
