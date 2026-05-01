import { useEffect, useState } from 'react';

export default function TourTooltip({ tourKey, title, body, onNext, onSkip, isLast }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    setRect(null);
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

  const showBelow = rect.top < window.innerHeight / 2;
  const tooltipTop = showBelow ? spotTop + spotHeight + 12 : spotTop - 12;
  const tooltipTransform = showBelow ? 'translateY(0)' : 'translateY(-100%)';

  const overlayStyle = 'absolute bg-ink/60 pointer-events-none';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Four overlay strips that surround the spotlight — avoids clipPath evenodd issue */}
      {/* Top strip */}
      <div className={overlayStyle} style={{ top: 0, left: 0, right: 0, height: spotTop }} />
      {/* Bottom strip */}
      <div className={overlayStyle} style={{ top: spotTop + spotHeight, left: 0, right: 0, bottom: 0 }} />
      {/* Left strip */}
      <div className={overlayStyle} style={{ top: spotTop, left: 0, width: spotLeft, height: spotHeight }} />
      {/* Right strip */}
      <div className={overlayStyle} style={{ top: spotTop, left: spotLeft + spotWidth, right: 0, height: spotHeight }} />

      {/* Spotlight border */}
      <div
        className="absolute border border-accent"
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
