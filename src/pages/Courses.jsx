import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock } from 'lucide-react';
import { useCourses } from '../hooks/useCourses';

const DECAY_THRESHOLD_DAYS_DISPLAY = 5;

export default function Courses() {
  const {
    courses, addCourse, removeCourse, logStudyTime,
    submitWeeklyRating, getDecayInfo, getEffectiveConfidence,
  } = useCourses();

  const [showAdd, setShowAdd] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', importance: 3, confidence: 50, hoursTarget: 5 });
  const [weeklyRatings, setWeeklyRatings] = useState({});
  const [logId, setLogId] = useState(null);
  const [logHours, setLogHours] = useState('0.5');

  const handleAdd = () => {
    if (!newCourse.name.trim()) return;
    addCourse(newCourse);
    setNewCourse({ name: '', importance: 3, confidence: 50, hoursTarget: 5 });
    setShowAdd(false);
  };

  const handleWeeklySubmit = () => {
    Object.entries(weeklyRatings).forEach(([id, { rating, note }]) => {
      submitWeeklyRating(id, rating, note || '');
    });
    setWeeklyRatings({});
    setShowWeekly(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted mb-1">Courses</div>
          <h1 className="font-display text-5xl text-ink dark:text-paper leading-none">Confidence ledger</h1>
          <p className="font-mono text-[10px] text-muted mt-2">
            {courses.length} tracked · decay after {DECAY_THRESHOLD_DAYS_DISPLAY} untouched days
          </p>
        </div>
        <div className="flex gap-4">
          <GhostBtn onClick={() => setShowWeekly(true)}>Weekly check-in</GhostBtn>
          <SolidBtn onClick={() => setShowAdd(true)}><Plus size={10} /> New course</SolidBtn>
        </div>
      </header>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="border border-line rounded-sm p-5"
          >
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">Add course</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-ink dark:hover:text-paper">
                <X size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FieldLabel>Course name</FieldLabel>
                <input
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="Advanced Mathematics"
                  className="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-display text-2xl text-ink dark:text-paper placeholder:text-muted/50 transition-colors"
                />
              </div>
              <RangeField
                label={`Importance ${newCourse.importance}/5`}
                min={1} max={5} step={1} value={newCourse.importance}
                onChange={(v) => setNewCourse({ ...newCourse, importance: v })}
              />
              <RangeField
                label={`Weekly target ${newCourse.hoursTarget}h`}
                min={1} max={20} step={0.5} value={newCourse.hoursTarget}
                onChange={(v) => setNewCourse({ ...newCourse, hoursTarget: v })}
              />
              <div className="col-span-2">
                <RangeField
                  label={`Starting confidence ${newCourse.confidence}%`}
                  min={0} max={100} step={5} value={newCourse.confidence}
                  onChange={(v) => setNewCourse({ ...newCourse, confidence: v })}
                />
              </div>
            </div>
            <SolidBtn onClick={handleAdd} className="mt-5 w-full justify-center">Commit course</SolidBtn>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWeekly && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="border border-line rounded-sm"
          >
            <header className="px-5 py-3.5 border-b border-line flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Weekly check-in</div>
                <p className="font-mono text-[10px] text-muted mt-1">Rate 1–5. Feeds scheduling weights.</p>
              </div>
              <button onClick={() => setShowWeekly(false)} className="text-muted hover:text-ink dark:hover:text-paper">
                <X size={12} />
              </button>
            </header>
            <div className="divide-y divide-line">
              {courses.length === 0 && (
                <div className="px-5 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  No courses to rate
                </div>
              )}
              {courses.map((c) => (
                <div key={c.id} className="px-5 py-4 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-xl text-ink dark:text-paper">{c.name}</span>
                    <span className="font-mono text-[10px] text-muted tabular-nums">
                      {weeklyRatings[c.id]?.rating ? `${weeklyRatings[c.id].rating * 20}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-5">
                    {[1, 2, 3, 4, 5].map((r) => {
                      const active = weeklyRatings[c.id]?.rating === r;
                      return (
                        <button
                          key={r}
                          onClick={() => setWeeklyRatings({ ...weeklyRatings, [c.id]: { ...weeklyRatings[c.id], rating: r } })}
                          className={`font-display text-2xl tabular-nums transition-colors ${
                            active ? 'text-accent' : 'text-muted/50 hover:text-ink dark:hover:text-paper'
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    placeholder="Optional note..."
                    value={weeklyRatings[c.id]?.note || ''}
                    onChange={(e) => setWeeklyRatings({ ...weeklyRatings, [c.id]: { ...weeklyRatings[c.id], note: e.target.value } })}
                    className="w-full bg-transparent border-b border-line focus:border-accent outline-none py-1.5 text-[12px] placeholder:text-muted/50 transition-colors"
                  />
                </div>
              ))}
            </div>
            {courses.length > 0 && (
              <div className="px-5 py-3 border-t border-line">
                <SolidBtn onClick={handleWeeklySubmit} className="w-full justify-center">Submit ratings</SolidBtn>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {courses.length === 0 ? (
        <div className="border border-dashed border-line rounded-sm p-12 text-center">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted mb-2">No courses yet</h3>
          <p className="text-[12px] text-muted max-w-sm mx-auto leading-relaxed">
            Add a course to track confidence, weekly hours, and decay-from-neglect.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line rounded-sm overflow-hidden">
          {courses.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              index={i}
              effective={getEffectiveConfidence(course)}
              decay={getDecayInfo(course)}
              logOpen={logId === course.id}
              logHours={logHours}
              setLogHours={setLogHours}
              onLogOpen={() => { setLogId(course.id); setLogHours('0.5'); }}
              onLogClose={() => setLogId(null)}
              onLogSave={() => { logStudyTime(course.id, Number(logHours)); setLogId(null); }}
              onRemove={() => removeCourse(course.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CourseCard({ course, index, effective, decay, logOpen, logHours, setLogHours, onLogOpen, onLogClose, onLogSave, onRemove }) {
  const hoursPercent = course.hoursTarget > 0
    ? Math.min(100, Math.round((course.hoursLogged / course.hoursTarget) * 100))
    : 0;
  const conf = effective;
  const confTone = conf >= 70 ? 'text-ink dark:text-paper' : conf >= 45 ? 'text-accent' : 'text-ink dark:text-paper';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-paper dark:bg-ink p-5 flex flex-col gap-4 group"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-1">
            Course {String(index + 1).padStart(2, '0')}
          </div>
          <h3 className="font-display text-2xl text-ink dark:text-paper leading-tight">{course.name}</h3>
          <div className="flex items-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, si) => (
              <span
                key={si}
                className={`w-1.5 h-1.5 rounded-full ${si < course.importance ? 'bg-accent' : 'bg-line'}`}
              />
            ))}
            <span className="font-mono text-[9px] text-muted ml-2 tabular-nums">
              weight {course.importance}
            </span>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 font-mono text-[9px] uppercase tracking-[0.18em] text-muted hover:text-ink dark:hover:text-paper transition-all"
        >
          remove
        </button>
      </header>

      {/* Confidence */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Understanding</span>
        <div className="flex items-baseline gap-1">
          <span className={`font-display text-4xl tabular-nums leading-none ${confTone}`}>{conf}</span>
          <span className="font-mono text-[10px] text-muted">%</span>
        </div>
      </div>
      <Bar value={conf} max={100} tone={conf >= 45 ? 'accent' : 'ink'} />

      {/* Hours */}
      <div className="flex items-baseline justify-between pt-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Hours this week</span>
        <span className="font-mono text-[10px] text-muted tabular-nums">
          {course.hoursLogged}<span className="text-muted/60"> / {course.hoursTarget}</span>
        </span>
      </div>
      <Bar value={hoursPercent} max={100} tone="ink" />

      {/* Decay */}
      {decay.decayed ? (
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent">Decaying</span>
          <span className="font-mono text-[10px] text-muted tabular-nums">
            −{decay.decayAmount}% · {decay.daysSince}d untouched
          </span>
        </div>
      ) : decay.daysSince !== null && decay.daysSince <= DECAY_THRESHOLD_DAYS_DISPLAY ? (
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Active</span>
          <span className="font-mono text-[10px] text-muted tabular-nums">studied {decay.daysSince}d ago</span>
        </div>
      ) : (
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Dormant</span>
          <span className="font-mono text-[10px] text-muted">no sessions logged</span>
        </div>
      )}

      {/* Log */}
      {logOpen ? (
        <div className="flex items-center gap-3">
          <input
            type="number" min="0.5" step="0.5" value={logHours}
            onChange={(e) => setLogHours(e.target.value)}
            className="w-20 bg-transparent border-b border-accent focus:border-accent outline-none py-1 font-mono text-sm text-ink dark:text-paper"
          />
          <span className="font-mono text-[10px] text-muted">hours</span>
          <button
            onClick={onLogSave}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper dark:text-ink bg-ink dark:bg-paper rounded-sm px-3 py-1.5 hover:bg-accent dark:hover:bg-accent hover:text-ink transition-colors"
          >
            Log
          </button>
          <button onClick={onLogClose} className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted hover:text-ink dark:hover:text-paper">
            cancel
          </button>
        </div>
      ) : (
        <button
          onClick={onLogOpen}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted hover:text-accent transition-colors self-start"
        >
          <Clock size={10} /> Log study time
        </button>
      )}
    </motion.article>
  );
}

function Bar({ value, max = 100, tone = 'ink' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-px bg-line relative">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`absolute left-0 top-0 h-0.5 -translate-y-1/4 ${
          tone === 'accent' ? 'bg-accent' : 'bg-ink dark:bg-paper'
        }`}
      />
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted block mb-2">{children}</label>;
}

function RangeField({ label, min, max, step, value, onChange }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full meridian-range"
      />
      <style>{`
        .meridian-range { -webkit-appearance: none; appearance: none; height: 1px; background: var(--color-border); outline: none; }
        .meridian-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 10px; height: 10px; background: var(--color-accent); border-radius: 0; cursor: pointer; }
        .meridian-range::-moz-range-thumb { width: 10px; height: 10px; background: var(--color-accent); border: 0; border-radius: 0; cursor: pointer; }
      `}</style>
    </div>
  );
}

function SolidBtn({ onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-paper dark:text-ink bg-ink dark:bg-paper rounded-sm px-4 py-2 hover:bg-accent dark:hover:bg-accent hover:text-ink transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted border border-line rounded-sm px-3 py-2 hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper transition-colors"
    >
      {children}
    </button>
  );
}
