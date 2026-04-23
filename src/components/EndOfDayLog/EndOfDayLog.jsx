import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useCheckin } from '../../hooks/useCheckin';
import { usePhase } from '../../hooks/usePhase';
import { schedules } from '../../data/schedules';
import { categories } from '../../data/categories';
import { getTodayName, formatTime } from '../../utils/time';

export default function EndOfDayLog() {
  const [expanded, setExpanded] = useState(false);
  const phase = usePhase((s) => s.phase);
  const { completedBlocks, logBlockCompletion, submitEndOfDay, getCompletionRate, history } = useCheckin();

  const today = getTodayName();
  const blocks = schedules[phase]?.[today] || [];

  // Filter to only meaningful blocks (study, work, gym, chinese, business)
  const trackableCategories = ['study', 'work', 'gym', 'chinese', 'business', 'class', 'pe', 'mealprep'];
  const trackableBlocks = blocks
    .map((b, i) => ({ ...b, originalIndex: i }))
    .filter((b) => trackableCategories.includes(b.category));

  const completionRate = getCompletionRate();
  const lastEntry = history.length > 0 ? history[history.length - 1] : null;
  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyLogged = lastEntry?.date === todayKey;

  if (trackableBlocks.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#111] rounded-sm border border-line dark:border-[#222] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-paper/40 dark:hover:bg-[#191919] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck size={12} className="text-muted" strokeWidth={1.5} />
          <h3 className="text-[10px] font-mono font-medium uppercase tracking-[0.25em] text-muted">End-of-Day Log</h3>
        </div>
        <div className="flex items-center gap-2">
          {completedBlocks.length > 0 && (
            <span className="text-[10px] font-mono text-muted tabular-nums">
              {completedBlocks.filter(Boolean).length}/{trackableBlocks.length}
            </span>
          )}
          {expanded ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <p className="text-[11px] text-muted mb-4">Quick tick — which blocks did you actually complete today?</p>

              <div className="flex flex-col divide-y divide-line dark:divide-[#222]">
                {trackableBlocks.map((block, i) => {
                  const cat = categories[block.category];
                  const isChecked = completedBlocks[i] === true;
                  return (
                    <button
                      key={`${block.start}-${block.category}`}
                      onClick={() => logBlockCompletion(i, !isChecked)}
                      className="flex items-center gap-3 py-2.5 text-left transition-colors hover:bg-paper/40 dark:hover:bg-[#191919]"
                    >
                      <div className={`flex-shrink-0 w-4 h-4 border flex items-center justify-center transition-all ${
                        isChecked
                          ? 'bg-ink dark:bg-paper border-ink dark:border-paper text-paper dark:text-ink'
                          : 'border-line dark:border-[#333]'
                      }`}>
                        {isChecked && <Check size={10} strokeWidth={2.5} />}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <span className={`text-xs ${isChecked ? 'line-through text-muted' : 'text-ink dark:text-paper'}`}>
                          {cat?.label}
                        </span>
                        <span className="text-[9px] font-mono text-muted tabular-nums">
                          {formatTime(block.start)}–{formatTime(block.end)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {completedBlocks.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Completion</span>
                    <span className="font-mono text-xs font-medium tabular-nums">{completionRate}%</span>
                  </div>
                  <div className="h-px bg-line dark:bg-[#222] overflow-hidden mb-4">
                    <div
                      className="h-full bg-accent transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  {!alreadyLogged && (
                    <button
                      onClick={submitEndOfDay}
                      className="w-full py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] bg-ink dark:bg-paper text-paper dark:text-ink hover:opacity-90 transition-opacity"
                    >
                      Log Day Complete
                    </button>
                  )}
                  {alreadyLogged && (
                    <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-accent">Today's log saved</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
