import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, Crosshair, ChevronDown, Check,
} from 'lucide-react';
import {
  useCalendarView, ZOOM_MIN, ZOOM_MAX, ZOOM_BANDS, FOCUS_PRESETS, matchFocusPreset, bandForZoom,
} from '../../hooks/useCalendarView';
import { sounds } from '../../utils/sounds';

export default function ZoomControls({ onJumpToNow }) {
  const {
    zoomLevel, focusRange, isFullscreen,
    zoomIn, zoomOut, resetZoom, setZoom, zoomToBand,
    setFocusPreset, resetFocus,
    toggleFullscreen,
  } = useCalendarView();

  const [focusOpen, setFocusOpen] = useState(false);
  const focusRef = useRef(null);

  // Close focus popover on outside click
  useEffect(() => {
    if (!focusOpen) return;
    function onDown(e) {
      if (!focusRef.current?.contains(e.target)) setFocusOpen(false);
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [focusOpen]);

  // Global keyboard shortcuts — only when no input/textarea is focused.
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      const tag = (t?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || t?.isContentEditable) return;
      // Zoom shortcuts
      if ((e.key === '+' || e.key === '=') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); zoomIn(); sounds.click();
      } else if (e.key === '-' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); zoomOut(); sounds.click();
      } else if (e.key === '0' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); resetZoom(); sounds.click();
      } else if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); toggleFullscreen(); sounds.click();
      } else if (e.key === 'Escape' && useCalendarView.getState().isFullscreen) {
        e.preventDefault(); useCalendarView.getState().setFullscreen(false); sounds.click();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIn, zoomOut, resetZoom, toggleFullscreen]);

  const zoomPct = Math.round(zoomLevel * 100);
  const focusPreset = matchFocusPreset(focusRange.start, focusRange.end);
  const focusLabel = focusPreset?.label || 'Custom';
  const focusActive = !(focusRange.start === 0 && focusRange.end === 1440);
  const band = bandForZoom(zoomLevel);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Zoom band quick-switch */}
      <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-stone-100 dark:bg-stone-800/70 rounded-lg">
        {ZOOM_BANDS.map((b) => (
          <button
            key={b.key}
            onClick={() => { zoomToBand(b.key); sounds.click(); }}
            className={`relative px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
              band.key === b.key
                ? 'text-stone-900 dark:text-stone-100'
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
            title={b.description}
          >
            {band.key === b.key && (
              <motion.div
                layoutId="zoom-band-pill"
                className="absolute inset-0 rounded-md bg-white dark:bg-stone-700 shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{b.label}</span>
          </button>
        ))}
      </div>

      {/* Zoom slider (in/out + percentage) */}
      <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/70 rounded-lg p-0.5">
        <button
          onClick={() => { zoomOut(); sounds.click(); }}
          disabled={zoomLevel <= ZOOM_MIN + 0.001}
          className="p-1 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title="Zoom out (−)"
        >
          <ZoomOut size={12} />
        </button>
        <button
          onClick={() => { resetZoom(); sounds.click(); }}
          className="px-2 text-[10px] font-mono font-semibold text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 rounded tabular-nums min-w-[38px]"
          title="Reset zoom (0)"
        >
          {zoomPct}%
        </button>
        <button
          onClick={() => { zoomIn(); sounds.click(); }}
          disabled={zoomLevel >= ZOOM_MAX - 0.001}
          className="p-1 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title="Zoom in (+)"
        >
          <ZoomIn size={12} />
        </button>
      </div>

      {/* Focus-range picker */}
      <div className="relative" ref={focusRef}>
        <button
          onClick={() => setFocusOpen((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors ${
            focusActive
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
              : 'bg-stone-100 dark:bg-stone-800/70 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
          title="Focus on a time range"
        >
          <Crosshair size={10} />
          {focusLabel}
          <ChevronDown size={10} className={`transition-transform ${focusOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {focusOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full right-0 mt-1 z-40 w-48 py-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl"
            >
              {FOCUS_PRESETS.map((p) => {
                const active = focusRange.start === p.start && focusRange.end === p.end;
                return (
                  <button
                    key={p.key}
                    onClick={() => { setFocusPreset(p.key); setFocusOpen(false); sounds.click(); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors ${
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200'
                    }`}
                  >
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="font-medium">{p.label}</span>
                      <span className="font-mono text-[9px] text-stone-400 dark:text-stone-500 tabular-nums">
                        {fmt(p.start)}–{fmt(p.end)}
                      </span>
                    </div>
                    {active && <Check size={11} className="text-indigo-500 flex-shrink-0" />}
                  </button>
                );
              })}
              {focusActive && (
                <>
                  <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                  <button
                    onClick={() => { resetFocus(); setFocusOpen(false); sounds.click(); }}
                    className="w-full px-3 py-1.5 text-[10px] text-left text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                  >
                    Clear focus
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Jump-to-now button (only if provided — i.e., viewing today) */}
      {onJumpToNow && (
        <button
          onClick={() => { onJumpToNow(); sounds.click(); }}
          className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800/70 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          title="Jump to current time"
        >
          <Crosshair size={11} />
        </button>
      )}

      {/* Fullscreen toggle */}
      <button
        onClick={() => { toggleFullscreen(); sounds.click(); }}
        className={`p-1.5 rounded-lg transition-colors ${
          isFullscreen
            ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200'
            : 'bg-stone-100 dark:bg-stone-800/70 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
        }`}
        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen (F)'}
      >
        {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
      </button>
    </div>
  );
}

function fmt(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hr = h === 0 || h === 24 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 || h === 24 ? 'a' : 'p';
  return m === 0 ? `${hr}${ampm}` : `${hr}:${String(m).padStart(2, '0')}${ampm}`;
}
