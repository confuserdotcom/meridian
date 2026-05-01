import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, Target } from 'lucide-react';
import { useBigThree } from '../../hooks/useBigThree';
import { useStreak } from '../../hooks/useStreak';
import { sounds } from '../../utils/sounds';

export default function BigThree() {
  const { tasks, ensureToday, setTask, toggleTask } = useBigThree();
  const checkAndUpdate = useStreak((s) => s.checkAndUpdate);

  useEffect(() => {
    ensureToday();
  }, [ensureToday]);

  useEffect(() => {
    const completed = tasks.filter((t) => t.done).length;
    checkAndUpdate(completed);
  }, [tasks, checkAndUpdate]);

  const completed = tasks.filter((t) => t.done).length;

  return (
    <div data-tour="bigthree" className="bg-white dark:bg-[#111] rounded-sm border border-line dark:border-[#222] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={12} className="text-muted" strokeWidth={1.5} />
          <h3 className="text-[10px] font-mono font-medium uppercase tracking-[0.25em] text-muted">Big 3 Today</h3>
        </div>
        <span className="font-mono text-[10px] text-muted tabular-nums">{completed}/3</span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={() => { toggleTask(i); task.done ? sounds.uncheck() : sounds.check(); }}
              className={`flex-shrink-0 w-4 h-4 border flex items-center justify-center transition-all ${
                task.done
                  ? 'bg-ink dark:bg-paper border-ink dark:border-paper text-paper dark:text-ink'
                  : 'border-line dark:border-[#333] hover:border-ink dark:hover:border-paper'
              }`}
            >
              {task.done && <Check size={10} strokeWidth={2.5} />}
            </button>
            <input
              type="text"
              value={task.text}
              onChange={(e) => setTask(i, e.target.value)}
              placeholder={`Task ${i + 1}`}
              className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60 ${
                task.done ? 'line-through text-muted' : ''
              }`}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
