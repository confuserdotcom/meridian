import { useEffect, useState } from 'react';

export default function TourTooltip({ tourKey, title, body, onNext, onSkip, isLast }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${tourKey}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [tourKey]);

  if (!rect) return null;

  const PAD = 8;
  const spotTop = rect.top - PAD;
  const spotLeft = rect.left - PAD;
  const spotWidth = rect.width + PAD * 2;
  const spotHeight = rect.height + PAD * 2;

  // Tooltip: show below target if target is in top half, else above
  const showBelow = rect.top < window.innerHeight / 2;
  const tooltipTop = showBelow ? spotTop + spotHeight + 12 : spotTop - 12;
  const tooltipTransform = showBelow ? 'translateY(0)' : 'translateY(-100%)';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dark overlay — four rectangles around the spotlight */}
      <div className="absolute inset-0 bg-ink/60" style={{
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 100%, 0% 100%,
          0% ${spotTop}px,
          ${spotLeft}px ${spotTop}px,
          ${spotLeft}px ${spotTop + spotHeight}px,
          ${spotLeft + spotWidth}px ${spotTop + spotHeight}px,
          ${spotLeft + spotWidth}px ${spotTop}px,
          0% ${spotTop}px
        )`,
      }} />

      {/* Spotlight border */}
      <div
        className="absolute border border-accent/60"
        style={{ top: spotTop, left: spotLeft, width: spotWidth, height: spotHeight }}
      />

      {/* Tooltip bubble */}
      <div
        className="absolute pointer-events-auto"
        style={{
          top: tooltipTop,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)),
          width: 300,
          transform: tooltipTransform,
        }}
      >
        <div className="bg-ink dark:bg-paper text-paper dark:text-ink border border-[#222] dark:border-line p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent mb-2">{title}</p>
          <p className="text-[12px] leading-relaxed opacity-80">{body}</p>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={onSkip}
              className="font-mono text-[9px] uppercase tracking-[0.22em] opacity-50 hover:opacity-100 transition-opacity"
            >
              Skip tour
            </button>
            <button
              onClick={onNext}
              className="font-mono text-[9px] uppercase tracking-[0.28em] bg-accent text-ink px-3 h-7 hover:bg-[#d4a745] transition-colors"
            >
              {isLast ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
