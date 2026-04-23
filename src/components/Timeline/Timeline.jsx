import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Undo2, RotateCcw, Sparkles } from 'lucide-react';
import TimelineBlock from './TimelineBlock';
import RealBlock, { LiveTimerBlock } from './RealBlock';
import TimerBar from './TimerBar';
import BlockEditor from './BlockEditor';
import ZoomControls from './ZoomControls';
import { parseTime, getCurrentTimeMinutes, formatTime, minutesToTime, snapTo, getTodayName } from '../../utils/time';
import { useCalendar } from '../../hooks/useCalendar';
import { useCalendarView, ZOOM_MIN, ZOOM_MAX } from '../../hooks/useCalendarView';
import { usePhase } from '../../hooks/usePhase';
import { useCourses } from '../../hooks/useCourses';
import { useTasks } from '../../hooks/useTasks';
import { useTimer } from '../../hooks/useTimer';
import { useTimeLog } from '../../hooks/useTimeLog';
import { generateStudySuggestions } from '../../utils/studySuggestions';
import { generateAiBlocks } from '../../utils/aiOptimizer';
import { sounds } from '../../utils/sounds';

// Base scaling. zoomLevel (from useCalendarView) multiplies BASE_PX_PER_MIN.
const BASE_PX_PER_MIN = 1.2;
const SNAP_GRID = 5;
const MIN_BLOCK_DURATION = 15;

