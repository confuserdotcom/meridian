<div align="center">

# Meridian

**A precision study operating system**

*Plan. Track. Optimize. Repeat.*

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

Meridian is a comprehensive study productivity application designed for students who treat their schedule like a system. It combines time-block scheduling, focus timers, task management, course confidence tracking, and AI-powered study optimization into a single, opinionated tool.

## Features

### 📅 Dashboard

Your command center. Displays the current date, week number, day streak, and your next upcoming block at a glance. Switch between days, select your current phase, and see your full timeline alongside your Big Three goals and end-of-day log — all on one screen.

### 🗓️ Interactive Timeline

A dual-lane vertical timeline showing **Planned** vs **Actual** time usage side by side:

- **Drag & resize** blocks to adjust your schedule on the fly
- **Click empty space** to create new blocks instantly
- **Track** any planned block to log actual start/end times automatically
- **Ctrl/⌘ + scroll** to zoom, **pinch** on touch devices
- **Undo/Reset** to recover from mistakes
- **AI Optimize** button that finds free slots and fills them with smart study suggestions
- **Fullscreen mode** for distraction-free schedule viewing
- Live current-time indicator with pulsing dot

### ⏱️ Circular Pomodoro Timer

A beautiful circular focus timer with a draggable ring to set duration:

- **Focus / Break / Long Break** modes with customizable durations
- **Drag the knob** around the ring to set your timer (5–90 min focus, 1–30 min break)
- **Link to tasks & courses** — completed focus sessions automatically log hours
- **Session tracking** — see sessions completed today and total minutes focused
- Visual progress arc with animated countdown

### 🎯 Big Three Goals

Set your top 3 daily priorities every morning. Check them off as you go. Completing all three maintains your streak.

### 📝 End-of-Day Log

A quick checklist of your trackable scheduled blocks. Tick off what you actually completed, see your completion rate, and log your day as complete — feeding your streak counter.

### 🧠 Study Coach

Your daily briefing and intelligent task manager:

- **Morning Check-in** — 3-tap flow: mood, energy level, available hours. Shapes the day's insights.
- **Insights Engine** — real-time alerts for rescue mode (3+ tasks at risk), decaying courses, low-confidence subjects, and energy-based recommendations.
- **Task & Deadline Tracker** — urgency scoring (CRIT / HIGH / MID / LOW), progress bars, days-left countdown, and exam flags.
- **Workload Conflict Detector** — compares total hours needed vs weekly capacity and warns when you're over-committed.
- **Rescue Mode** — when 3+ tasks hit critical, the coach switches to triage mode, ranking everything by damage-if-missed.

### 📚 Course Confidence Ledger

Track your understanding of each course over time:

- **Confidence percentage** — self-rated understanding that decays if you neglect a course
- **Weekly hour targets** — track logged study hours against your goal
- **Decay detection** — courses start decaying after 5 days without review, with visible warnings
- **Weekly check-in** — rate each course 1–5 and add notes to feed scheduling weights
- **Study time logging** — quick inline logging per course

### 📊 Time Tracker

A detailed analytics view of your tracked sessions:

- **Session stats** — total sessions, hours tracked, days tracked, categories
- **Day breakdown** — pick any tracked day to see planned vs actual durations with variance
- **Category patterns** — actual vs planned comparison bars with AI confidence predictions
- **Per-log detail** — see exact start/end times, planned vs actual, and variance per session

### 📆 Weekly Overview

A 7-column grid view of your entire week:

- Click any day to drill into its detail view
- Category-colored blocks with proportional heights
- Weekly totals by category (Study, Class, Work, Gym, Chinese, Business, Food, Free, Sleep)

### 📜 Rules & Strategies

Phase-specific doctrine that keeps you accountable:

- **Phase Rules** — numbered rules for your current phase (Normal Semester, Exam Period, Break)
- **Sacrifices & Switch Triggers** — know exactly what gets cut and when to change phases
- **Study Strategies** — step-by-step techniques (active recall, spaced repetition, etc.)

### ⚙️ Settings

