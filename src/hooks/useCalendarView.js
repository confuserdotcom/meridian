import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ——— Zoom ———
// 0.4 → bird's-eye (full 24h fits in ~576px). 3.5 → hour detail (each hour = 252px).
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 3.5;
export const ZOOM_STEP = 0.15;
export const ZOOM_DEFAULT = 1.0;

// Named semantic levels — useful for quick zoom-to buttons / UI labels.
export const ZOOM_BANDS = [
  { key: 'month', label: 'Month', zoom: 0.45, description: 'Overview — whole day at a glance' },
  { key: 'week', label: 'Week', zoom: 0.75, description: 'Compact — hour rows, small blocks' },
  { key: 'day', label: 'Day', zoom: 1.0, description: 'Default — balanced detail' },
  { key: 'hour', label: 'Hour', zoom: 2.25, description: 'Focus — 15-min ticks visible' },
];

export function bandForZoom(zoom) {
  // Return the closest band name
  let best = ZOOM_BANDS[0];
  let bestDelta = Math.abs(ZOOM_BANDS[0].zoom - zoom);
  for (const b of ZOOM_BANDS) {
    const d = Math.abs(b.zoom - zoom);
    if (d < bestDelta) { best = b; bestDelta = d; }
  }
  return best;
}

// ——— Focus range presets ———
export const FOCUS_PRESETS = [
  { key: 'all', label: 'All day', start: 0, end: 1440 },
  { key: 'morning', label: 'Morning', start: 5 * 60, end: 12 * 60 },
  { key: 'workday', label: 'Workday', start: 8 * 60, end: 18 * 60 },
  { key: 'afternoon', label: 'Afternoon', start: 12 * 60, end: 18 * 60 },
  { key: 'evening', label: 'Evening', start: 17 * 60, end: 23 * 60 },
  { key: 'waking', label: 'Waking hours', start: 6 * 60, end: 23 * 60 },
];

export function matchFocusPreset(start, end) {
  return FOCUS_PRESETS.find((p) => p.start === start && p.end === end) || null;
}

function clampZoom(z) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

export const useCalendarView = create(
  persist(
    (set, get) => ({
      zoomLevel: ZOOM_DEFAULT,
      focusRange: { start: 0, end: 1440 },
      isFullscreen: false,

      setZoom: (z) => set({ zoomLevel: clampZoom(z) }),
      zoomIn: () => set({ zoomLevel: clampZoom(get().zoomLevel + ZOOM_STEP) }),
      zoomOut: () => set({ zoomLevel: clampZoom(get().zoomLevel - ZOOM_STEP) }),
      resetZoom: () => set({ zoomLevel: ZOOM_DEFAULT }),
      zoomToBand: (bandKey) => {
        const band = ZOOM_BANDS.find((b) => b.key === bandKey);
        if (band) set({ zoomLevel: band.zoom });
      },

      setFocusRange: (start, end) => {
        const s = Math.max(0, Math.min(1440, Math.round(start)));
        const e = Math.max(s + 60, Math.min(1440, Math.round(end)));
        set({ focusRange: { start: s, end: e } });
      },
      setFocusPreset: (key) => {
        const p = FOCUS_PRESETS.find((x) => x.key === key);
        if (p) set({ focusRange: { start: p.start, end: p.end } });
      },
      resetFocus: () => set({ focusRange: { start: 0, end: 1440 } }),

      toggleFullscreen: () => set({ isFullscreen: !get().isFullscreen }),
      setFullscreen: (v) => set({ isFullscreen: !!v }),
    }),
    {
      name: 'lcc-calendar-view',
      // Don't persist fullscreen — it's a session-only visual mode.
      partialize: (s) => ({ zoomLevel: s.zoomLevel, focusRange: s.focusRange }),
    }
  )
);
