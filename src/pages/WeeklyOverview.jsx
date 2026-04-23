import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PhaseSelector from '../components/PhaseSelector/PhaseSelector';
import { usePhase } from '../hooks/usePhase';
import { schedules, days } from '../data/schedules';
import { categories } from '../data/categories';
import { getDurationMinutes, getWeeklyHours } from '../utils/time';

const dayAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayInitial = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const summaryCategories = [
  { keys: ['class'], label: 'Class' },
  { keys: ['study'], label: 'Study' },
  { keys: ['work'], label: 'Work' },
  { keys: ['gym', 'pe'], label: 'Gym' },
  { keys: ['chinese'], label: 'Chinese' },
  { keys: ['business'], label: 'Business' },
  { keys: ['cook', 'canteen', 'mealprep'], label: 'Food' },
  { keys: ['free'], label: 'Free' },
  { keys: ['sleep', 'wake'], label: 'Sleep' },
];

export default function WeeklyOverview() {
  const phase = usePhase((s) => s.phase);
  const navigate = useNavigate();
  const schedule = schedules[phase];

  const weekTotal = days.reduce(
    (acc, d) => acc + schedule[d].reduce((a, b) => a + getDurationMinutes(b.start, b.end), 0),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8"
    >
      <header className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted mb-1">Weekly Overview</div>
            <h1 className="font-display text-5xl text-ink dark:text-paper leading-none capitalize">{phase} week</h1>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted tabular-nums">
            {Math.round(weekTotal / 60)}h scheduled
          </div>
        </div>
        <PhaseSelector />
      </header>

      {/* Grid */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="grid grid-cols-7 gap-px bg-line border border-line rounded-sm min-w-[720px]">
          {days.map((day, di) => {
            const dayMins = schedule[day].reduce((a, b) => a + getDurationMinutes(b.start, b.end), 0);
            return (
              <motion.button
                key={`${phase}-${day}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: di * 0.03 }}
                onClick={() => navigate(`/day/${day}`)}
                className="bg-paper dark:bg-ink text-left min-h-[360px] flex flex-col group hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-baseline justify-between px-2 pt-3 pb-2 border-b border-line">
                  <div>
                    <div className="font-display text-xl text-ink dark:text-paper leading-none">{dayInitial[di]}</div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted mt-0.5">{dayAbbr[di]}</div>
                  </div>
                  <div className="font-mono text-[9px] text-muted tabular-nums">{Math.round(dayMins / 60)}h</div>
                </div>
                <div className="flex-1 flex flex-col gap-[1px] p-[3px]">
                  {schedule[day].map((block, bi) => {
                    const cat = categories[block.category];
                    const dur = getDurationMinutes(block.start, block.end);
                    const h = Math.max(3, dur * 0.32);
                    return (
                      <div
                        key={bi}
                        style={{ height: h, borderLeftColor: cat?.color }}
                        className="border-l-2 bg-line/40 dark:bg-line/10 flex items-center px-1.5 overflow-hidden group-hover:bg-line/60 dark:group-hover:bg-line/20 transition-colors"
                      >
                        {dur >= 40 && (
                          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted truncate">
                            {cat?.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Weekly totals */}
      <section className="border border-line rounded-sm">
        <header className="px-5 py-3 border-b border-line flex items-baseline justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Weekly Totals</span>
          <span className="font-mono text-[9px] text-muted">by category</span>
        </header>
        <div className="grid grid-cols-3 md:grid-cols-5 divide-x divide-y divide-line">
          {summaryCategories.map(({ keys, label }) => {
            const hrs = getWeeklyHours(schedule, keys);
            const cat = categories[keys[0]];
            return (
              <div key={label} className="px-4 py-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat?.color, filter: 'saturate(0.7)' }}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">{label}</span>
                </div>
                <div className="font-display text-3xl text-ink dark:text-paper leading-none tabular-nums">
                  {hrs}
                  <span className="font-mono text-[10px] text-muted ml-1">h</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
