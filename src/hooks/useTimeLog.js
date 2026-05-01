import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

/**
 * Persisted log of completed tracking sessions. Each entry captures:
 *   taskName, category, blockRef, plannedDuration, actualDuration,
 *   plannedStart/End (HH:MM), actualStart/End (HH:MM),
 *   startTimestamp / endTimestamp (epoch ms), day, phase, date (YYYY-MM-DD)
 *
 * `blockRef` links real sessions back to a specific planned block (supports
 * multiple sessions per single planned task).
 */
export const useTimeLog = create(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (session) => {
        set((s) => ({
          logs: [
            ...s.logs,
            {
              ...session,
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        if (isAuthenticated()) {
          api.post('/logs', {
            category: session.category,
            plannedStart: session.plannedStart,
            plannedEnd: session.plannedEnd,
            actualStart: session.actualStart,
            actualEnd: session.actualEnd,
            date: session.date,
            note: session.note ?? null,
          }).catch(err => console.warn('sync failed:', err));
        }
      },

      removeLog: (id) => {
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }));
        if (isAuthenticated()) {
          api.delete(`/logs/${id}`).catch(err => console.warn('sync failed:', err));
        }
      },

      clearAll: () => set({ logs: [] }),

      getLogsForDay: (day, date) =>
        get().logs.filter((l) => l.day === day && (!date || l.date === date)),

      getLogsForDate: (date) =>
        get().logs.filter((l) => l.date === date),

      getLogsForBlock: (blockRef, date) =>
        get().logs.filter((l) => l.blockRef === blockRef && (!date || l.date === date)),

      getCategoryStats: (category) => {
        const logs = get().logs.filter((l) => l.category === category);
        if (logs.length === 0) return null;
        const totalPlanned = logs.reduce((s, l) => s + l.plannedDuration, 0);
        const totalActual = logs.reduce((s, l) => s + l.actualDuration, 0);
        return {
          sessions: logs.length,
          totalPlanned,
          totalActual,
          avgRatio: totalPlanned > 0 ? totalActual / totalPlanned : 1,
        };
      },

      /**
       * AI duration prediction using exponentially-weighted moving average of the
       * actual/planned ratio for the given category. More recent sessions carry
       * more weight so predictions adapt as user behavior changes.
       *
       * Returns: { predicted, confidence (0-100), ratio, samples }
       */
      predictDuration: (category, plannedMinutes) => {
        const relevant = get().logs.filter(
          (l) =>
            l.category === category &&
            l.plannedDuration > 0 &&
            l.actualDuration > 0,
        );

        if (relevant.length === 0) {
          return { predicted: plannedMinutes, confidence: 0, ratio: 1, samples: 0 };
        }

        const sorted = [...relevant].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );

        const decay = 0.82;
        let weightSum = 0;
        let ratioSum = 0;
        sorted.forEach((log, i) => {
          const weight = Math.pow(decay, sorted.length - 1 - i);
          const ratio = log.actualDuration / log.plannedDuration;
          ratioSum += ratio * weight;
          weightSum += weight;
        });

        const avgRatio = weightSum > 0 ? ratioSum / weightSum : 1;
        const confidence = Math.min(100, Math.round((sorted.length / 8) * 100));
        const predicted = Math.max(5, Math.round(plannedMinutes * avgRatio));

        return {
          predicted,
          confidence,
          ratio: Math.round(avgRatio * 100) / 100,
          samples: sorted.length,
        };
      },

      /** Summary across all logs for a date: total planned vs total actual. */
      getDateSummary: (date) => {
        const logs = get().logs.filter((l) => l.date === date);
        if (logs.length === 0) {
          return { sessions: 0, planned: 0, actual: 0, variance: 0 };
        }
        const actual = logs.reduce((s, l) => s + l.actualDuration, 0);
        // Planned = sum unique blockRefs' plannedDuration (don't double-count
        // when multiple sessions ran against the same planned block)
        const seen = new Set();
        let planned = 0;
        logs.forEach((l) => {
          if (l.blockRef && !seen.has(l.blockRef)) {
            seen.add(l.blockRef);
            planned += l.plannedDuration;
          }
        });
        return {
          sessions: logs.length,
          planned,
          actual,
          variance: actual - planned,
        };
      },
    }),
    { name: 'lcc-timelog' },
  ),
);
