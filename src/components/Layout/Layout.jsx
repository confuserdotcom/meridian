import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, BookOpen, Settings, Brain, GraduationCap, Clock, Timer } from 'lucide-react';
import { useStreak } from '../../hooks/useStreak';
import { usePomodoro } from '../../hooks/usePomodoro';
import { sounds } from '../../utils/sounds';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Today' },
  { to: '/week', icon: CalendarDays, label: 'Week' },
  { to: '/timer', icon: Timer, label: 'Timer' },
  { to: '/coach', icon: Brain, label: 'Coach' },
  { to: '/courses', icon: GraduationCap, label: 'Courses' },
  { to: '/tracker', icon: Clock, label: 'Track' },
  { to: '/rules', icon: BookOpen, label: 'Rules' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function MeridianMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="0" x2="12" y2="24" />
    </svg>
  );
}

export default function Layout() {
  const streak = useStreak((s) => s.count);
  const pomodoroRunning = usePomodoro((s) => s.isRunning);
  const pomodoroSeconds = usePomodoro((s) => s.secondsLeft);

  const pomodoroMins = Math.floor(pomodoroSeconds / 60);
  const pomodoroSecs = pomodoroSeconds % 60;

  return (
    <div className="min-h-screen bg-paper dark:bg-ink text-ink dark:text-paper transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-paper/80 dark:bg-ink/80 backdrop-blur-md border-b border-line dark:border-[#222]">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MeridianMark size={18} />
            <span className="font-mono text-[11px] font-medium tracking-[0.28em] hidden sm:block">MERIDIAN</span>
          </div>

          <nav className="flex items-center">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => sounds.click()}
                className={({ isActive }) =>
                  `relative flex items-center justify-center h-12 w-11 sm:w-auto sm:px-3 text-[10px] font-mono tracking-[0.18em] uppercase transition-colors after:absolute after:bottom-0 after:left-2 after:right-2 after:h-px ${
                    isActive
                      ? 'text-ink dark:text-paper after:bg-accent'
                      : 'text-muted hover:text-ink dark:hover:text-paper after:bg-transparent'
                  }`
                }
              >
                {({ isActive: _ }) => (
                  <>
                    <Icon size={16} className="sm:hidden" strokeWidth={1.5} />
                    <span className="hidden sm:inline">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 min-w-0">
            {pomodoroRunning && (
              <span className="font-mono text-[10px] tabular-nums text-ink dark:text-paper border border-line dark:border-[#222] px-1.5 py-0.5">
                {String(pomodoroMins).padStart(2, '0')}:{String(pomodoroSecs).padStart(2, '0')}
              </span>
            )}
            {streak > 0 && (
              <span className="font-mono text-[10px] text-accent tracking-wider">{streak}d</span>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
