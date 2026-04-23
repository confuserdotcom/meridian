import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePomodoro = create(
  persist(
    (set, get) => ({
      isRunning: false,
      mode: 'work', // 'work' | 'break' | 'longBreak'
      secondsLeft: 25 * 60,
      workDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsCompleted: 0,
      totalMinutesToday: 0,
      currentCourseId: null,
      currentTaskId: null,
      currentLabel: '',
      lastResetDate: null,

      start: (courseId, label, taskId) =>
        set({
          isRunning: true,
          currentCourseId: courseId || null,
          currentTaskId: taskId || null,
          currentLabel: label || '',
        }),

      pause: () => set({ isRunning: false }),

      resume: () => set({ isRunning: true }),

      tick: () => {
        const { secondsLeft, mode, workDuration, breakDuration, longBreakDuration, sessionsCompleted } = get();
        if (secondsLeft <= 1) {
          // Session complete
          if (mode === 'work') {
            const newSessions = sessionsCompleted + 1;
            const isLongBreak = newSessions % 4 === 0;
            set({
              isRunning: false,
              mode: isLongBreak ? 'longBreak' : 'break',
              secondsLeft: (isLongBreak ? longBreakDuration : breakDuration) * 60,
              sessionsCompleted: newSessions,
              totalMinutesToday: get().totalMinutesToday + workDuration,
            });
          } else {
            set({
              isRunning: false,
              mode: 'work',
              secondsLeft: workDuration * 60,
            });
          }
          return 'complete';
        }
        set({ secondsLeft: secondsLeft - 1 });
        return 'tick';
      },

      reset: () => {
        const { workDuration } = get();
        set({
          isRunning: false,
          mode: 'work',
          secondsLeft: workDuration * 60,
          currentCourseId: null,
          currentTaskId: null,
          currentLabel: '',
        });
      },

      setWorkDuration: (minutes) => {
        const { isRunning, mode } = get();
        if (isRunning) return;
        const m = Math.max(1, Math.min(180, Math.round(minutes)));
        set({
          workDuration: m,
          secondsLeft: mode === 'work' ? m * 60 : get().secondsLeft,
        });
      },

      setBreakDuration: (minutes) => {
        const { isRunning, mode } = get();
        if (isRunning) return;
        const m = Math.max(1, Math.min(60, Math.round(minutes)));
        set({
          breakDuration: m,
          secondsLeft: mode === 'break' ? m * 60 : get().secondsLeft,
        });
      },

      setLongBreakDuration: (minutes) => {
        const { isRunning, mode } = get();
        if (isRunning) return;
        const m = Math.max(1, Math.min(60, Math.round(minutes)));
        set({
          longBreakDuration: m,
          secondsLeft: mode === 'longBreak' ? m * 60 : get().secondsLeft,
        });
      },

      setDurations: (work, brk, longBrk) =>
        set({
          workDuration: work,
          breakDuration: brk,
          longBreakDuration: longBrk,
          secondsLeft: work * 60,
          mode: 'work',
          isRunning: false,
        }),

      setMode: (newMode) => {
        const { workDuration, breakDuration, longBreakDuration } = get();
        set({
          mode: newMode,
          secondsLeft: (newMode === 'work' ? workDuration : newMode === 'break' ? breakDuration : longBreakDuration) * 60,
          isRunning: false,
        });
      },

      ensureToday: () => {
        const today = new Date().toISOString().slice(0, 10);
        if (get().lastResetDate !== today) {
          set({ totalMinutesToday: 0, sessionsCompleted: 0, lastResetDate: today });
        }
      },
    }),
    { name: 'lcc-pomodoro' }
  )
);
