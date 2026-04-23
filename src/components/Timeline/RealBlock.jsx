import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { categories } from '../../data/categories';
import { parseTime } from '../../utils/time';

const MIN_HEIGHT_PX = 22;

/**
 * Completed tracked session — the "Real" counterpart to a TimelineBlock.
 * Rendered in the Actual lane. Visually distinct: dashed left border,
 * muted/translucent background.
 */
export default function RealBlock({ log, gridStart, pxPerMin }) {
  const cat = categories[log.category] || categories.transit;
  const startMin = parseTime(log.actualStart);
  const endMin = parseTime(log.actualEnd);
  const duration = Math.max(1, endMin - startMin);

  const top = (startMin - gridStart) * pxPerMin;
  const height = Math.max(MIN_HEIGHT_PX, duration * pxPerMin);
  const compact = duration < 22;

  const variance = log.actualDuration - log.plannedDuration;
  const varianceColor =
    variance > 5 ? 'text-amber-600 dark:text-amber-400'
    : variance < -5 ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-stone-500 dark:text-stone-400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="absolute left-0 right-0 rounded-sm overflow-hidden select-none"
      style={{
        top,
        height,
        borderLeft: `3px dashed ${cat.color}`,
      }}
    >
      <div
        className="dark:hidden h-full px-1.5 py-0.5"
        style={{ backgroundColor: cat.bg + 'B3' }}
      >
        <RealBlockContent log={log} cat={cat} compact={compact} varianceColor={varianceColor} />
      </div>
      <div
        className="hidden dark:block h-full px-1.5 py-0.5"
        style={{ backgroundColor: cat.darkBg + '99' }}
      >
        <RealBlockContent log={log} cat={cat} compact={compact} varianceColor={varianceColor} dark />
      </div>
    </motion.div>
  );
}

function RealBlockContent({ log, cat, compact, varianceColor, dark }) {
  const variance = log.actualDuration - log.plannedDuration;
  return (
    <div className="h-full flex flex-col justify-center min-w-0">
      <div className="flex items-center gap-1 min-w-0">
        <Clock size={8} className="text-stone-400 dark:text-stone-500 flex-shrink-0" />
        <span
          className={`font-semibold truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}
          style={{ color: dark ? cat.darkColor : cat.color }}
        >
          {log.taskName}
        </span>
      </div>
      {!compact && (
        <div className="flex items-center gap-1 mt-0.5 font-mono text-[8px] tabular-nums">
          <span className="text-stone-500 dark:text-stone-400">{log.actualDuration}m</span>
          <span className="text-stone-300 dark:text-stone-600">/</span>
          <span className="text-stone-400 dark:text-stone-500">{log.plannedDuration}m plan</span>
          {Math.abs(variance) >= 5 && (
            <span className={`ml-auto ${varianceColor}`}>
              {variance > 0 ? '+' : ''}{variance}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Live growing block that tracks the currently-running timer in real time.
 * Updates every second.
 */
export function LiveTimerBlock({ active, gridStart, pxPerMin }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cat = categories[active.category] || categories.transit;
  const elapsedMin = Math.max(1, (now - active.startedAt) / 60000);

  const nowDate = new Date(now);
  const endMin = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60;
  const startMin = Math.max(0, endMin - elapsedMin);

  const top = (startMin - gridStart) * pxPerMin;
  const height = Math.max(MIN_HEIGHT_PX, elapsedMin * pxPerMin);
  const overPlanned = elapsedMin > active.plannedDuration;

  const elapsedWhole = Math.floor(elapsedMin);
  const seconds = Math.floor((now - active.startedAt) / 1000) % 60;

  return (
    <motion.div
      layout
      className="absolute left-0 right-0 rounded-md overflow-hidden select-none z-20"
      style={{
        top,
        height,
        borderLeft: `3px solid ${cat.color}`,
        background: `repeating-linear-gradient(-45deg, ${cat.bg}CC, ${cat.bg}CC 4px, ${cat.bg}66 4px, ${cat.bg}66 8px)`,
        boxShadow: `0 0 0 1px ${cat.color}40, 0 2px 8px ${cat.color}33`,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="h-full px-1.5 py-0.5 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          <span
            className="text-[10px] font-semibold truncate"
            style={{ color: cat.color }}
          >
            {active.taskName}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 font-mono text-[8px] tabular-nums">
          <span className={overPlanned ? 'text-amber-600 dark:text-amber-400' : 'text-stone-600 dark:text-stone-300'}>
            {elapsedWhole}m {String(seconds).padStart(2, '0')}s
          </span>
          <span className="text-stone-400">/</span>
          <span className="text-stone-400">{active.plannedDuration}m</span>
          {overPlanned && (
            <span className="ml-auto text-amber-600 dark:text-amber-400 font-semibold">
              OVER
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
