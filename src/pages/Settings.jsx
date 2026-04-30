import { motion } from 'framer-motion';
import PhaseSelector from '../components/PhaseSelector/PhaseSelector';
import { useSettings } from '../hooks/useSettings';
import { useStreak } from '../hooks/useStreak';
import { usePhase } from '../hooks/usePhase';
import { schedules } from '../data/schedules';

export default function Settings() {
  const { darkMode, toggleDarkMode, wakeOffset, setWakeOffset } = useSettings();
  const resetStreak = useStreak((s) => s.reset);
  const streak = useStreak((s) => s.count);
  const phase = usePhase((s) => s.phase);

  const handleExport = () => {
    const data = { phase, schedule: schedules[phase], exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-${phase}-schedule.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-10 max-w-xl"
    >
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted mb-2">Settings</div>
        <h1 className="font-display text-5xl text-ink dark:text-paper leading-none">Preferences</h1>
      </header>

      <Row label="Active phase" hint="Switches rule set, schedule template, and coach weights.">
        <PhaseSelector />
      </Row>

      <Row label="Appearance" hint="Ink-on-paper or paper-on-ink.">
        <div className="flex items-center gap-6">
          <button
            onClick={() => darkMode && toggleDarkMode()}
            className={`font-mono text-[10px] uppercase tracking-[0.22em] pb-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              !darkMode ? 'text-ink dark:text-paper border-b border-accent' : 'text-muted hover:text-ink dark:hover:text-paper'
            }`}
          >
            Paper
          </button>
          <button
            onClick={() => !darkMode && toggleDarkMode()}
            className={`font-mono text-[10px] uppercase tracking-[0.22em] pb-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              darkMode ? 'text-ink dark:text-paper border-b border-accent' : 'text-muted hover:text-ink dark:hover:text-paper'
            }`}
          >
            Ink
          </button>
        </div>
      </Row>

      <Row
        label="Wake offset"
        hint="Shift every block earlier or later without editing the template."
        aside={
          <span className="font-display text-4xl text-accent tabular-nums leading-none">
            {wakeOffset > 0 ? '+' : ''}{wakeOffset}
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted ml-1">min</span>
          </span>
        }
      >
        <input
          type="range"
          min={-60}
          max={60}
          step={15}
          value={wakeOffset}
          onChange={(e) => setWakeOffset(Number(e.target.value))}
          className="w-full meridian-range"
        />
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-muted mt-2 tabular-nums">
          <span>-60</span><span>-30</span><span>0</span><span>+30</span><span>+60</span>
        </div>
      </Row>

      <Row
        label="Streak"
        hint="Consecutive days a Big-3 goal was completed."
        aside={
          <span className="font-display text-4xl text-ink dark:text-paper tabular-nums leading-none">
            {streak}
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted ml-1">d</span>
          </span>
        }
      >
        <button
          onClick={resetStreak}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted border border-line rounded-sm px-3 py-1.5 hover:text-ink dark:hover:text-paper hover:border-ink dark:hover:border-paper transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          Reset counter
        </button>
      </Row>

      <Row label="Export" hint="Download the current phase schedule as JSON.">
        <button
          onClick={handleExport}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper dark:text-ink bg-ink dark:bg-paper rounded-sm px-4 py-2 hover:bg-accent dark:hover:bg-accent hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          Export {phase}.json →
        </button>
      </Row>

      <style>{`
        .meridian-range {
          -webkit-appearance: none;
          appearance: none;
          height: 1px;
          background: var(--color-border);
          outline: none;
        }
        .meridian-range:focus { outline: none; }
        .meridian-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          background: var(--color-accent);
          border-radius: 0;
          cursor: pointer;
          transition: transform 160ms var(--ease-out);
        }
        .meridian-range::-webkit-slider-thumb:hover { transform: scale(1.3); }
        .meridian-range::-moz-range-thumb {
          width: 10px; height: 10px;
          background: var(--color-accent);
          border: 0; border-radius: 0;
          cursor: pointer;
        }
        .meridian-range:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 3px var(--color-accent);
        }
      `}</style>
    </motion.div>
  );
}

function Row({ label, hint, aside, children }) {
  return (
    <section className="border-t border-line pt-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-1.5">{label}</div>
          <p className="text-[12px] text-muted leading-relaxed max-w-sm">{hint}</p>
        </div>
        {aside && <div className="flex-shrink-0">{aside}</div>}
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}
