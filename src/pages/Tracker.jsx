import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useTimeLog } from '../hooks/useTimeLog';
import { categories } from '../data/categories';
import { formatTime } from '../utils/time';

export default function Tracker() {
  const logs = useTimeLog((s) => s.logs);
  const removeLog = useTimeLog((s) => s.removeLog);
  const clearAll = useTimeLog((s) => s.clearAll);
  const getDateSummary = useTimeLog((s) => s.getDateSummary);
  const predictDuration = useTimeLog((s) => s.predictDuration);

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const datesWithLogs = useMemo(() => {
    const grouped = {};
    logs.forEach((l) => {
      if (!grouped[l.date]) grouped[l.date] = [];
      grouped[l.date].push(l);
    });
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({ date, logs: grouped[date] }));
  }, [logs]);

  const categoryStats = useMemo(() => {
    const stats = {};
    logs.forEach((l) => {
      if (!stats[l.category]) {
        stats[l.category] = { category: l.category, sessions: 0, planned: 0, actual: 0 };
      }
      stats[l.category].sessions += 1;
      stats[l.category].planned += l.plannedDuration;
      stats[l.category].actual += l.actualDuration;
    });
    return Object.values(stats)
      .map((s) => ({
        ...s,
        ratio: s.planned > 0 ? s.actual / s.planned : 1,
        prediction: predictDuration(s.category, 60),
      }))
      .sort((a, b) => b.actual - a.actual);
  }, [logs, predictDuration]);

  const daySummary = useMemo(() => getDateSummary(selectedDate), [selectedDate, getDateSummary]);
  const selectedLogs = useMemo(
    () => logs.filter((l) => l.date === selectedDate).sort((a, b) => a.actualStart.localeCompare(b.actualStart)),
    [logs, selectedDate],
  );

  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((s, l) => s + l.actualDuration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Time Tracker</h1>
        {logs.length > 0 && (
          <button
            onClick={() => {
              if (confirm(`Delete all ${logs.length} tracked sessions? This cannot be undone.`)) {
                clearAll();
              }
            }}
            className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted border border-line rounded-sm px-2 py-1 hover:border-ink dark:hover:border-paper hover:text-ink dark:hover:text-paper transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stat cards — Cormorant 48px value, 1px border */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Sessions" value={totalSessions} />
            <StatCard label="Total tracked" value={`${totalHours}h`} />
            <StatCard label="Days tracked" value={datesWithLogs.length} />
            <StatCard label="Categories" value={categoryStats.length} />
          </div>

          {/* Day breakdown */}
          <div className="border border-line rounded-sm overflow-hidden">
            {/* Day picker header */}
            <div className="px-4 py-2.5 border-b border-line flex items-center justify-between flex-wrap gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">Day Breakdown</span>
              <div className="flex items-center overflow-x-auto">
                {datesWithLogs.slice(0, 7).map(({ date }) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] whitespace-nowrap transition-colors ${
                      selectedDate === date
                        ? 'bg-ink dark:bg-paper text-paper dark:text-ink'
                        : 'text-muted hover:text-ink dark:hover:text-paper'
                    }`}
                  >
                    {date === today ? 'Today' : formatDateShort(date)}
                  </button>
                ))}
              </div>
            </div>

            {/* Day summary */}
            <DaySummaryRow summary={daySummary} />

            {/* Log rows — divide-y table-style */}
            <AnimatePresence mode="popLayout">
              {selectedLogs.length === 0 ? (
                <div className="px-4 py-8 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
                  No sessions on this day
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {selectedLogs.map((log) => (
                    <LogRow key={log.id} log={log} onDelete={() => removeLog(log.id)} />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Patterns by category */}
          <div className="border border-line rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
                Patterns by category
              </span>
              <span className="ml-auto font-mono text-[9px] text-muted">from your history</span>
            </div>
            <div className="divide-y divide-line">
              {categoryStats.map((s) => (
                <CategoryRow key={s.category} stat={s} />
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border border-line rounded-sm p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted mb-1">{label}</div>
      <div className="font-display text-5xl text-ink dark:text-paper leading-none">{value}</div>
    </div>
  );
}

function DaySummaryRow({ summary }) {
  const variance = summary.variance;
  return (
    <div className="border-b border-line px-4 py-3 grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted mb-0.5">Planned</div>
        <div className="font-mono text-sm tabular-nums text-ink dark:text-paper">{summary.planned}m</div>
      </div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted mb-0.5">Actual</div>
        <div className="font-mono text-sm tabular-nums text-ink dark:text-paper">{summary.actual}m</div>
      </div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted mb-0.5">Delta</div>
        <div className={`font-mono text-sm tabular-nums ${
          variance > 5 ? 'text-accent' : variance < -5 ? 'text-ink dark:text-paper' : 'text-muted'
        }`}>
          {variance > 0 ? '+' : ''}{variance}m
        </div>
      </div>
    </div>
  );
}

function LogRow({ log, onDelete }) {
  const cat = categories[log.category] || categories.transit;
  const variance = log.actualDuration - log.plannedDuration;
  const varColor = variance > 5 ? 'text-accent' : variance < -5 ? 'text-muted' : 'text-muted';

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-line/20 transition-colors"
    >
      {/* 6px category dot — desaturated */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cat.color, filter: 'saturate(0.7)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate text-ink dark:text-paper">{log.taskName}</div>
        <div className="font-mono text-[9px] text-muted mt-0.5">
          {formatTime(log.actualStart)}–{formatTime(log.actualEnd)} · plan {log.plannedStart}–{log.plannedEnd}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <div className="font-mono text-[11px] tabular-nums text-ink dark:text-paper">{log.actualDuration}m</div>
          <div className="font-mono text-[9px] text-muted tabular-nums">plan {log.plannedDuration}m</div>
        </div>
        <div className={`font-mono text-[10px] tabular-nums ${varColor} w-8 text-right`}>
          {variance > 0 ? '+' : ''}{variance}
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-ink dark:hover:text-paper transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

function CategoryRow({ stat }) {
  const cat = categories[stat.category] || categories.transit;
  const max = Math.max(stat.actual, stat.planned, 1);
  const ratioLabel = stat.ratio > 1
    ? `+${Math.round((stat.ratio - 1) * 100)}% over`
    : stat.ratio < 1
      ? `${Math.round((1 - stat.ratio) * 100)}% under`
      : 'on plan';

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      {/* 6px category dot — desaturated */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: cat.color, filter: 'saturate(0.7)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-[11px] font-medium text-ink dark:text-paper">{cat.label}</span>
          <span className="font-mono text-[9px] text-muted">{stat.sessions} sessions · {ratioLabel}</span>
        </div>
        {/* Actual-vs-planned: 2px lines */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted w-6">act</span>
            <div className="flex-1 h-px bg-line relative">
              <div
                className="absolute left-0 top-0 h-0.5 -translate-y-[25%]"
                style={{
                  width: `${(stat.actual / max) * 100}%`,
                  backgroundColor: cat.color,
                  filter: 'saturate(0.7)',
                }}
              />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-muted w-8 text-right">{stat.actual}m</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted w-6">pln</span>
            <div className="flex-1 h-px bg-line relative">
              <div
                className="absolute left-0 top-0 h-0.5 -translate-y-[25%]"
                style={{
                  width: `${(stat.planned / max) * 100}%`,
                  backgroundColor: 'var(--color-muted)',
                  opacity: 0.4,
                }}
              />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-muted w-8 text-right">{stat.planned}m</span>
          </div>
        </div>
      </div>
      {/* AI prediction — muted only */}
      <div className="flex-shrink-0 text-right pt-0.5">
        <div className="font-mono text-[9px] text-muted">{stat.prediction.confidence}% conf</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-line rounded-sm p-10 text-center">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted mb-2">
        No tracked sessions yet
      </h3>
      <p className="text-[11px] text-muted max-w-md mx-auto leading-relaxed">
        Go to the Schedule, hover a planned block, tap Track. Your actual duration logs automatically when you stop.
      </p>
    </div>
  );
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
