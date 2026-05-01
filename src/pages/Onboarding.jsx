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
