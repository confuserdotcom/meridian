export const phaseRules = {
  normal: {
    title: 'Normal Semester',
    priority: 'GPA → Work → Health → Chinese → Business',
    rules: [
      'Big 3: write your top 3 tasks every night before bed',
      'Phone on DND during homework blocks — no exceptions',
      'Business learning = podcasts during commute + Saturday deep dive',
      'Gym 4x/week (Tue, Thu, Fri PE, Sat)',
      'Cook > canteen. Canteen only when gaps are too short',
      'Sunday meal prep saves 3+ hours during the week',
    ],
    sacrifices: 'Business learning and extended free time are minimized. Chinese is kept lean (30 min/day). Social happens on Friday/Saturday nights only.',
    switchTrigger: 'Switch to Exam Period ~2 weeks before finals start. Switch to Break when classes end.',
  },
  exam: {
    title: 'Exam Period',
    priority: 'GPA → Sleep → Health → Chinese (maintain) → Work (minimal)',
    rules: [
      'Work drops to ~8-10 hrs/week — tell your manager in advance',
      'No business learning — zero. It can wait.',
      'Chinese = Anki flashcards only. 15 min/day max.',
      'Gym drops to 3x (Tue, Thu, Sat) — shorter sessions for stress relief',
      'Sleep is NON-NEGOTIABLE. 23:00 lights out, no excuses.',
      'Use active recall + practice problems, not re-reading notes',
      'Every study block starts with: what do I not understand yet?',
    ],
    sacrifices: 'Business learning is completely cut. Work is minimal. Chinese is maintenance only. Free time is earned through study completion.',
    switchTrigger: 'Switch back to Normal Semester after last exam. Switch to Break if semester ends.',
  },
  break: {
    title: 'Break / Light Weeks',
    priority: 'Work → Business → Chinese → Health → Rest',
    rules: [
      'Work ramps to 25-30 hrs — this is your earning season',
      'Business learning gets real time: books, courses, strategy',
      'Chinese gets 1-1.5 hrs/day — push your level up',
      'Gym 5x/week, full 90 min sessions — build your base',
      'Meal prep Sundays for the whole week',
      'This is when you level up — the semester limits you, breaks free you',
    ],
    sacrifices: 'Academic study is gone (no classes). Free time is moderate — you earn it through work output.',
    switchTrigger: 'Switch to Normal Semester when classes resume. Switch to Exam Period if returning mid-semester near finals.',
  },
};

export const strategies = {
  bigThree: {
    title: 'The Big 3 Method',
    description: 'Every night before bed, write down the 3 most important tasks for tomorrow. These are non-negotiable. They get done first. Everything else is bonus.',
    steps: [
      'Write 3 tasks the night before — not in the morning',
      'At least 1 must be related to your top priority (GPA during semester, Work during breaks)',
      'Check them off throughout the day',
      'If you complete 2 of 3, the day counts as a win (streak continues)',
      'Review what you didn\'t finish — carry forward or drop',
    ],
  },
  sleep: {
    title: 'Sleep Protocol',
    description: 'Sleep is the foundation. Without it, everything degrades — focus, willpower, gym performance, Chinese retention.',
    steps: [
      '22:00-22:30: No screens. Write Big 3. Light stretch.',
      '22:30-23:00: Lights out. Non-negotiable.',
      '6:45 alarm (semester) / 7:30 (break) — no snooze',
      'Cold water face wash immediately — it works',
      'If you slept badly, still get up. Fix it tonight, not this morning.',
    ],
  },
  cooking: {
    title: 'Cooking vs Canteen Decision Guide',
    description: 'Cooking saves money and builds discipline. But time is limited.',
    steps: [
      'Gap < 30 min → Canteen or pre-prepped meal',
      'Gap 30-45 min → Quick cook (eggs, rice, stir fry)',
      'Gap > 45 min → Full cook (protein + veggies + carbs)',
      'Sunday meal prep covers Mon-Wed lunches',
      'Always have emergency food: oats, eggs, bananas, protein powder',
    ],
  },
};
