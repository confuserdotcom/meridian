import { usePhase } from '../../hooks/usePhase';
import { sounds } from '../../utils/sounds';

const phases = [
  { key: 'normal', label: 'NORMAL' },
  { key: 'exam', label: 'EXAM' },
  { key: 'break', label: 'BREAK' },
];

export default function PhaseSelector() {
  const { phase, setPhase } = usePhase();

  return (
    <div className="flex items-center gap-6 border-b border-line dark:border-[#222] pb-2">
      {phases.map(({ key, label }) => {
        const active = phase === key;
        return (
          <button
            key={key}
            onClick={() => { setPhase(key); sounds.phaseSwitch(); }}
            className={`relative font-mono text-[10px] tracking-[0.28em] py-1 transition-colors ${
              active ? 'text-ink dark:text-paper' : 'text-muted hover:text-ink dark:hover:text-paper'
            }`}
          >
            {label}
            {active && <span className="absolute -bottom-[9px] left-0 right-0 h-px bg-accent" />}
          </button>
        );
      })}
    </div>
  );
}
