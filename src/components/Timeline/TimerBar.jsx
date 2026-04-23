import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';
import { useTimeLog } from '../../hooks/useTimeLog';
import { sounds } from '../../utils/sounds';

export default function TimerBar() {
  const active = useTimer((s) => s.active);
  const stopTimer = useTimer((s) => s.stopTimer);
  const cancelTimer = useTimer((s) => s.cancelTimer);
  const addLog = useTimeLog((s) => s.addLog);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const handleStop = () => {
    const session = stopTimer();
    if (session) {
      addLog(session);
      sounds.success();
    }
  };

  const handleCancel = () => {
    cancelTimer();
    sounds.remove();
  };

  return (
    <AnimatePresence>
      {active && (
        <TimerBarInner
          active={active}
          now={now}
          onStop={handleStop}
          onCancel={handleCancel}
        />
      )}
    </AnimatePresence>
  );
}

function TimerBarInner({ active, now, onStop, onCancel }) {
  const elapsedMs = now - active.startedAt;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const elapsedMin = elapsedSec / 60;
  const plannedMin = active.plannedDuration;
  const progress = Math.min(1, elapsedMin / plannedMin);
  const overPlanned = elapsedMin > plannedMin;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="border-b border-line overflow-hidden bg-ink dark:bg-paper"
    >
      {/* Amber progress fill */}
      <div className="relative px-4 py-2.5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="h-full"
            style={{ backgroundColor: 'var(--color-accent)', opacity: 0.12, width: `${progress * 100}%` }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          {/* Live dot */}
          <div className="w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }}>
            <div className="w-full h-full animate-ping" style={{ backgroundColor: 'var(--color-accent)', opacity: 0.5 }} />
          </div>

          {/* Task info */}
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-paper dark:text-ink truncate block">
              {active.taskName}
            </span>
            <span className="font-mono text-[9px] text-muted mt-0.5 block">
              {active.plannedStart}–{active.plannedEnd} · {plannedMin}m
            </span>
          </div>

          {/* Elapsed */}
          <div className="flex-shrink-0 text-right">
            <div className={`font-mono text-lg tabular-nums leading-none ${
              overPlanned ? 'text-accent' : 'text-paper dark:text-ink'
            }`}>
              {timeStr}
            </div>
            {overPlanned && (
              <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-accent mt-0.5">
                +{Math.round(elapsedMin - plannedMin)}m over
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={onStop}
              className="px-3 py-1.5 bg-accent text-ink font-mono text-[9px] uppercase tracking-[0.15em] rounded-sm hover:opacity-90 transition-opacity"
            >
              Stop
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 border border-paper/20 dark:border-ink/20 text-muted rounded-sm hover:border-paper/40 dark:hover:border-ink/40 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
