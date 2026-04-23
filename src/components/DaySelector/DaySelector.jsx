import { getTodayName } from '../../utils/time';

const dayInitials = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dayFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DaySelector({ selected, onSelect }) {
  const today = getTodayName();

  return (
    <div className="flex items-center gap-1">
      {dayFull.map((day, i) => {
        const isSelected = selected === day;
        const isToday = today === day;
        return (
          <button
            key={day}
            onClick={() => onSelect(day)}
            className={`relative w-9 h-9 flex items-center justify-center text-[11px] font-mono font-medium transition-colors ${
              isSelected
                ? 'bg-ink dark:bg-paper text-paper dark:text-ink'
                : 'text-muted hover:text-ink dark:hover:text-paper'
            }`}
            aria-label={day}
          >
            {dayInitials[i]}
            {isToday && !isSelected && (
              <span className="absolute bottom-1 w-1 h-1 bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