- **Phase selector** — switch between Normal, Exam, and Break modes
- **Dark/Light mode** — ink-on-paper or paper-on-ink
- **Wake offset** — shift your entire schedule earlier or later (±60 min) without editing the template
- **Streak management** — view and reset your consecutive-day streak
- **Export** — download your current phase schedule as JSON

### ✨ Particle Background

An ambient Three.js particle system with a floating wireframe orb that shifts colors based on your current phase (blue for Normal, red for Exam, green for Break).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 8 |
| Routing | React Router 7 |
| State | Zustand 5 |
| Styling | TailwindCSS 4 |
| Animation | Framer Motion 12 |
| 3D | Three.js + React Three Fiber |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Install & Run

```bash
# Clone the repository
git clone https://github.com/confuserdotcom/meridian.git
cd meridian

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── components/
│   ├── BigThree/           # Daily top-3 goal tracker
│   ├── CircularPomodoro/   # Circular focus timer
│   ├── DaySelector/        # Day-of-week picker
│   ├── EndOfDayLog/        # End-of-day completion checklist
│   ├── Layout/             # App shell & navigation
│   ├── ParticleBackground/ # Three.js ambient particles
│   ├── PhaseSelector/      # Normal/Exam/Break switcher
│   ├── Pomodoro/           # Inline mini Pomodoro
│   ├── StatsCards/         # Weekly hours grid
│   ├── StudySuggestions/   # AI-ranked study recommendations
│   └── Timeline/           # Dual-lane interactive timeline
│       ├── BlockEditor.jsx
│       ├── RealBlock.jsx
│       ├── TimerBar.jsx
│       ├── TimelineBlock.jsx
│       └── ZoomControls.jsx
├── data/
│   ├── categories.js       # Category definitions (study, work, gym, etc.)
│   ├── rules.js            # Phase rules & strategies
│   └── schedules.js        # Full weekly schedules per phase
├── hooks/                  # Zustand stores & custom hooks
│   ├── useBigThree.js
│   ├── useCalendar.js
│   ├── useCalendarView.js
│   ├── useCheckin.js
│   ├── useCourses.js
│   ├── usePhase.js
│   ├── usePomodoro.js
│   ├── useSettings.js
│   ├── useStreak.js
│   ├── useTasks.js
│   ├── useTimeLog.js
│   └── useTimer.js
├── pages/                  # Route-level views
│   ├── Coach.jsx
│   ├── Courses.jsx
│   ├── DailyDetail.jsx
│   ├── Dashboard.jsx
│   ├── Rules.jsx
│   ├── Settings.jsx
│   ├── Timer.jsx
│   ├── Tracker.jsx
│   └── WeeklyOverview.jsx
├── styles/
│   └── tokens.css          # Design tokens & CSS custom properties
├── utils/
│   ├── aiOptimizer.js      # Free-slot finder & AI block generator
│   ├── sounds.js           # UI sound effects
│   ├── studySuggestions.js  # Priority-ranked study recommendations
│   └── time.js             # Time parsing & formatting utilities
├── App.jsx
├── index.css
└── main.jsx
```

---

## How It All Connects

1. **Set your phase** (Normal / Exam / Break) — this switches your entire schedule template, rule set, and coach weights
2. **Check in each morning** — mood, energy, and available hours shape your daily insights
3. **Follow your timeline** — blocks are pre-scheduled; drag, resize, or add as needed
4. **Track actual time** — hover a planned block and tap "Track" to log real start/end times
5. **Set your Big Three** — three daily priorities that maintain your streak
6. **Use the Pomodoro** — link it to a course or task; completed sessions auto-log hours
7. **Review at day's end** — tick completed blocks in the End-of-Day Log, submit, and keep your streak alive
8. **Check the Coach** — insights, urgency-ranked tasks, and study suggestions update in real time
9. **Monitor courses** — confidence decays without review; weekly check-ins keep weights accurate
10. **Let AI fill gaps** — the AI Optimize button finds free slots and inserts prioritized study blocks

---

## License

MIT
