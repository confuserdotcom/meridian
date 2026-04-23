import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, Brain, Timer } from 'lucide-react';
import { usePomodoro } from '../../hooks/usePomodoro';
import { useCourses } from '../../hooks/useCourses';
import { sounds } from '../../utils/sounds';

const modeConfig = {
  work: { label: 'Focus', color: 'text-red-500', bg: 'bg-red-500', ring: 'ring-red-500/20' },
  break: { label: 'Break', color: 'text-emerald-500', bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
  longBreak: { label: 'Long Break', color: 'text-blue-500', bg: 'bg-blue-500', ring: 'ring-blue-500/20' },
};

export default function Pomodoro({ compact = false }) {
  const {
    isRunning, mode, secondsLeft, sessionsCompleted, totalMinutesToday,
    currentCourseId, currentLabel, start, pause, resume, tick, reset, ensureToday,
  } = usePomodoro();
  const { courses, logStudyTime } = useCourses();
  const intervalRef = useRef(null);

  const cfg = modeConfig[mode];
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const course = courses.find((c) => c.id === currentCourseId);

  useEffect(() => {
    ensureToday();
  }, [ensureToday]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const result = tick();
        if (result === 'complete') {
          sounds.timerDone();
          // Log study time when work session completes
          if (mode === 'work' && currentCourseId) {
            logStudyTime(currentCourseId, usePomodoro.getState().workDuration / 60);
          }
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const handleStartPause = () => {
    if (isRunning) {
      pause();
    } else if (secondsLeft > 0) {
      resume();
      if (!usePomodoro.getState().isRunning) start(currentCourseId, currentLabel);
      sounds.pomodoroStart();
    }
  };

  const handleReset = () => {
    reset();
    sounds.click();
  };

  // Progress ring
  const totalSeconds = mode === 'work'
    ? usePomodoro.getState().workDuration * 60
    : mode === 'break'
    ? usePomodoro.getState().breakDuration * 60
    : usePomodoro.getState().longBreakDuration * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - progress);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${cfg.bg} ${isRunning ? 'animate-pulse' : ''}`} />
        <span className="font-mono text-sm font-bold tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <button onClick={handleStartPause} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
          {isRunning ? <Pause size={12} /> : <Play size={12} />}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer size={14} className="text-stone-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Focus Timer</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-stone-400">
            {sessionsCompleted} sessions &middot; {totalMinutesToday}m today
          </span>
        </div>
      </div>

      {/* Timer Ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="3"
              className="text-stone-100 dark:text-stone-800" />
            <motion.circle
              cx="50" cy="50" r="44" fill="none" strokeWidth="3" strokeLinecap="round"
              className={cfg.color}
              stroke="currentColor"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={secondsLeft}
              className="font-mono text-2xl font-bold tabular-nums"
            >
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </motion.span>
            <div className="flex items-center gap-1">
              {mode === 'work' ? <Brain size={10} className={cfg.color} /> : <Coffee size={10} className={cfg.color} />}
              <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
          </div>
        </div>

        {/* Course label */}
        {course && (
          <span className="text-xs text-stone-500">
            Studying: <strong>{course.name}</strong>
          </span>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStartPause}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${cfg.bg} hover:opacity-90`}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? 'Pause' : 'Start'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <RotateCcw size={14} />
          </motion.button>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < (sessionsCompleted % 4) ? cfg.bg : 'bg-stone-200 dark:bg-stone-700'
              }`}
            />
          ))}
          <span className="text-[9px] text-stone-400 ml-1">until long break</span>
        </div>
      </div>
    </motion.div>
  );
}
