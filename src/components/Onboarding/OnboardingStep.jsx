export default function OnboardingStep({
  step,        // 1-based current step number
  total,       // total steps (5)
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue →',
  skipLabel,   // optional skip link text
  onSkip,
}) {
  return (
    <div className="flex flex-col min-h-screen bg-paper dark:bg-ink px-6 py-12">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-16">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 < step
                ? 'w-3 bg-ink dark:bg-paper'
                : i + 1 === step
                ? 'w-3 bg-accent'
                : 'w-1.5 bg-line dark:bg-[#333]'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
        <div className="w-full mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted mb-3">
            Step {step} of {total}
          </p>
          <h2 className="font-display text-[40px] leading-[1.05] text-ink dark:text-paper">{title}</h2>
          {subtitle && (
            <p className="mt-3 text-[13px] text-ink/70 dark:text-paper/60 leading-relaxed">{subtitle}</p>
          )}
        </div>

        <div className="w-full">{children}</div>
      </div>

      {/* Navigation */}
      <div className="max-w-sm mx-auto w-full flex items-center justify-between pt-12">
        {step > 1 ? (
          <button
            onClick={onBack}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted hover:text-ink dark:hover:text-paper transition-colors"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-6">
          {skipLabel && onSkip && (
            <button
              onClick={onSkip}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted hover:text-ink dark:hover:text-paper transition-colors"
            >
              {skipLabel}
            </button>
          )}
          <button
            onClick={onContinue}
            className="font-mono text-[10px] uppercase tracking-[0.28em] bg-ink dark:bg-paper text-paper dark:text-ink px-5 h-10 hover:bg-[#222] dark:hover:bg-[#e5e0d8] transition-colors"
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
