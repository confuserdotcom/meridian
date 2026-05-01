import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, Trash2 } from 'lucide-react';
import { useCheckin } from '../hooks/useCheckin';
import { useTasks, useAddTask, useDeleteTask, useToggleTask, getUrgencyScore, getAtRiskTasks, isRescueMode as checkRescueMode } from '../hooks/queries/useTasks';
import { useCourses } from '../hooks/useCourses';
import StudySuggestions from '../components/StudySuggestions/StudySuggestions';
import Pomodoro from '../components/Pomodoro/Pomodoro';
import { sounds } from '../utils/sounds';

const moods = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Okay' },
  { key: 'high', label: 'Fired' },
];

const energyLevels = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Mid' },
  { key: 'high', label: 'High' },
];

export default function Coach() {
  const checkin = useCheckin();
  const { data: tasks = [] } = useTasks();
  const { mutate: addTask } = useAddTask();
  const { mutate: removeTask } = useDeleteTask();
  const { mutate: toggleComplete } = useToggleTask();
  const { courses, getEffectiveConfidence, getDecayInfo } = useCourses();

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', courseId: '', deadline: '', estimatedHours: 2, isExam: false });
  const [checkinStep, setCheckinStep] = useState(0);
  const [tempCheckin, setTempCheckin] = useState({ mood: null, energy: null, hours: 5 });

  const hasCheckedIn = checkin.hasCheckedInToday();
  const rescueMode = checkRescueMode(tasks);
  const atRisk = getAtRiskTasks(tasks);
  const activeTasks = tasks.filter((t) => !t.completed).sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));
  const completedTasks = tasks.filter((t) => t.completed);

  const insights = useMemo(() => {
    const msgs = [];
    if (rescueMode) {
      msgs.push({ tier: 'critical', text: 'Rescue mode. 3+ tasks at risk. Triage by damage-if-missed. Consider extensions on low-priority items.' });
    }
    const decayingCourses = courses.filter((c) => getDecayInfo(c).decayed);
    if (decayingCourses.length > 0) {
      msgs.push({ tier: 'warn', text: `${decayingCourses.map((c) => c.name).join(', ')} decaying from neglect. 30 min review stops the slide.` });
    }
    if (atRisk.length > 0 && !rescueMode) {
      msgs.push({ tier: 'warn', text: `${atRisk.length} task${atRisk.length > 1 ? 's' : ''} near deadline, <50% progress. Prioritize ${atRisk[0]?.title || 'these'} today.` });
    }
    const lowConfidence = courses.filter((c) => getEffectiveConfidence(c) < 40);
    if (lowConfidence.length > 0) {
      msgs.push({ tier: 'info', text: `Low confidence: ${lowConfidence.map((c) => c.name).join(', ')}. Schedule extra review this week.` });
    }
    if (hasCheckedIn && checkin.energy === 'low') {
      msgs.push({ tier: 'info', text: 'Low energy day. Light review only. Save deep problem-solving for high-energy windows.' });
    }
    if (msgs.length === 0) {
      msgs.push({ tier: 'good', text: 'On track. Keep momentum. Consistency beats intensity.' });
    }
    return msgs;
  }, [courses, atRisk, rescueMode, hasCheckedIn, checkin.energy, getDecayInfo, getEffectiveConfidence]);

  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.deadline) return;
    addTask(newTask);
    setNewTask({ title: '', courseId: '', deadline: '', estimatedHours: 2, isExam: false });
    setShowAddTask(false);
  };

  const handleCheckinSubmit = () => {
    checkin.submitCheckin(tempCheckin.mood, tempCheckin.energy, tempCheckin.hours);
    setCheckinStep(0);
    sounds.success();
  };

  const urgencyLabel = (score) => {
    if (score >= 80) return 'CRIT';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MID';
    return 'LOW';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10">
      {/* Header */}
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted mb-1">Study Coach</div>
          <h1 className="font-display text-5xl text-ink dark:text-paper leading-none">Today's brief</h1>
        </div>
      </header>

      {/* Rescue banner — 3px accent stripe, plain text */}
      <AnimatePresence>
        {rescueMode && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="border-l-[3px] border-accent pl-4 py-2"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent mb-1">Rescue mode active</div>
            <p className="text-[12px] text-ink dark:text-paper leading-relaxed">
              3+ tasks at critical risk. Coach switched to triage — tasks below ranked by damage-if-missed.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-in */}
      {!hasCheckedIn ? (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-line rounded-sm">
          <header className="px-5 py-3.5 border-b border-line flex items-baseline justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Morning check-in</div>
              <p className="font-mono text-[10px] text-muted mt-1">3 taps · 10 seconds · shapes the plan</p>
            </div>
            <span className="font-mono text-[9px] text-muted tabular-nums">step {checkinStep + 1} / 3</span>
          </header>

          <div className="px-5 py-5">
            {checkinStep === 0 && (
              <CheckinStep label="Feeling">
                {moods.map((m) => (
                  <StepBtn
                    key={m.key}
                    active={tempCheckin.mood === m.key}
                    onClick={() => { setTempCheckin({ ...tempCheckin, mood: m.key }); setCheckinStep(1); sounds.checkinStep(); }}
                  >
                    {m.label}
                  </StepBtn>
                ))}
              </CheckinStep>
            )}

            {checkinStep === 1 && (
              <CheckinStep label="Energy">
                {energyLevels.map((e) => (
                  <StepBtn
                    key={e.key}
                    active={tempCheckin.energy === e.key}
                    onClick={() => { setTempCheckin({ ...tempCheckin, energy: e.key }); setCheckinStep(2); sounds.checkinStep(); }}
                  >
                    {e.label}
                  </StepBtn>
                ))}
              </CheckinStep>
            )}

            {checkinStep === 2 && (
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Available hours</div>
                  <span className="font-display text-4xl text-accent tabular-nums leading-none">
                    {tempCheckin.hours}
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted ml-1">h</span>
                  </span>
                </div>
                <input
                  type="range" min={0} max={12} step={0.5}
                  value={tempCheckin.hours}
                  onChange={(e) => setTempCheckin({ ...tempCheckin, hours: Number(e.target.value) })}
                  className="w-full meridian-range"
                />
                <button
                  onClick={handleCheckinSubmit}
                  className="mt-5 w-full font-mono text-[10px] uppercase tracking-[0.22em] text-paper dark:text-ink bg-ink dark:bg-paper rounded-sm py-2.5 hover:bg-accent dark:hover:bg-accent hover:text-ink transition-colors"
                >
                  Generate insights →
                </button>
              </div>
            )}
          </div>
        </motion.section>
      ) : (
        <section className="flex items-center gap-6 border-t border-b border-line py-4 flex-wrap">
          <Stat label="Mood" value={checkin.mood} />
          <div className="w-px h-8 bg-line" />
          <Stat label="Energy" value={checkin.energy} />
          <div className="w-px h-8 bg-line" />
          <Stat label="Available" value={`${checkin.availableHours}h`} />
        </section>
      )}

      {/* Insights — bordered plain-text rows */}
      <section className="flex flex-col">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted mb-4">Insights</h2>
        <div className="border border-line rounded-sm divide-y divide-line">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 px-4 py-3"
            >
              <TierDot tier={insight.tier} />
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted w-14 flex-shrink-0 pt-0.5">
                {insight.tier}
              </span>
              <p className="text-[12px] text-ink dark:text-paper leading-relaxed flex-1">{insight.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tasks */}
      <section className="flex flex-col">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted mb-1">Tasks & deadlines</h2>
            <p className="font-mono text-[10px] text-muted">
              {activeTasks.length} active · {completedTasks.length} done
            </p>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-paper dark:text-ink bg-ink dark:bg-paper rounded-sm px-3 py-2 hover:bg-accent dark:hover:bg-accent hover:text-ink transition-colors"
          >
            <Plus size={10} /> New task
          </button>
        </div>

        <AnimatePresence>
          {showAddTask && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="border border-line rounded-sm p-5 mb-4"
            >
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">Add task</h3>
                <button onClick={() => setShowAddTask(false)} className="text-muted hover:text-ink dark:hover:text-paper">
                  <X size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldLabel>Task title</FieldLabel>
                  <input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Chapter 5 problem set"
                    className="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-display text-2xl text-ink dark:text-paper placeholder:text-muted/50 transition-colors"
                  />
                </div>
                <div>
                  <FieldLabel>Course</FieldLabel>
                  <select
                    value={newTask.courseId}
                    onChange={(e) => setNewTask({ ...newTask, courseId: e.target.value })}
                    className="w-full bg-transparent border-b border-line focus:border-accent outline-none py-1.5 font-mono text-[11px] text-ink dark:text-paper transition-colors"
                  >
                    <option value="">No course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Deadline</FieldLabel>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full bg-transparent border-b border-line focus:border-accent outline-none py-1.5 font-mono text-[11px] text-ink dark:text-paper transition-colors"
                  />
                </div>
                <div>
                  <FieldLabel>Est. hours {newTask.estimatedHours}h</FieldLabel>
                  <input
                    type="range" min={0.5} max={20} step={0.5}
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask({ ...newTask, estimatedHours: Number(e.target.value) })}
                    className="w-full meridian-range"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newTask.isExam}
                      onChange={(e) => setNewTask({ ...newTask, isExam: e.target.checked })}
                      className="accent-[color:var(--color-accent)]"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Exam</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleAddTask}
                className="mt-5 w-full font-mono text-[10px] uppercase tracking-[0.22em] text-paper dark:text-ink bg-ink dark:bg-paper rounded-sm py-2.5 hover:bg-accent dark:hover:bg-accent hover:text-ink transition-colors"
              >
                Commit task
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="border border-dashed border-line rounded-sm p-10 text-center">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted mb-2">No tasks yet</h3>
            <p className="text-[12px] text-muted max-w-sm mx-auto leading-relaxed">
              Add assignments and exams to unlock intelligent prioritization.
            </p>
          </div>
        ) : (
          <div className="border border-line rounded-sm divide-y divide-line">
            {activeTasks.map((task, i) => {
              const urgency = getUrgencyScore(task);
              const course = courses.find((c) => c.id === task.courseId);
              const progress = task.estimatedHours > 0 ? Math.round((task.hoursSpent / task.estimatedHours) * 100) : 0;
              const daysLeft = Math.max(0, Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const critical = urgency >= 80;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group flex items-start gap-3 px-4 py-3 ${critical ? 'border-l-[3px] border-l-accent pl-[13px]' : ''}`}
                >
                  <button
                    onClick={() => { toggleComplete({ id: task.id, completed: !task.completed }); sounds.taskComplete(); }}
                    className="flex-shrink-0 w-3.5 h-3.5 mt-1 border border-line hover:border-accent transition-colors"
                    aria-label="Toggle complete"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-ink dark:text-paper">{task.title}</span>
                      {task.isExam && (
                        <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-accent border border-accent/40 rounded-sm px-1.5 py-0.5">
                          exam
                        </span>
                      )}
                      <span className={`font-mono text-[8px] uppercase tracking-[0.22em] border rounded-sm px-1.5 py-0.5 ${
                        critical ? 'text-accent border-accent/40'
                          : urgency >= 60 ? 'text-ink dark:text-paper border-line'
                          : 'text-muted border-line'
                      }`}>
                        {urgencyLabel(urgency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 font-mono text-[9px] text-muted tabular-nums">
                      {course && <span>{course.name}</span>}
                      <span>{daysLeft}d left</span>
                      <span>{task.hoursSpent}/{task.estimatedHours}h · {progress}%</span>
                    </div>
                    <div className="mt-2 h-px bg-line relative">
                      <div
                        className={`absolute left-0 top-0 h-0.5 -translate-y-1/4 ${critical ? 'bg-accent' : 'bg-ink dark:bg-paper'}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-ink dark:hover:text-paper transition-all flex-shrink-0 mt-1"
                  >
                    <Trash2 size={11} />
                  </button>
                </motion.div>
              );
            })}

            {completedTasks.length > 0 && (
              <div className="px-4 py-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-2">
                  Completed · {completedTasks.length}
                </div>
                <div className="flex flex-col gap-1.5">
                  {completedTasks.slice(-5).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 font-mono text-[10px] text-muted line-through group">
                      <Check size={10} className="text-accent flex-shrink-0" />
                      <span className="flex-1 truncate">{task.title}</span>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-ink dark:hover:text-paper transition-all"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Study suggestions */}
      <StudySuggestions />

      {/* Focus timer */}
      <Pomodoro />

      {/* Workload */}
      {courses.length > 0 && (
        <ConflictDetector tasks={activeTasks} checkin={checkin} hasCheckedIn={hasCheckedIn} />
      )}
    </motion.div>
  );
}

function ConflictDetector({ tasks, checkin, hasCheckedIn }) {
  const totalNeeded = tasks.reduce((sum, t) => sum + Math.max(0, t.estimatedHours - t.hoursSpent), 0);
  const availableWeekly = hasCheckedIn ? checkin.availableHours * 5 : 25;
  const delta = Math.round((totalNeeded - availableWeekly) * 10) / 10;
  const over = delta > 0;

  return (
    <section className="border border-line rounded-sm">
      <header className="px-5 py-3 border-b border-line flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">
          {over ? 'Workload conflict' : 'Workload status'}
        </span>
        <span className="font-mono text-[9px] text-muted">weekly capacity</span>
      </header>
      <div className="grid grid-cols-3 divide-x divide-line">
        <StatCell label="Needed" value={`${Math.round(totalNeeded * 10) / 10}h`} />
        <StatCell label="Available" value={`${availableWeekly}h`} />
        <StatCell
          label={over ? 'Over capacity' : 'Buffer'}
          value={`${over ? '+' : ''}${delta}h`}
          accent={over}
        />
      </div>
      {over && (
        <p className="px-5 py-3 border-t border-line text-[12px] text-ink dark:text-paper leading-relaxed">
          Need {Math.round(totalNeeded * 10) / 10}h, have ~{availableWeekly}h. Defer low-priority or request extensions.
        </p>
      )}
    </section>
  );
}

function StatCell({ label, value, accent = false }) {
  return (
    <div className="px-4 py-4 flex flex-col gap-1">
      <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">{label}</div>
      <div className={`font-display text-3xl tabular-nums leading-none ${accent ? 'text-accent' : 'text-ink dark:text-paper'}`}>
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">{label}</div>
      <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink dark:text-paper mt-0.5">
        {value}
      </div>
    </div>
  );
}

function CheckinStep({ label, children }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-3">{label}</div>
      <div className="flex gap-0">{children}</div>
    </div>
  );
}

function StepBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] border transition-colors ${
        active
          ? 'bg-ink dark:bg-paper text-paper dark:text-ink border-ink dark:border-paper'
          : 'border-line text-muted hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper'
      } first:rounded-l-sm last:rounded-r-sm -ml-px first:ml-0`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return <label className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted block mb-2">{children}</label>;
}

function TierDot({ tier }) {
  const cls = tier === 'critical' ? 'bg-accent'
    : tier === 'warn' ? 'bg-ink dark:bg-paper'
    : 'bg-muted';
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${cls}`} />;
}
