import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronDown, Check, BookOpen, ListChecks, X } from 'lucide-react';
import { usePomodoro } from '../../hooks/usePomodoro';
import { useCourses } from '../../hooks/useCourses';
import { useTasks } from '../../hooks/useTasks';
import { sounds } from '../../utils/sounds';

// ——— Visual config ———
const SIZE = 300;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2 - 20;
const CENTER = SIZE / 2;
const CIRC = 2 * Math.PI * RADIUS;
const KNOB_R = 6;

// Duration ranges per mode (minutes)
const RANGE = {
  work: { min: 5, max: 90, snap: 5 },
  break: { min: 1, max: 30, snap: 1 },
  longBreak: { min: 5, max: 45, snap: 5 },
};

function hashColor(str) {
  if (!str) return '#8A8580';
  const palette = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#F97316'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function formatMMSS(secs) {
  const m = Math.max(0, Math.floor(secs / 60));
  const s = Math.max(0, secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function polarToXY(angle, radius = RADIUS) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function pointerToAngle(event, svgEl) {
  const rect = svgEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  return (deg + 360) % 360;
}

export default function CircularPomodoro() {
  const {
    isRunning, mode, secondsLeft, workDuration, breakDuration, longBreakDuration,
    sessionsCompleted, totalMinutesToday, currentTaskId, currentCourseId,
    start, pause, resume, tick, reset, setMode,
    setWorkDuration, setBreakDuration, setLongBreakDuration, ensureToday,
  } = usePomodoro();
  const courses = useCourses((s) => s.courses);
  const logStudyTime = useCourses((s) => s.logStudyTime);
  const tasks = useTasks((s) => s.tasks);
  const logHours = useTasks((s) => s.logHours);

  const [selectedTaskId, setSelectedTaskId] = useState(currentTaskId);
  const [selectedCourseId, setSelectedCourseId] = useState(currentCourseId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => { ensureToday(); }, [ensureToday]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      const wasWork = usePomodoro.getState().mode === 'work';
      const completedWork = wasWork ? usePomodoro.getState().workDuration : 0;
      const taskId = usePomodoro.getState().currentTaskId;
      const courseId = usePomodoro.getState().currentCourseId;
      const result = tick();
      if (result === 'complete' && wasWork && completedWork > 0) {
        const hours = completedWork / 60;
        if (taskId) logHours(taskId, hours);
        if (courseId) logStudyTime(courseId, hours);
        sounds.timerDone();
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, tick, logHours, logStudyTime]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const selectedCourse = selectedTask
    ? courses.find((c) => c.id === selectedTask.courseId) || null
    : courses.find((c) => c.id === selectedCourseId) || null;

  const subjectColor = selectedCourse
    ? hashColor(selectedCourse.name)
    : selectedTask ? hashColor(selectedTask.title) : null;

  const subjectLabel = selectedTask?.title || selectedCourse?.name || null;

  const totalSeconds = mode === 'work' ? workDuration * 60
    : mode === 'break' ? breakDuration * 60
    : longBreakDuration * 60;
  const currentMin = totalSeconds / 60;
  const range = RANGE[mode];

  const runningSweep = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 360 : 0;
  const idleSweep = ((currentMin - range.min) / (range.max - range.min)) * 360;
  const sweepDeg = isRunning ? runningSweep : idleSweep;

  const dashOffset = CIRC * (1 - sweepDeg / 360);
  const knobPos = polarToXY(sweepDeg);

  const applyDurationFromAngle = useCallback((angle) => {
    const ratio = angle / 360;
    const raw = range.min + ratio * (range.max - range.min);
    const snapped = Math.max(range.min, Math.min(range.max,
      Math.round(raw / range.snap) * range.snap));
    if (mode === 'work') setWorkDuration(snapped);
    else if (mode === 'break') setBreakDuration(snapped);
    else setLongBreakDuration(snapped);
  }, [mode, range, setWorkDuration, setBreakDuration, setLongBreakDuration]);

  const onPointerDown = (e) => {
    if (isRunning) return;
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    applyDurationFromAngle(pointerToAngle(e, svg));
  };

  const onPointerMove = (e) => {
    if (!isDragging || isRunning) return;
    e.preventDefault();
    applyDurationFromAngle(pointerToAngle(e, svgRef.current));
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    svgRef.current?.releasePointerCapture?.(e.pointerId);
    sounds.drop();
  };

  const handleToggle = () => {
    if (isRunning) {
      pause();
      sounds.click();
      return;
    }
    const label = selectedTask?.title || selectedCourse?.name || '';
    const courseIdForStart = selectedTask?.courseId || selectedCourse?.id || null;
    if (secondsLeft <= 0) reset();
    start(courseIdForStart, label, selectedTask?.id || null);
    sounds.pomodoroStart();
  };

  const handleReset = () => {
    reset();
    setSelectedTaskId(null);
    setSelectedCourseId(null);
    sounds.click();
  };

  const handleSelectTask = (taskId) => {
    setSelectedTaskId(taskId);
    setSelectedCourseId(null);
    setPickerOpen(false);
    sounds.click();
  };

  const handleSelectCourse = (courseId) => {
    setSelectedCourseId(courseId);
    setSelectedTaskId(null);
    setPickerOpen(false);
    sounds.click();
  };

  const handleClearSubject = () => {
    setSelectedTaskId(null);
    setSelectedCourseId(null);
    sounds.click();
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const activeTasks = tasks.filter((t) => !t.completed);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto">
      {/* Subject picker */}
      <div className="w-full relative">
        <div className="w-full flex items-center gap-2 px-3 py-2 border border-line rounded-sm bg-paper dark:bg-ink">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            {subjectColor && (
              <div className="w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: subjectColor }} />
            )}
            <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.15em] truncate">
              {subjectLabel || (
                <span className="text-muted">What are you working on?</span>
              )}
            </span>
            <ChevronDown
              size={12}
              className={`text-muted transition-transform flex-shrink-0 ${pickerOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {subjectLabel && (
            <button
              type="button"
              onClick={handleClearSubject}
              className="p-0.5 text-muted hover:text-ink dark:hover:text-paper transition-colors flex-shrink-0"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 right-0 mt-px z-30 max-h-72 overflow-y-auto border border-line rounded-sm bg-paper dark:bg-ink"
            >
              {activeTasks.length > 0 && (
                <PickerSection icon={ListChecks} label="Tasks">
                  {activeTasks.map((t) => {
                    const c = courses.find((x) => x.id === t.courseId);
                    const color = c ? hashColor(c.name) : '#8A8580';
                    return (
                      <PickerItem
                        key={t.id}
                        active={t.id === selectedTaskId}
                        color={color}
                        primary={t.title}
                        secondary={c?.name || 'No course'}
                        onClick={() => handleSelectTask(t.id)}
                      />
                    );
                  })}
                </PickerSection>
              )}
              {courses.length > 0 && (
                <PickerSection icon={BookOpen} label="Courses">
                  {courses.map((c) => (
                    <PickerItem
                      key={c.id}
                      active={c.id === selectedCourseId && !selectedTaskId}
                      color={hashColor(c.name)}
                      primary={c.name}
                      secondary={`${c.hoursLogged || 0}h logged`}
                      onClick={() => handleSelectCourse(c.id)}
                    />
                  ))}
                </PickerSection>
              )}
              {activeTasks.length === 0 && courses.length === 0 && (
                <div className="px-4 py-6 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
                  No tasks or courses yet
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode tabs — plain text, active = underline */}
      <div className="flex items-center gap-6">
        {[
          { key: 'work', label: 'Focus' },
          { key: 'break', label: 'Break' },
          { key: 'longBreak', label: 'Long' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { if (!isRunning) { setMode(key); sounds.click(); } }}
            disabled={isRunning}
            className={`font-mono text-[10px] uppercase tracking-[0.22em] pb-0.5 border-b transition-colors disabled:opacity-40 ${
              mode === key
                ? 'text-ink dark:text-paper border-current'
                : 'text-muted hover:text-ink dark:hover:text-paper border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Circular timer — amber ring, border-color track, 4px thin */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          className={`touch-none ${isRunning ? '' : 'cursor-grab active:cursor-grabbing'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Tick marks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const tickAngle = (i / 12) * 360;
            const outer = polarToXY(tickAngle, RADIUS + STROKE / 2 + 4);
            const inner = polarToXY(tickAngle, RADIUS - STROKE / 2 - 2);
            const major = i % 3 === 0;
            return (
              <line
                key={i}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                strokeWidth={major ? 1.5 : 0.75}
                strokeLinecap="round"
                style={{ stroke: 'var(--color-border)' }}
              />
            );
          })}

          {/* Track — border color */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            style={{ stroke: 'var(--color-border)' }}
          />

          {/* Progress arc — amber */}
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="butt"
            strokeDasharray={CIRC}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{
              strokeDashoffset: isDragging
                ? { duration: 0 }
                : { duration: isRunning ? 0.9 : 0.25, ease: 'easeOut' },
            }}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ stroke: 'var(--color-accent)' }}
          />

          {/* Knob — amber, hover-only */}
          <g style={{ opacity: isRunning ? 0 : 1, transition: 'opacity 0.3s' }}>
            <circle
              cx={knobPos.x}
              cy={knobPos.y}
              r={KNOB_R}
              style={{ fill: 'var(--color-accent)' }}
            />
            <circle
              cx={knobPos.x}
              cy={knobPos.y}
              r={2}
              fill="white"
              opacity={0.85}
            />
          </g>
        </svg>

        {/* Time display overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1">
          <motion.div
            key={isRunning ? 'run' : 'idle'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-7xl text-ink dark:text-paper leading-none"
          >
            {String(mins).padStart(2, '0')}
            <span className="text-muted">:</span>
            {String(secs).padStart(2, '0')}
          </motion.div>
          <div className="mt-1 flex items-center gap-1.5">
            {isRunning && (
              <motion.div
                className="w-1 h-1 bg-accent"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              {isRunning ? 'running' : isDragging ? `${currentMin} min` : 'tap play'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleReset}
          className="w-12 h-12 flex items-center justify-center border border-line rounded-sm text-muted hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper transition-colors"
          title="Reset"
        >
          <RotateCcw size={16} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleToggle}
          className="w-16 h-16 flex items-center justify-center bg-ink dark:bg-paper text-paper dark:text-ink rounded-sm transition-colors hover:opacity-90"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isRunning ? (
              <motion.span
                key="pause"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="block"
              >
                <Pause size={22} fill="currentColor" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="block"
              >
                <Play size={22} fill="currentColor" className="ml-0.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Balance spacer */}
        <div className="w-12 h-12" />
      </div>

      {/* Session stats */}
      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        <span><span className="text-ink dark:text-paper">{sessionsCompleted}</span> sessions</span>
        <div className="w-px h-3 bg-line" />
        <span><span className="text-ink dark:text-paper">{totalMinutesToday}m</span> today</span>
        <div className="w-px h-3 bg-line" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5"
              animate={{
                backgroundColor: i < (sessionsCompleted % 4)
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
              }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PickerSection({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted border-b border-line">
        <Icon size={9} />
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PickerItem({ active, color, primary, secondary, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-t border-line first:border-t-0 transition-colors ${
        active ? 'bg-line/30' : 'hover:bg-line/20'
      }`}
    >
      <div className="w-[3px] h-5 flex-shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate text-ink dark:text-paper">{primary}</div>
        {secondary && (
          <div className="font-mono text-[9px] text-muted truncate">{secondary}</div>
        )}
      </div>
      {active && <Check size={10} className="text-muted flex-shrink-0" />}
    </button>
  );
}
