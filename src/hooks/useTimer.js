import { create } from 'zustand';
import { parseTime, minutesToTime } from '../utils/time';
import { categories } from '../data/categories';

/**
 * In-memory active-timer state. Not persisted — if the tab reloads mid-session
 * the running timer is lost on purpose (prevents "ghost" sessions from surviving
 * a browser crash).
 */
export const useTimer = create((set, get) => ({
  active: null,
  // Shape when running:
  // {
  //   taskName, category, blockRef,
  //   plannedStart, plannedEnd, plannedDuration,
  //   startedAt (ms timestamp), day, phase
  // }

  startTimer: ({ block, phase, day }) => {
    if (get().active) return false;
    const cat = categories[block.category];
    const startMin = parseTime(block.start);
    const endMin = parseTime(block.end);
    set({
      active: {
        taskName: (block.note && block.note.trim()) || cat?.label || block.category,
        category: block.category,
        blockRef: block.id || `${block.category}-${block.start}-${block.end}`,
        plannedStart: block.start,
        plannedEnd: block.end,
        plannedDuration: Math.max(1, endMin - startMin),
        startedAt: Date.now(),
        day,
        phase,
      },
    });
    return true;
  },

  /**
   * Stop the timer and return a completed session object (or null).
   * The caller is responsible for persisting the session via useTimeLog.addLog().
   */
  stopTimer: () => {
    const { active } = get();
    if (!active) return null;

    const now = Date.now();
    const elapsedMin = Math.max(1, Math.round((now - active.startedAt) / 60000));

    const nowDate = new Date(now);
    const endTotalMin = nowDate.getHours() * 60 + nowDate.getMinutes();
    const startTotalMin = Math.max(0, endTotalMin - elapsedMin);

    const session = {
      taskName: active.taskName,
      category: active.category,
      blockRef: active.blockRef,
      plannedStart: active.plannedStart,
      plannedEnd: active.plannedEnd,
      plannedDuration: active.plannedDuration,
      actualStart: minutesToTime(startTotalMin),
      actualEnd: minutesToTime(Math.min(1439, endTotalMin)),
      actualDuration: elapsedMin,
      startTimestamp: active.startedAt,
      endTimestamp: now,
      day: active.day,
      phase: active.phase,
      date: nowDate.toISOString().split('T')[0],
    };

    set({ active: null });
    return session;
  },

  cancelTimer: () => set({ active: null }),

  isTrackingBlock: (blockRef) => {
    const active = get().active;
    return active?.blockRef === blockRef;
  },
}));
