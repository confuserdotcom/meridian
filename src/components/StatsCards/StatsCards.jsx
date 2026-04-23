import { motion } from 'framer-motion';
import { usePhase } from '../../hooks/usePhase';
import { schedules } from '../../data/schedules';
import { getWeeklyHours } from '../../utils/time';

const stats = [
  { label: 'Study', keys: ['study', 'class'] },
  { label: 'Work', keys: ['work'] },
  { label: 'Gym', keys: ['gym', 'pe'] },
  { label: 'Chinese', keys: ['chinese'] },
  { label: 'Business', keys: ['business'] },
  { label: 'Free', keys: ['free'] },
];

export default function StatsCards() {
  const phase = usePhase((s) => s.phase);
  const schedule = schedules[phase];

  return (
    <div className="bg-white dark:bg-[#111] rounded-sm border border-line dark:border-[#222] overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-line dark:border-[#222]">
        <h3 className="text-[10px] font-mono font-medium uppercase tracking-[0.25em] text-muted">Weekly Hours</h3>
      </div>
      <div className="grid grid-cols-3 divide-x divide-y divide-line dark:divide-[#222]">
        {stats.map(({ label, keys }, i) => {
          const hours = getWeeklyHours(schedule, keys);
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="px-3 py-4 text-center"
            >
              <motion.div
                key={`${phase}-${label}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-display text-3xl leading-none text-ink dark:text-paper tabular-nums"
              >
                {hours}
              </motion.div>
              <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted mt-1.5">{label}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
