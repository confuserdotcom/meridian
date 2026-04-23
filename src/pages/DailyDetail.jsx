import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { usePhase } from '../hooks/usePhase';
import { schedules } from '../data/schedules';
import { categories } from '../data/categories';
import { formatTime, getDurationMinutes, getDurationLabel } from '../utils/time';

export default function DailyDetail() {
  const { dayName } = useParams();
  const phase = usePhase((s) => s.phase);
  const blocks = schedules[phase]?.[dayName] || [];

  const totalMin = blocks.reduce((s, b) => s + getDurationMinutes(b.start, b.end), 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-3">
        <Link to="/week" className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold">{dayName}</h1>
          <p className="text-xs text-stone-400 font-mono">
            {blocks.length} blocks &middot; {Math.round(totalMin / 60)}h {totalMin % 60}m scheduled
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {blocks.map((block, i) => {
          const cat = categories[block.category] || categories.transit;
          const duration = getDurationMinutes(block.start, block.end);
          const height = Math.max(48, duration * 2.8);

          return (
            <motion.div
              key={`${block.start}-${block.category}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
              style={{ minHeight: height }}
              className="flex gap-4"
            >
              {/* Time column */}
              <div className="flex-shrink-0 w-20 flex flex-col items-end pt-3">
                <span className="font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
                  {formatTime(block.start)}
                </span>
                <span className="font-mono text-[10px] text-stone-400">
                  {formatTime(block.end)}
                </span>
              </div>

              {/* Block */}
              <div
                className="flex-1 rounded-lg p-3 flex flex-col justify-center"
                style={{
                  backgroundColor: cat.bg,
                  borderLeft: `3px solid ${cat.color}`,
                }}
              >
                <div className="dark:hidden">
                  <DetailBlockInner cat={cat} block={block} duration={duration} />
                </div>
                <div className="hidden dark:block" style={{ backgroundColor: cat.darkBg, margin: '-0.75rem', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  <DetailBlockInner cat={cat} block={block} duration={duration} dark />
                </div>
              </div>

              {/* Duration badge */}
              <div className="flex-shrink-0 w-14 flex items-center">
                <span className="font-mono text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                  {getDurationLabel(block.start, block.end)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function DetailBlockInner({ cat, block, duration, dark }) {
  return (
    <>
      <span className="text-sm font-semibold" style={{ color: dark ? cat.darkColor : cat.color }}>
        {cat.label}
      </span>
      {block.note && (
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
          {block.note}
        </p>
      )}
    </>
  );
}
