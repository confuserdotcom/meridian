import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PhaseSelector from '../components/PhaseSelector/PhaseSelector';
import DaySelector from '../components/DaySelector/DaySelector';
import Timeline from '../components/Timeline/Timeline';
import BigThree from '../components/BigThree/BigThree';
import StatsCards from '../components/StatsCards/StatsCards';
import EndOfDayLog from '../components/EndOfDayLog/EndOfDayLog';
import { usePhase } from '../hooks/usePhase';
import { useStreak } from '../hooks/useStreak';
import { useCalendarView } from '../hooks/useCalendarView';
import { useOnboarding } from '../hooks/useOnboarding';
import { schedules } from '../data/schedules';
import { categories } from '../data/categories';
import { getTodayName, parseTime, getCurrentTimeMinutes } from '../utils/time';
import TourTooltip from '../components/Onboarding/TourTooltip';

const DAY_CAPS = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED', Thursday: 'THU',
  Friday: 'FRI', Saturday: 'SAT', Sunday: 'SUN',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export default function Dashboard() {
  const phase = usePhase((s) => s.phase);
  const streak = useStreak((s) => s.count);
  const isFullscreen = useCalendarView((s) => s.isFullscreen);
  const [selectedDay, setSelectedDay] = useState(getTodayName());
  const [now, setNow] = useState(getCurrentTimeMinutes());
  const { tourSeen, completeTour } = useOnboarding();
  const [tourStop, setTourStop] = useState(0);

  const TOUR_STOPS = [
    { key: 'timeline', title: '01 · Plan', body: 'Your plan lives here. Drag blocks, resize, rearrange.' },
    { key: 'timeline', title: '02 · Track', body: 'Hit play on any block to start tracking. Actual time logs to the right lane.' },
    { key: 'phase-selector', title: '03 · Phases', body: 'Switch modes when exams hit or breaks start. Schedule adjusts automatically.' },
    { key: 'streak', title: '04 · Streak', body: 'Every day you track at least one block counts. Compounds fast.' },
    { key: 'bigthree', title: '05 · Big 3', body: "Three things. That's your day's contract with yourself." },
  ];

  const handleTourNext = () => {
    if (tourStop >= TOUR_STOPS.length - 1) {
      completeTour();
    } else {
      setTourStop((s) => s + 1);
    }
  };

  useEffect(() => {
    const id = setInterval(() => setNow(getCurrentTimeMinutes()), 60000);
    return () => clearInterval(id);
  }, []);

  const blocks = schedules[phase]?.[selectedDay] || [];
  const isToday = selectedDay === getTodayName();

  const nextBlock = isToday ? blocks.find((b) => parseTime(b.start) > now) : null;
  const nextCat = nextBlock ? categories[nextBlock.category] : null;
  const minsUntilNext = nextBlock ? parseTime(nextBlock.start) - now : 0;

  const today = new Date();
  const dateStr = `${MONTHS[today.getMonth()]} ${today.getDate()}`;
  const weekNum = getWeekNumber(today);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8"
      layout
    >
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            key="chrome"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-7 overflow-hidden"
          >
            {/* Editorial page header */}
            <div className="flex items-start justify-between flex-wrap gap-6">
              <div>
                <h1 className="font-display italic font-normal text-[44px] leading-[0.95] text-ink dark:text-paper">
                  {dateStr}
                </h1>
                <p className="text-[10px] font-mono tracking-[0.28em] text-muted uppercase mt-2">
                  {DAY_CAPS[selectedDay]} · WEEK {weekNum}
                </p>
              </div>

              {streak > 0 && (
                <div className="text-right">
                  <div className="font-display font-normal text-[56px] leading-none text-accent tabular-nums">
                    {streak}
                  </div>
                  <div className="text-[9px] font-mono tracking-[0.28em] text-muted uppercase mt-1">
                    DAY STREAK
                  </div>
                </div>
              )}
            </div>

            <div data-tour="phase-selector"><PhaseSelector /></div>

            <div className="flex items-center justify-between">
              <DaySelector selected={selectedDay} onSelect={setSelectedDay} />
            </div>

            {nextBlock && (
              <div
                className="border-l-[3px] pl-4 py-1"
                style={{ borderColor: nextCat?.color || 'var(--accent)' }}
              >
                <div className="text-[9px] font-mono tracking-[0.28em] text-muted uppercase">NEXT</div>
                <div className="text-sm mt-0.5">
                  <span className="text-ink dark:text-paper font-medium">{nextCat?.label}</span>
                  <span className="text-muted"> in {minsUntilNext}m</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={isFullscreen
        ? 'grid grid-cols-1 gap-4'
        : 'grid grid-cols-1 lg:grid-cols-3 gap-6'
      }>
        <div className={isFullscreen ? '' : 'lg:col-span-2'}>
          <motion.div
            key={`${phase}-${selectedDay}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Timeline blocks={blocks} day={selectedDay} interactive={true} />
          </motion.div>
        </div>

        {!isFullscreen && (
          <div className="flex flex-col gap-5">
            <BigThree />
            <EndOfDayLog />
            <StatsCards />
          </div>
        )}
      </div>
      {!tourSeen && (
        <TourTooltip
          tourKey={TOUR_STOPS[tourStop].key}
          title={TOUR_STOPS[tourStop].title}
          body={TOUR_STOPS[tourStop].body}
          onNext={handleTourNext}
          onSkip={completeTour}
          isLast={tourStop === TOUR_STOPS.length - 1}
        />
      )}
    </motion.div>
  );
}
