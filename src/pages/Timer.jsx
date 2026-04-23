import { motion } from 'framer-motion';
import CircularPomodoro from '../components/CircularPomodoro/CircularPomodoro';
import { usePomodoro } from '../hooks/usePomodoro';
import { useStreak } from '../hooks/useStreak';

export default function Timer() {
  const sessionsCompleted = usePomodoro((s) => s.sessionsCompleted);
  const streak = useStreak((s) => s.count);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Focus</h1>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          {streak > 0 && <span>{streak}d streak</span>}
          <span>{sessionsCompleted} sessions</span>
        </div>
      </div>

      {/* Circular Pomodoro */}
      <div className="flex justify-center py-4">
        <CircularPomodoro />
      </div>
    </motion.div>
  );
}
