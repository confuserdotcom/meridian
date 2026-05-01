# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-step setup wizard at `/onboarding` + a 5-stop tooltip tour that fires once on first dashboard visit.

**Architecture:** `useOnboarding` Zustand store (persisted) gates access — Layout redirects to `/onboarding` until `completed: true`. Wizard writes to existing stores (usePhase, useSettings, useCourses). Tour uses `data-tour` attributes on target DOM elements and a spotlight/tooltip overlay built from two focused components. No external tour libraries.

**Tech Stack:** React 19, Zustand v5, React Router v7, Tailwind CSS v4, Framer Motion

---

## Codebase Context

- `src/hooks/usePhase.js` — `setPhase(phase: 'normal'|'exam'|'break')`
- `src/hooks/useSettings.js` — `setWakeOffset(offset: number)` where offset is minutes (-60 to +60)
- `src/hooks/useCourses.js` — `addCourse({ name, importance, confidence, hoursTarget })`
- `src/App.jsx` — uses `<BrowserRouter>` + `<Routes>`. All current routes wrap inside `<Layout />`
- `src/components/Layout/Layout.jsx` — renders header + `<Outlet />`. No redirects yet.
- No test suite. Verification = `npm run dev` + manual browser check.

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useOnboarding.js` | Persisted store: completed/tourSeen flags + profile data |
| Create | `src/components/Onboarding/OnboardingStep.jsx` | Step wrapper: progress dots + Back/Continue nav |
| Create | `src/components/Onboarding/TourTooltip.jsx` | Spotlight overlay + tooltip bubble for dashboard tour |
| Create | `src/pages/Onboarding.jsx` | 5-step wizard |
| Modify | `src/App.jsx` | Add `/onboarding` route outside Layout wrapper |
| Modify | `src/components/Layout/Layout.jsx` | Redirect to `/onboarding` when `!completed` |
| Modify | `src/components/Timeline/Timeline.jsx` | Add `data-tour="timeline"` to planned lane header |
| Modify | `src/components/BigThree/BigThree.jsx` | Add `data-tour="bigthree"` to root div |
| Modify | `src/components/Layout/Layout.jsx` | Add `data-tour="streak"` to streak span |
| Modify | `src/pages/Dashboard.jsx` | Add `data-tour="phase-selector"` wrapper div |

---

## Task 1: `useOnboarding` store

**Files:**
- Create: `src/hooks/useOnboarding.js`

- [ ] **Step 1: Create the store**

Create `src/hooks/useOnboarding.js`:

```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboarding = create(
  persist(
    (set) => ({
      completed: false,
      tourSeen: false,
      name: '',
      workHours: null, // { start: 'HH:MM', end: 'HH:MM' } | null
      hobbies: [],
      nonAcademicInterests: [],

      setName: (name) => set({ name }),
      setWorkHours: (workHours) => set({ workHours }),
      setHobbies: (hobbies) => set({ hobbies }),
      setNonAcademicInterests: (nonAcademicInterests) => set({ nonAcademicInterests }),
      completeWizard: () => set({ completed: true }),
      completeTour: () => set({ tourSeen: true }),
    }),
    { name: 'lcc-onboarding' }
  )
);
```

- [ ] **Step 2: Verify the file is valid JS**

```bash
node -e "require('./src/hooks/useOnboarding.js')" 2>&1 || echo "syntax ok (ESM — check in browser)"
```

Expected: no parse error (ESM modules won't run in Node directly, but no output = no syntax error)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOnboarding.js
git commit -m "feat(onboarding): useOnboarding Zustand store"
```

---

## Task 2: `OnboardingStep` wrapper component

**Files:**
- Create: `src/components/Onboarding/OnboardingStep.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/Onboarding/OnboardingStep.jsx`:

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Onboarding/OnboardingStep.jsx
git commit -m "feat(onboarding): OnboardingStep wrapper component"
```

---

## Task 3: `TourTooltip` component

**Files:**
- Create: `src/components/Onboarding/TourTooltip.jsx`

This component:
1. Finds a DOM element via `data-tour="<name>"` attribute
2. Renders a full-screen overlay with a spotlight box around the target
3. Shows a tooltip bubble anchored near the target

- [ ] **Step 1: Create the component**

Create `src/components/Onboarding/TourTooltip.jsx`:

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Onboarding/TourTooltip.jsx
git commit -m "feat(onboarding): TourTooltip spotlight + tooltip bubble"
```

---

## Task 4: Onboarding wizard page

**Files:**
- Create: `src/pages/Onboarding.jsx`

- [ ] **Step 1: Create the page**

