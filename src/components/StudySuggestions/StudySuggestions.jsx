import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useCourses } from '../../hooks/useCourses';
import { useTasks } from '../../hooks/queries/useTasks';
import { useCheckin } from '../../hooks/useCheckin';
import { usePomodoro } from '../../hooks/usePomodoro';
import { generateStudySuggestions } from '../../utils/studySuggestions';
import { sounds } from '../../utils/sounds';

const typeLabels = {
  critical: 'Critical',
  'exam-prep': 'Exam prep',
  'catch-up': 'Catch up',
  behind: 'Behind',
  review: 'Review',
};

export default function StudySuggestions() {
  const { courses, getDecayInfo, getEffectiveConfidence } = useCourses();
  const { data: tasks = [] } = useTasks();
  const checkin = useCheckin();
  const pomodoroStart = usePomodoro((s) => s.start);
  const pomodoroSetDurations = usePomodoro((s) => s.setDurations);

  const suggestions = useMemo(
    () => generateStudySuggestions({ courses, tasks, checkin, getDecayInfo, getEffectiveConfidence }),
    [courses, tasks, checkin, getDecayInfo, getEffectiveConfidence],
  );

  if (suggestions.length === 0) {
    return (
      <section className="border border-dashed border-line rounded-sm p-10 text-center">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted mb-2">No suggestions yet</h3>
        <p className="text-[12px] text-muted max-w-sm mx-auto leading-relaxed">
          Add courses and tasks to unlock smart study recommendations.
        </p>
      </section>
    );
  }

  const handleStartFocus = (suggestion) => {
    sounds.suggest();
    pomodoroSetDurations(suggestion.suggestedMinutes, 5, 15);
    pomodoroStart(suggestion.course.id, suggestion.course.name);
  };

  return (
    <section className="flex flex-col">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted mb-1">Study now</h2>
          <p className="font-mono text-[10px] text-muted">ranked by urgency</p>
        </div>
      </div>

      <div className="border border-line rounded-sm divide-y divide-line">
        {suggestions.map((s, i) => {
          const isCritical = s.type === 'critical';
          const isTop = i === 0;

          return (
            <motion.article
              key={s.course.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`px-4 py-4 ${isCritical || isTop ? 'border-l-[3px] border-l-accent pl-[13px]' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-xl text-ink dark:text-paper leading-none">{s.course.name}</span>
                    <span className={`font-mono text-[8px] uppercase tracking-[0.22em] border rounded-sm px-1.5 py-0.5 ${
                      isCritical ? 'text-accent border-accent/40' : 'text-muted border-line'
                    }`}>
                      {typeLabels[s.type]}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink dark:text-paper leading-relaxed mb-2">{s.action}</p>

                  {s.reasons.length > 0 && (
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 mb-2 font-mono text-[9px] text-muted">
                      {s.reasons.map((r, ri) => (
                        <li key={ri} className="before:content-['·'] before:mr-2 first:before:content-none first:before:mr-0">
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted tabular-nums">
                    <span>{s.suggestedMinutes}m focus</span>
                    {s.closestDeadlineDays !== null && (
                      <>
                        <span className="text-line">·</span>
                        <span>{s.closestDeadlineDays}d to deadline</span>
                      </>
                    )}
                    {s.totalNeeded > 0 && (
                      <>
                        <span className="text-line">·</span>
                        <span>{s.totalNeeded.toFixed(1)}h left</span>
                      </>
                    )}
                  </div>

                  {s.energyNote && (
                    <p className="font-mono text-[9px] text-muted italic mt-1.5">{s.energyNote}</p>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className={`font-display text-3xl tabular-nums leading-none ${isCritical ? 'text-accent' : 'text-ink dark:text-paper'}`}>
                      {s.score}
                    </div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted mt-0.5">priority</div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleStartFocus(s)}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-paper dark:text-ink bg-ink dark:bg-paper rounded-sm px-3 py-1.5 hover:bg-accent dark:hover:bg-accent hover:text-ink transition-colors"
                  >
                    <Play size={9} fill="currentColor" />
                    Focus
                  </motion.button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