export default function Timeline({ blocks, day, date, interactive = true, showActualLane = true }) {
  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const clickTimerRef = useRef(null);
  const pinchStateRef = useRef(null);
  const [now, setNow] = useState(getCurrentTimeMinutes());
  const [editingBlock, setEditingBlock] = useState(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newBlockDefaults, setNewBlockDefaults] = useState(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const phase = usePhase((s) => s.phase);
  // View state: zoom, focus range, fullscreen
  const zoomLevel = useCalendarView((s) => s.zoomLevel);
  const focusRange = useCalendarView((s) => s.focusRange);
  const isFullscreen = useCalendarView((s) => s.isFullscreen);
  const setZoom = useCalendarView((s) => s.setZoom);
  // Derived scaling
  const pxPerMin = BASE_PX_PER_MIN * zoomLevel;
  const gridStart = focusRange.start;
  const gridEnd = focusRange.end;
  const gridHeight = (gridEnd - gridStart) * pxPerMin;
  // Readability guards
  const showHalfHourLines = zoomLevel >= 0.55;
  const showQuarterHourLines = zoomLevel >= 2.0;
  const showHourLabels = pxPerMin >= 0.5; // below this, labels overlap
  const {
    getMergedBlocks, addBlock, updateBlock, removeCustomBlock,
    hideBaseBlock, restoreBaseBlock, convertBaseToCustom,
    resetDay, undo, canUndo, addAiBlocks,
  } = useCalendar();
  const courses = useCourses((s) => s.courses);
  const getDecayInfo = useCourses((s) => s.getDecayInfo);
  const getEffectiveConfidence = useCourses((s) => s.getEffectiveConfidence);
  const tasks = useTasks((s) => s.tasks);
  const activeTimer = useTimer((s) => s.active);
  const startTimer = useTimer((s) => s.startTimer);
  const isTrackingBlock = useTimer((s) => s.isTrackingBlock);
  const logs = useTimeLog((s) => s.logs);
  const predictDuration = useTimeLog((s) => s.predictDuration);

  // Resolved date for Actual lane. Defaults to today when day matches today.
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isToday = day === getTodayName();
  const resolvedDate = date || (isToday ? today : null);

  // Real-time logs for this day
  const dayLogs = useMemo(() => {
    if (!resolvedDate) return [];
    return logs.filter((l) => l.date === resolvedDate);
  }, [logs, resolvedDate]);

  // Only show live timer in the lane for today
  const showLiveTimer = showActualLane && isToday && activeTimer && activeTimer.day === day;

  useEffect(() => {
    const id = setInterval(() => setNow(getCurrentTimeMinutes()), 60000);
    return () => clearInterval(id);
  }, []);

  const mergedBlocks = interactive && day
    ? getMergedBlocks(phase, day, blocks)
    : blocks;

  // Hour lines inside current focus range
  const hours = useMemo(() => {
    const h = [];
    const first = Math.ceil(gridStart / 60) * 60;
    for (let m = first; m <= gridEnd; m += 60) h.push(m);
    return h;
  }, [gridStart, gridEnd]);

  const halfHours = useMemo(() => {
    const h = [];
    const first = Math.ceil(gridStart / 30) * 30;
    for (let m = first; m < gridEnd; m += 30) if (m % 60 !== 0) h.push(m);
    return h;
  }, [gridStart, gridEnd]);

  const quarterHours = useMemo(() => {
    const h = [];
    const first = Math.ceil(gridStart / 15) * 15;
    for (let m = first; m < gridEnd; m += 15) if (m % 30 !== 0) h.push(m);
    return h;
  }, [gridStart, gridEnd]);

  // Auto-scroll to first block (or current time) on mount
  useEffect(() => {
    if (hasScrolled || !scrollRef.current) return;
    const firstBlockMin = mergedBlocks?.[0] ? parseTime(mergedBlocks[0].start) : now;
    const scrollTarget = Math.max(0, (firstBlockMin - 60 - gridStart) * pxPerMin);
    scrollRef.current.scrollTop = scrollTarget;
    setHasScrolled(true);
  }, [mergedBlocks, hasScrolled, now, gridStart, pxPerMin]);

  useEffect(() => {
    setHasScrolled(false);
  }, [phase, day]);

  // Jump to current time (used by ZoomControls crosshair)
  const jumpToNow = useCallback(() => {
    if (!scrollRef.current) return;
    const target = Math.max(0, (now - 60 - gridStart) * pxPerMin);
    scrollRef.current.scrollTo({ top: target, behavior: 'smooth' });
  }, [now, gridStart, pxPerMin]);

  // ——— Wheel zoom (Ctrl/⌘ + scroll), anchored at cursor ———
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = scrollEl.getBoundingClientRect();
      const cursorY = e.clientY - rect.top + scrollEl.scrollTop;
      // Minute at cursor BEFORE zoom
      const cursorMin = gridStart + cursorY / pxPerMin;
      // Compute new zoom (negative deltaY = zoom in)
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel * factor));
      if (nextZoom === zoomLevel) return;
      setZoom(nextZoom);
      // After state update, restore cursor anchor (next frame)
      const nextPxPerMin = BASE_PX_PER_MIN * nextZoom;
      const nextScrollTop = (cursorMin - gridStart) * nextPxPerMin - (e.clientY - rect.top);
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = Math.max(0, nextScrollTop);
      });
    }
    scrollEl.addEventListener('wheel', onWheel, { passive: false });
    return () => scrollEl.removeEventListener('wheel', onWheel);
  }, [zoomLevel, gridStart, pxPerMin, setZoom]);

  // ——— Pinch zoom (two-finger touch) ———
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    function distance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }
    function midY(touches) {
      return (touches[0].clientY + touches[1].clientY) / 2;
    }
    function onTouchStart(e) {
      if (e.touches.length !== 2) return;
      pinchStateRef.current = {
        startDistance: distance(e.touches),
        startZoom: useCalendarView.getState().zoomLevel,
        anchorY: midY(e.touches),
      };
    }
    function onTouchMove(e) {
      if (e.touches.length !== 2 || !pinchStateRef.current) return;
      e.preventDefault();
      const { startDistance, startZoom, anchorY } = pinchStateRef.current;
      const ratio = distance(e.touches) / startDistance;
      const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, startZoom * ratio));
      if (Math.abs(nextZoom - useCalendarView.getState().zoomLevel) < 0.01) return;
      // Anchor zoom at midpoint
      const rect = scrollEl.getBoundingClientRect();
      const cursorY = anchorY - rect.top + scrollEl.scrollTop;
      const currentPx = BASE_PX_PER_MIN * useCalendarView.getState().zoomLevel;
      const cursorMin = useCalendarView.getState().focusRange.start + cursorY / currentPx;
      setZoom(nextZoom);
      const nextPxPerMin = BASE_PX_PER_MIN * nextZoom;
      const nextScrollTop = (cursorMin - useCalendarView.getState().focusRange.start) * nextPxPerMin - (anchorY - rect.top);
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = Math.max(0, nextScrollTop);
      });
    }
    function onTouchEnd(e) {
      if (e.touches.length < 2) pinchStateRef.current = null;
    }
    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove', onTouchMove, { passive: false });
    scrollEl.addEventListener('touchend', onTouchEnd);
    scrollEl.addEventListener('touchcancel', onTouchEnd);
    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchmove', onTouchMove);
      scrollEl.removeEventListener('touchend', onTouchEnd);
      scrollEl.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [setZoom]);

  // Click on empty grid → create block
  const handleGridClick = useCallback((e) => {
    if (!interactive || !day) return;
    // Ignore if the click target is inside a block
    if (e.target.closest('[data-block]')) return;

    const gridEl = gridRef.current;
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clickMin = snapTo(gridStart + y / pxPerMin, SNAP_GRID);
    const clamped = Math.max(gridStart, Math.min(gridEnd - 30, clickMin));

    setEditingBlock(null);
    setNewBlockDefaults({
      start: minutesToTime(clamped),
      end: minutesToTime(Math.min(1440, clamped + 30)),
    });
    setShowAddNew(true);
    sounds.click();
  }, [interactive, day, gridStart, gridEnd, pxPerMin]);

  if (!mergedBlocks || mergedBlocks.length === 0) return null;

  const handleAddBlock = (form) => {
    addBlock(phase, day, form);
    setShowAddNew(false);
    setNewBlockDefaults(null);
    sounds.create();
  };

  const handleBlockMove = (block, baseIndex, newStart, newEnd) => {
    if (block.custom) {
      updateBlock(phase, day, block.id, {
        start: minutesToTime(newStart),
        end: minutesToTime(newEnd),
      });
    } else {
      convertBaseToCustom(phase, day, baseIndex, block, {
        start: minutesToTime(newStart),
        end: minutesToTime(newEnd),
      });
    }
    sounds.drop();
  };

  const handleBlockResize = (block, baseIndex, newStart, newEnd) => {
    if (block.custom) {
      updateBlock(phase, day, block.id, {
        start: minutesToTime(newStart),
        end: minutesToTime(newEnd),
      });
    } else {
      convertBaseToCustom(phase, day, baseIndex, block, {
        start: minutesToTime(newStart),
        end: minutesToTime(newEnd),
      });
    }
    sounds.drop();
  };

  const handleEditSave = (form) => {
    if (!editingBlock) return;
    if (editingBlock.block.custom) {
      updateBlock(phase, day, editingBlock.block.id, form);
    } else {
      convertBaseToCustom(phase, day, editingBlock.baseIndex, editingBlock.block, form);
    }
    setEditingBlock(null);
  };

  const handleDelete = () => {
    if (!editingBlock) return;
    const { block } = editingBlock;
    if (block.custom) {
      if (block.convertedFrom !== undefined) {
        restoreBaseBlock(phase, day, block.convertedFrom);
      }
      removeCustomBlock(phase, day, block.id);
    }
    setEditingBlock(null);
    sounds.remove();
  };

  const handleHideBase = (baseIndex) => {
    hideBaseBlock(phase, day, baseIndex);
    sounds.remove();
  };

  const handleUndo = () => {
    const did = undo();
    if (did) sounds.click();
  };

  const handleReset = () => {
    resetDay(phase, day);
    sounds.remove();
  };

  const handleTrackBlock = (block) => {
    if (activeTimer) return;
    const started = startTimer({ block, phase, day });
    if (started) sounds.pomodoroStart();
  };

  const handleAiOptimize = () => {
    if (courses.length === 0) return;
    const suggestions = generateStudySuggestions({
      courses,
      tasks: tasks.filter((t) => !t.completed),
      checkin: null,
      getDecayInfo,
      getEffectiveConfidence,
    });
    if (suggestions.length === 0) return;
    const newBlocks = generateAiBlocks(mergedBlocks, suggestions, phase);
    if (newBlocks.length === 0) return;
    addAiBlocks(phase, day, newBlocks);
    sounds.suggest();
  };

  // Current time position in pixels (relative to gridStart)
  const nowInRange = now >= gridStart && now <= gridEnd;
  const nowTop = (now - gridStart) * pxPerMin;

  // Filter blocks to those overlapping the focus range
  const visibleBlocks = mergedBlocks.filter((b) => {
    const s = parseTime(b.start);
    const e = parseTime(b.end);
    return e > gridStart && s < gridEnd;
  });

  return (
    <div className="bg-paper dark:bg-ink border border-line rounded-sm overflow-hidden">
      {/* Header */}
      {interactive && day && (
        <div className="flex flex-col gap-2 px-4 py-2.5 border-b border-line">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">Schedule</span>
              {showActualLane && isToday && dayLogs.length > 0 && (
                <span className="font-mono text-[9px] text-muted">
                  · {dayLogs.length} tracked
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={!canUndo()}
                className="flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted border border-line rounded-sm hover:border-ink dark:hover:border-paper hover:text-ink dark:hover:text-paper transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <Undo2 size={9} />
                Undo
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted border border-line rounded-sm hover:border-red-400 hover:text-red-500 transition-colors"
              >
                <RotateCcw size={9} />
                Reset
              </button>
              <button
                onClick={handleAiOptimize}
                disabled={courses.length === 0}
                className="flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted border border-line rounded-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <Sparkles size={9} />
                AI
              </button>
              <button
                onClick={() => {
                  setNewBlockDefaults(null);
                  setShowAddNew(!showAddNew);
                  setEditingBlock(null);
                  sounds.click();
                }}
                className="flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink dark:text-paper border border-ink dark:border-paper rounded-sm hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors"
              >
                <Plus size={9} />
                Add
              </button>
            </div>
          </div>
          {/* Zoom / Focus / Fullscreen controls */}
          <ZoomControls onJumpToNow={isToday ? jumpToNow : undefined} />
        </div>
      )}

      {/* Active timer bar */}
      {interactive && showActualLane && <TimerBar />}

      {/* Lane headers */}
      {showActualLane && interactive && day && (
        <div className="flex items-center border-b border-line">
          <div style={{ width: 58 }} />
          <div className="flex-1 flex items-center">
            <div className="flex-1 px-2 py-1.5 border-r border-line">
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Planned</span>
            </div>
            <div className="flex-1 px-2 py-1.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">
                Actual{!isToday && <span className="ml-1 opacity-50">·today</span>}
              </span>
            </div>
          </div>
          <div style={{ width: 8 }} />
        </div>
      )}

      {/* Editors */}
      <AnimatePresence mode="wait">
        {showAddNew && (
          <motion.div
            key="add-editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-line overflow-hidden"
          >
            <div className="px-4 py-3">
              <BlockEditor
                block={newBlockDefaults}
                onSave={handleAddBlock}
                onDelete={() => {}}
                onClose={() => { setShowAddNew(false); setNewBlockDefaults(null); }}
                isCustom={true}
              />
            </div>
          </motion.div>
        )}
        {editingBlock && (
          <motion.div
            key="edit-editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-line overflow-hidden"
          >
            <div className="px-4 py-3">
              <BlockEditor
                block={editingBlock.block}
                onSave={handleEditSave}
                onDelete={handleDelete}
                onClose={() => setEditingBlock(null)}
                isCustom={!!editingBlock.block.custom}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Grid */}
      <div
        ref={scrollRef}
        className="relative overflow-y-auto overflow-x-hidden"
        style={{ maxHeight: isFullscreen ? 'calc(100vh - 140px)' : 650 }}
      >
        <div
          ref={gridRef}
          className="relative select-none"
          style={{ height: gridHeight }}
          onClick={handleGridClick}
        >
          {/* Hour lines + labels */}
          {hours.map((m) => {
            const isMidday = m === 720;
            const isMidnight = m === 0 || m === 1440;
            const top = (m - gridStart) * pxPerMin;
            return (
              <div key={`h-${m}`}>
                {showHourLabels && (
                  <div
                    className="absolute left-0 z-10 pointer-events-none"
                    style={{ top: top - 7 }}
                  >
                    <span className={`font-mono text-[9px] px-1 bg-paper dark:bg-ink ${
                      isMidday || isMidnight
                        ? 'text-ink dark:text-paper'
                        : 'text-muted'
                    }`}>
                      {formatTime(minutesToTime(m === 1440 ? 0 : m))}
                    </span>
                  </div>
                )}
                <div
                  className={`absolute right-0 border-t ${
                    isMidday || isMidnight
                      ? 'border-line'
                      : 'border-line/40'
                  }`}
                  style={{ top, left: 56 }}
                />
              </div>
            );
          })}

          {/* Half-hour lines (hidden at very low zoom) */}
          {showHalfHourLines && halfHours.map((m) => (
            <div
              key={`hh-${m}`}
              className="absolute right-0 border-t border-dashed border-line/25"
              style={{ top: (m - gridStart) * pxPerMin, left: 56 }}
            />
          ))}

          {/* Quarter-hour lines (visible at high zoom) */}
          {showQuarterHourLines && quarterHours.map((m) => (
            <div
              key={`qh-${m}`}
              className="absolute right-0 border-t border-dotted border-line/15"
              style={{ top: (m - gridStart) * pxPerMin, left: 56 }}
            />
          ))}

          {/* Plan lane */}
          <div
            className={`absolute top-0 bottom-0 ${showActualLane ? 'border-r border-line/50' : ''}`}
            style={{
              left: 58,
              width: showActualLane ? 'calc(50% - 33px)' : 'calc(100% - 66px)',
            }}
          >
            <div className="relative h-full pr-2">
              <AnimatePresence>
                {visibleBlocks.map((block, i) => {
                  const baseIndex = block.custom ? -1 : blocks.indexOf(block);
                  const blockRef = block.id || `${block.category}-${block.start}-${block.end}`;
                  const tracking = showActualLane && isToday && isTrackingBlock(blockRef);
                  const prediction = showActualLane && isToday
                    ? predictDuration(block.category, parseTime(block.end) - parseTime(block.start))
                    : null;
                  return (
                    <TimelineBlock
                      key={block.id || `base-${baseIndex}-${block.start}-${block.category}`}
                      block={block}
                      baseIndex={baseIndex}
                      isActive={now >= parseTime(block.start) && now < parseTime(block.end)}
                      isCustom={!!block.custom}
                      isTracking={tracking}
                      canTrack={showActualLane && isToday && !activeTimer}
                      prediction={prediction}
                      gridStart={gridStart}
                      gridEnd={gridEnd}
                      pxPerMin={pxPerMin}
                      snapGrid={SNAP_GRID}
                      minDuration={MIN_BLOCK_DURATION}
                      scrollRef={scrollRef}
                      interactive={interactive}
                      onMove={handleBlockMove}
                      onResize={handleBlockResize}
                      onTrack={handleTrackBlock}
                      onEdit={(block, baseIdx) => {
                        setEditingBlock({ block, baseIndex: baseIdx });
                        setShowAddNew(false);
                      }}
                      onHide={handleHideBase}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Actual lane */}
          {showActualLane && (
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: 'calc(50% + 25px)',
                right: 8,
              }}
            >
              <div className="relative h-full">
                <AnimatePresence>
                  {dayLogs.map((log) => (
                    <RealBlock
                      key={log.id}
                      log={log}
                      gridStart={gridStart}
                      pxPerMin={pxPerMin}
                    />
                  ))}
                </AnimatePresence>
                {showLiveTimer && (
                  <LiveTimerBlock
                    active={activeTimer}
                    gridStart={gridStart}
                    pxPerMin={pxPerMin}
                  />
                )}
                {isToday && dayLogs.length === 0 && !showLiveTimer && (
                  <div className="absolute inset-x-0 top-20 flex flex-col items-center gap-1 pointer-events-none">
                    <span className="font-mono text-[9px] text-muted text-center px-2 leading-relaxed uppercase tracking-[0.15em]">
                      Hover plan block<br />tap Track
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current time indicator — 1px amber line + 4px dot */}
          {nowInRange && (
            <div
              className="absolute z-30 pointer-events-none"
              style={{ top: nowTop, left: 52, right: 0 }}
            >
              <div className="flex items-center">
                <div
                  className="w-1 h-1 rounded-full animate-pulse flex-shrink-0 -ml-0.5"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-accent)', opacity: 0.8 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
