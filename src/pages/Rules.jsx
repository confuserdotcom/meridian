import { motion } from 'framer-motion';
import PhaseSelector from '../components/PhaseSelector/PhaseSelector';
import { usePhase } from '../hooks/usePhase';
import { phaseRules, strategies } from '../data/rules';

export default function Rules() {
  const phase = usePhase((s) => s.phase);
  const rules = phaseRules[phase];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-10"
    >
      <div className="flex flex-col gap-4">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Rules & Strategies</h1>
        <PhaseSelector />
      </div>

      {/* Phase rules */}
      <motion.section
        key={phase}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-line rounded-sm"
      >
        <header className="px-5 py-4 border-b border-line flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-1">Phase Doctrine</div>
            <h2 className="font-display text-3xl text-ink dark:text-paper leading-none">{rules.title}</h2>
          </div>
          <div className="font-mono text-[10px] text-muted tabular-nums max-w-sm text-right leading-relaxed">
            {rules.priority}
          </div>
        </header>

        <ol className="divide-y divide-line">
          {rules.rules.map((rule, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex gap-5 px-5 py-3.5"
            >
              <span className="font-display text-3xl text-accent leading-none w-8 flex-shrink-0 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[13px] text-ink dark:text-paper leading-relaxed pt-1.5">{rule}</span>
            </motion.li>
          ))}
        </ol>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-line">
          <div className="px-5 py-4 md:border-r border-line">
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-2">What gets sacrificed</div>
            <p className="text-[12px] text-ink dark:text-paper leading-relaxed">{rules.sacrifices}</p>
          </div>
          <div className="px-5 py-4 border-t md:border-t-0 border-line">
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-2">When to switch</div>
            <p className="text-[12px] text-ink dark:text-paper leading-relaxed">{rules.switchTrigger}</p>
          </div>
        </div>
      </motion.section>

      {/* Strategies */}
      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line rounded-sm overflow-hidden">
          {Object.entries(strategies).map(([key, strat], si) => (
            <motion.article
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.06 }}
              className="bg-paper dark:bg-ink p-5 flex flex-col gap-3"
            >
              <header>
                <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-1">Strategy {String(si + 1).padStart(2, '0')}</div>
                <h3 className="font-display text-2xl text-ink dark:text-paper leading-tight">{strat.title}</h3>
              </header>
              <p className="text-[12px] text-muted leading-relaxed">{strat.description}</p>
              <ul className="flex flex-col gap-2 mt-1">
                {strat.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[12px] text-ink dark:text-paper leading-relaxed">
                    <span className="font-mono text-[10px] text-accent tabular-nums mt-0.5 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