Create `src/pages/Onboarding.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import { usePhase } from '../hooks/usePhase';
import { useSettings } from '../hooks/useSettings';
import { useCourses } from '../hooks/useCourses';
import OnboardingStep from '../components/Onboarding/OnboardingStep';

export default function Onboarding() {
  const navigate = useNavigate();
  const { setName, setWorkHours, setHobbies, setNonAcademicInterests, completeWizard } = useOnboarding();
  const { setPhase } = usePhase();
  const { setWakeOffset } = useSettings();
  const { addCourse } = useCourses();

  const [step, setStep] = useState(1);

  // Step 1
  const [name, setLocalName] = useState('');

  // Step 2
  const [wakeOffset, setLocalWakeOffset] = useState(0);

  // Step 3
  const [phase, setLocalPhase] = useState('normal');

  // Step 4
  const [courses, setCourses] = useState([]);
  const [courseInput, setCourseInput] = useState('');

  // Step 5
  const [hobbyInput, setHobbyInput] = useState('');
  const [hobbies, setLocalHobbies] = useState([]);
  const [interestInput, setInterestInput] = useState('');
  const [interests, setLocalInterests] = useState([]);
  const [worksJob, setWorksJob] = useState(false);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');

  const addCourseLocal = () => {
    const trimmed = courseInput.trim();
    if (!trimmed || courses.includes(trimmed)) return;
    setCourses((prev) => [...prev, trimmed]);
    setCourseInput('');
  };

  const addHobby = () => {
    const trimmed = hobbyInput.trim();
    if (!trimmed || hobbies.includes(trimmed)) return;
    setLocalHobbies((prev) => [...prev, trimmed]);
    setHobbyInput('');
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed || interests.includes(trimmed)) return;
    setLocalInterests((prev) => [...prev, trimmed]);
    setInterestInput('');
  };

  const finish = () => {
    // Commit all data to stores
    setName(name.trim() || 'You');
    setWakeOffset(wakeOffset);
    setPhase(phase);
    courses.forEach((c) => addCourse({ name: c, importance: 3, confidence: 50, hoursTarget: 5 }));
    setHobbies(hobbies);
    setNonAcademicInterests(interests);
    setWorkHours(worksJob ? { start: workStart, end: workEnd } : null);
    completeWizard();
    navigate('/', { replace: true });
  };

  const TagInput = ({ value, onChange, onAdd, tags, onRemove, placeholder }) => (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-b border-line dark:border-[#333] font-mono text-[11px] py-2 text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={onAdd}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent border-b border-accent pb-1 hover:text-ink hover:border-ink dark:hover:text-paper dark:hover:border-paper transition-colors"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="font-mono text-[9px] uppercase tracking-[0.22em] border border-line dark:border-[#333] px-2 py-1 text-ink dark:text-paper flex items-center gap-2"
          >
            {tag}
            <button onClick={() => onRemove(tag)} className="text-muted hover:text-ink dark:hover:text-paper">×</button>
          </span>
        ))}
      </div>
    </div>
  );

  if (step === 1) return (
    <OnboardingStep
      step={1} total={5}
      title="What should we call you?"
      subtitle="Just a name. It stays on your device."
      onBack={null}
      onContinue={() => setStep(2)}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setLocalName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
        placeholder="Your name"
        className="w-full bg-transparent border-b border-line dark:border-[#333] font-display italic text-[32px] text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent transition-colors pb-2"
      />
    </OnboardingStep>
  );

  if (step === 2) return (
    <OnboardingStep
      step={2} total={5}
      title="When does your day start?"
      subtitle="Shift all schedule blocks earlier or later than the template."
      onBack={() => setStep(1)}
      onContinue={() => setStep(3)}
    >
      <div>
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display text-[56px] text-accent tabular-nums leading-none">
            {wakeOffset > 0 ? '+' : ''}{wakeOffset}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">min from template</span>
        </div>
        <input
          type="range"
          min={-60}
          max={60}
          step={15}
          value={wakeOffset}
          onChange={(e) => setLocalWakeOffset(Number(e.target.value))}
          className="w-full meridian-range"
        />
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-muted mt-2 tabular-nums">
          <span>−60</span><span>−30</span><span>0</span><span>+30</span><span>+60</span>
        </div>
      </div>
    </OnboardingStep>
  );

  if (step === 3) return (
    <OnboardingStep
      step={3} total={5}
      title="What's your current mode?"
      subtitle="You can switch anytime. This sets your base schedule."
      onBack={() => setStep(2)}
      onContinue={() => setStep(4)}
    >
      <div className="flex flex-col gap-3">
        {[
          { value: 'normal', label: 'Normal', hint: 'Regular study + classes' },
          { value: 'exam', label: 'Exam', hint: 'Dense review schedule' },
          { value: 'break', label: 'Break', hint: 'Recovery + light study' },
        ].map(({ value, label, hint }) => (
          <button
            key={value}
            onClick={() => setLocalPhase(value)}
            className={`text-left border px-5 py-4 transition-colors ${
              phase === value
                ? 'border-accent bg-accent/5'
                : 'border-line dark:border-[#333] hover:border-ink dark:hover:border-paper'
            }`}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink dark:text-paper">{label}</div>
            <div className="font-mono text-[9px] tracking-[0.1em] text-muted mt-1">{hint}</div>
          </button>
        ))}
      </div>
    </OnboardingStep>
  );

  if (step === 4) return (
    <OnboardingStep
      step={4} total={5}
      title="What are you studying?"
      subtitle="Add courses for spaced-repetition tracking."
      onBack={() => setStep(3)}
      onContinue={() => setStep(5)}
      skipLabel="Add later →"
      onSkip={() => setStep(5)}
    >
      <div>
        <div className="flex gap-2 mb-4">
          <input
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCourseLocal()}
            placeholder="Course name"
            className="flex-1 bg-transparent border-b border-line dark:border-[#333] font-mono text-[11px] py-2 text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={addCourseLocal}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent border-b border-accent pb-1 hover:text-ink hover:border-ink dark:hover:text-paper dark:hover:border-paper transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex flex-col divide-y divide-line dark:divide-[#222]">
          {courses.map((c) => (
            <div key={c} className="flex items-center justify-between py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink dark:text-paper">{c}</span>
              <button
                onClick={() => setCourses((prev) => prev.filter((x) => x !== c))}
                className="font-mono text-[9px] text-muted hover:text-ink dark:hover:text-paper transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </OnboardingStep>
  );

  if (step === 5) return (
    <OnboardingStep
      step={5} total={5}
      title="Tell us about yourself."
      subtitle="Helps the coach make better suggestions."
      onBack={() => setStep(4)}
      onContinue={finish}
      continueLabel="Start →"
    >
      <div className="flex flex-col gap-8">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-3">Hobbies</p>
          <TagInput
            value={hobbyInput}
            onChange={setHobbyInput}
            onAdd={addHobby}
            tags={hobbies}
            onRemove={(t) => setLocalHobbies((p) => p.filter((x) => x !== t))}
            placeholder="Running, guitar, chess…"
          />
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-3">Other learning interests</p>
          <TagInput
            value={interestInput}
            onChange={setInterestInput}
            onAdd={addInterest}
            tags={interests}
            onRemove={(t) => setLocalInterests((p) => p.filter((x) => x !== t))}
            placeholder="Photography, finance, languages…"
          />
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted mb-3">Do you work a job?</p>
          <div className="flex gap-4 mb-4">
            {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setWorksJob(value)}
                className={`font-mono text-[10px] uppercase tracking-[0.22em] pb-1 transition-colors ${
                  worksJob === value
                    ? 'text-ink dark:text-paper border-b border-accent'
                    : 'text-muted hover:text-ink dark:hover:text-paper'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {worksJob && (
            <div className="flex items-center gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted mb-1">From</p>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="bg-transparent border-b border-line dark:border-[#333] font-mono text-[11px] text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors py-1"
                />
              </div>
              <span className="text-muted mt-4">—</span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted mb-1">To</p>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="bg-transparent border-b border-line dark:border-[#333] font-mono text-[11px] text-ink dark:text-paper focus:outline-none focus:border-accent transition-colors py-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </OnboardingStep>
  );

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Onboarding.jsx
git commit -m "feat(onboarding): 5-step wizard page"
```

---

## Task 5: Wire router, layout gate, and tour

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Layout/Layout.jsx`
- Modify: `src/components/Timeline/Timeline.jsx`
- Modify: `src/components/BigThree/BigThree.jsx`
- Modify: `src/pages/Dashboard.jsx`

### Step 1: Add `/onboarding` route to App.jsx

Open `src/App.jsx`. The current imports block starts around line 1. Add the import and route.

Current `src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
// ... other imports
import Layout from './components/Layout/Layout';
// ... page imports

export default function App() {
  const darkMode = useSettings((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/week" element={<WeeklyOverview />} />
          <Route path="/day/:dayName" element={<DailyDetail />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

Add the Onboarding import at the top of the imports block:

```jsx
import Onboarding from './pages/Onboarding';
```

Add the `/onboarding` route **before** the Layout wrapper route (it must be outside Layout so it renders full-screen):

```jsx
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          {/* ... rest unchanged ... */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
```

- [ ] **Step 2: Add onboarding gate to Layout.jsx**

Open `src/components/Layout/Layout.jsx`. Add these two imports near the top:

```jsx
import { Navigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
```

Inside the `Layout` function, before the `return`, add:

```jsx
  const onboardingCompleted = useOnboarding((s) => s.completed);
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
```

- [ ] **Step 3: Add `data-tour` attrs to Timeline planned lane header**

In `src/components/Timeline/Timeline.jsx`, find the planned lane header span (around line 411):

```jsx
<span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Planned</span>
```

Change it to:

```jsx
<span data-tour="timeline" className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted">Planned</span>
```

- [ ] **Step 4: Add `data-tour` to BigThree root div**

In `src/components/BigThree/BigThree.jsx`, find the root div (line ~22):

```jsx
<div className="bg-white dark:bg-[#111] rounded-sm border border-line dark:border-[#222] p-5">
```

Change it to:

```jsx
<div data-tour="bigthree" className="bg-white dark:bg-[#111] rounded-sm border border-line dark:border-[#222] p-5">
```

- [ ] **Step 5: Add `data-tour` to streak span in Layout.jsx**

In `src/components/Layout/Layout.jsx`, find the streak span:

```jsx
<span className="font-mono text-[10px] text-accent tracking-wider">{streak}d</span>
```

Change it to:

```jsx
<span data-tour="streak" className="font-mono text-[10px] text-accent tracking-wider">{streak}d</span>
```

- [ ] **Step 6: Add `data-tour` wrapper to PhaseSelector in Dashboard.jsx**

In `src/pages/Dashboard.jsx`, find the standalone `<PhaseSelector />` line (around line 93):

```jsx
<PhaseSelector />
```

Wrap it:

```jsx
<div data-tour="phase-selector"><PhaseSelector /></div>
```

- [ ] **Step 7: Wire tour into Dashboard**

The tour starts when the dashboard loads for a user who has `completed && !tourSeen`. Add the following to `src/pages/Dashboard.jsx`:

At the top of the imports (after existing imports), add:

```jsx
import { useOnboarding } from '../hooks/useOnboarding';
import TourTooltip from '../components/Onboarding/TourTooltip';
```

Note: `useState` is already imported in Dashboard.jsx — do NOT add it again.

Near the top of the `Dashboard` function, add:

```jsx
  const { tourSeen, completeTour } = useOnboarding();
  const [tourStop, setTourStop] = useState(0);

  const TOUR_STOPS = [
    { key: 'timeline', title: '01 · Plan', body: 'Your plan lives here. Drag blocks, resize, rearrange.' },
    { key: 'timeline', title: '02 · Track', body: 'Hit play on any block to start tracking. Actual time logs to the right lane.' },
    { key: 'phase-selector', title: '03 · Phases', body: 'Switch modes when exams hit or breaks start. Schedule adjusts automatically.' },
    { key: 'streak', title: '04 · Streak', body: 'Every day you track at least one block counts. Compounds fast.' },
    { key: 'bigthree', title: '05 · Big 3', body: 'Three things. That\'s your day\'s contract with yourself.' },
  ];

  const handleTourNext = () => {
    if (tourStop >= TOUR_STOPS.length - 1) {
      completeTour();
    } else {
      setTourStop((s) => s + 1);
    }
  };
```

At the bottom of the Dashboard's JSX return (just before the closing outer div), add:

```jsx
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
```

- [ ] **Step 8: Commit all wiring changes**

```bash
git add src/App.jsx src/components/Layout/Layout.jsx src/components/Timeline/Timeline.jsx src/components/BigThree/BigThree.jsx src/pages/Dashboard.jsx
git commit -m "feat(onboarding): wire router, layout gate, data-tour attrs, dashboard tour"
```

---

## Task 6: Smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: server starts on http://localhost:5173, no console errors.

- [ ] **Step 2: Test first-time user flow**

1. Open http://localhost:5173 in browser
2. Expected: redirected to `/onboarding` — step 1 shows "What should we call you?"
3. Fill in name → Continue → step 2 (wake offset slider) → Continue → step 3 (phase buttons) → Continue → step 4 (courses) → Continue or Skip → step 5 (lifestyle) → "Start →"
4. Expected: redirected to `/` — dashboard loads
5. Expected: tour tooltip appears on first stop (Timeline planned lane)
6. Click Next → moves through 5 stops → Done
7. Expected: tour disappears, `tourSeen: true` in localStorage key `lcc-onboarding`

- [ ] **Step 3: Test returning user**

1. Refresh browser
2. Expected: goes directly to dashboard — no onboarding, no tour

- [ ] **Step 4: Verify localStorage**

Open browser DevTools → Application → Local Storage → `http://localhost:5173`

Find key `lcc-onboarding`. Expected value:
```json
{
  "state": {
    "completed": true,
    "tourSeen": true,
    "name": "<whatever you typed>",
    ...
  },
  "version": 0
}
```

- [ ] **Step 5: Test reset (for dev)**

To re-test onboarding: DevTools → Application → Local Storage → delete `lcc-onboarding` key → refresh. Expected: back to `/onboarding` step 1.

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -p
git commit -m "fix(onboarding): smoke test fixes"
```
