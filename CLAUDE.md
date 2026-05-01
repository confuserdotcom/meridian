# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite HMR)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

No test suite configured.

## Stack

React 19 + Vite 8, Tailwind CSS v4, Zustand v5, Framer Motion, React Router v7, Three.js / React Three Fiber, Lucide icons.

## Architecture

Personal life-management dashboard for a student in China. All state is client-side only — no backend, no API calls. Everything persists via Zustand `persist` middleware to `localStorage`.

### Zustand stores (all in `src/hooks/`)

| Store | Key | Purpose |
|---|---|---|
| `useCalendar` | `lcc-calendar` | Custom/deleted block overrides on top of base schedules |
| `useCalendarView` | `lcc-calendar-view` | Zoom level, focus range, fullscreen flag |
| `usePhase` | `lcc-phase` | Active schedule phase (`normal` \| `exam` \| `break`) |
| `useSettings` | `lcc-settings` | Dark mode, wake offset |
| `useTimer` | _(in-memory, no persist)_ | Active block-tracking session |
| `useTimeLog` | `lcc-timelog` | Completed tracking sessions (plan vs. actual log) |
| `usePomodoro` | `lcc-pomodoro` | Pomodoro timer state |
| `useStreak` | — | Study streak count |
| `useBigThree` | — | Daily top-3 goals |
| `useCourses` | — | Course list with spaced-repetition decay |
| `useTasks` | — | Task list |
| `useCheckin` | — | Daily check-in state |

### Static data (`src/data/`)

- `schedules.js` — Base weekly schedules for each phase (`normal`, `exam`, `break`). Each day is an array of `{ start, end, category, note }` blocks in `HH:MM` format.
- `categories.js` — Display metadata (label, color, bg, darkBg, darkColor) for each category key.
- `rules.js` — Static rules/principles list.

### Schedule / Calendar layer

The **base schedule** (`schedules[phase][day]`) is read-only static data. `useCalendar` stores **overrides only**:
- `customBlocks[phase-day]` — user-added or converted blocks
- `deletedBlocks[phase-day-index]` — hidden base blocks
- `getMergedBlocks(phase, day, baseBlocks)` merges both into a sorted list.

Converting a base block to custom (`convertBaseToCustom`) hides the original via `deletedBlocks` and adds a new custom block with `convertedFrom: baseIndex`.

Undo is an in-memory stack (not persisted) of up to 20 snapshots of `{customBlocks, deletedBlocks}`.

### Timeline component

`src/components/Timeline/Timeline.jsx` is the core interactive component. It renders two side-by-side lanes:
- **Plan lane** — scheduled blocks (`TimelineBlock`), draggable/resizable
- **Actual lane** — real tracked sessions (`RealBlock`) from `useTimeLog`

Zoom is controlled by `useCalendarView`. `BASE_PX_PER_MIN = 1.2`; effective px/min = `BASE_PX_PER_MIN * zoomLevel`. Ctrl+scroll and two-finger pinch both update zoom with cursor-anchored scroll position restoration.

### Timer / time-tracking flow

1. User clicks ▶ on a plan block → `useTimer.startTimer()` — stores in-memory session
2. `TimerBar` shows elapsed time; user clicks stop → `useTimer.stopTimer()` returns session object
3. Caller calls `useTimeLog.addLog(session)` to persist
4. `useTimeLog.predictDuration()` uses exponentially-weighted moving average (decay=0.82) of actual/planned ratio per category to show duration predictions on plan blocks

### Pages

- `/` Dashboard — PhaseSelector + DaySelector + Timeline (2/3) + sidebar (BigThree, EndOfDayLog, StatsCards)
- `/timer` — Pomodoro timer + block tracker
- `/tracker` — Historical log of tracked sessions with category rollups
- `/courses` — Course list with spaced-repetition decay indicators
- `/week` — Weekly overview
- `/day/:dayName` — Daily detail view
- `/coach` — AI study suggestions
- `/rules` — Static rules display
- `/settings` — Dark mode, wake offset, durations

### Utilities (`src/utils/`)

- `time.js` — `parseTime(HH:MM)→minutes`, `formatTime`, `getCurrentTimeMinutes`, `snapTo`, `minutesToTime`, `getTodayName`
- `sounds.js` — Web Audio API sound effects (click, drop, create, remove, suggest, pomodoroStart)
- `studySuggestions.js` — Generates study block suggestions from courses + tasks
- `aiOptimizer.js` — Finds free gaps in merged blocks and inserts AI-generated study blocks

---

## Coding Principles (Karpathy)

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Active Skills (always-on for coding tasks)

Every coding task in this repo runs through these three skills. Apply in this order:

1. **caveman (ultra)** — tone. Drop articles/filler/pleasantries/hedging. Fragments OK. Technical substance stays. Code/commits/security write normal. Toggle off: "stop caveman" / "normal mode".
2. **frontend-design** — taste. No generic AI aesthetics (no Inter/Roboto, no purple-on-white gradients, no 3-col feature cards, no centered hero cliché). Commit to a bold aesthetic direction. Distinctive typography, asymmetric layouts, 1px borders over shadows, warm monochrome + single accent.
3. **taste-skill (leonxlnx)** — rule enforcement. Geist for UI, Cormorant Garamond for display/numbers, IBM Plex Mono for data/labels. `--color-ink #0A0A0A` / `--color-paper #F5F0E8` / `--color-accent #C4973A`. No `rounded-xl`, max `rounded-sm`. No box-shadow. Mono caps tracked `0.22em–0.28em`.

Implicit on every task unless the user says otherwise.

---

## Meridian — Roadmap (10 Mini-Projects)

Brand locked: **Meridian** · Hono+Turso+Drizzle+BetterAuth · Cormorant+Geist+IBMPlexMono · amber accent `#C4973A`.

Legend: `[x]` done · `[~]` in progress · `[ ]` pending.

### MP1 · Design Foundation `[x]`
Tokens + fonts.
- [x] Google Fonts import (Cormorant Garamond + Geist + IBM Plex Mono) in `src/index.css`
- [x] `src/styles/tokens.css` — color palette vars, dark mode overrides, font families
- [x] `@theme` block → Geist + Cormorant display token
- [x] Remove Three.js `ParticleBackground` from `Layout.jsx`
- [x] CSS grain texture on `body::before` (opacity 0.025, fixed, pointer-events none)

### MP2 · Layout + Navigation `[x]`
File: `src/components/Layout/Layout.jsx`.
- [x] `MeridianMark` SVG (circle + crosshair, 20px) + "MERIDIAN" wordmark Geist Mono tracked-wide
- [x] Header 48px height
- [x] Desktop nav: text-only, active = underline (no bg pill)
- [x] Mobile nav: icons only, 44px tap targets
- [x] Pomodoro indicator: border-only mono chip
- [x] Streak: plain `{n}d` amber mono
- [x] `max-w-4xl`, `px-6 py-8`, `bg-paper dark:bg-ink`

### MP3 · Dashboard Redesign `[x]`
File: `src/pages/Dashboard.jsx`.
- [x] Header: Cormorant italic date + Geist caps day
- [x] Streak hero: Cormorant 56px amber + caps label
- [x] PhaseSelector: text buttons, active = underline
- [x] DaySelector: weekday initials, active = filled ink square
- [x] Next block: 3px left border accent, plain text
- [x] Sidebar cards: 1px border, `rounded-sm`, no shadow
- [x] Timeline column unwrapped

### MP4 · Timeline Block Redesign `[x]`
Files: `TimelineBlock.jsx`, `Timeline.jsx`, `RealBlock.jsx`, `TimerBar.jsx`.
- [x] `rounded-xl` → `rounded-sm`; 3px left border category color; 10% tint bg
- [x] Label 10px Geist caps; time range IBM Plex Mono 9px
- [x] Current-time indicator: 1px amber line + 4px dot + pulse
- [x] Lane headers `PLANNED` / `ACTUAL` 9px tracked-widest muted
- [x] Resize handles: thin amber, hover-only
- [x] TimerBar: ink bg, amber fill, mono

### MP5 · Timer Page Redesign `[x]`
Files: `src/pages/Timer.jsx`, `CircularPomodoro.jsx`.
- [x] Remove header icon + colored stat chips
- [x] Sessions: plain `4 sessions` muted Geist
- [x] Ring: amber stroke, border-color track, 4px thin
- [x] Digits: Cormorant 72px centered
- [x] Play/pause: flat ink fill, white icon, `rounded-sm` max
- [x] Mode toggle: plain text, active = underline

### MP6 · Tracker Page Redesign `[x]`
Files: `src/pages/Tracker.jsx`, `src/data/categories.js`.
- [x] Stat cards: Cormorant 48px (`text-5xl font-display`), 10px mono caps label, 1px border
- [x] Day picker: plain mono text, active = ink bg no radius
- [x] Log rows: `divide-y` table-style
- [x] Category dots: 6px circle (`w-1.5 h-1.5`); desaturate `saturate(0.7)`
- [x] Actual-vs-planned: 2px lines (`h-0.5`) not full bars
- [x] AI predictions header: muted only, no brain icon color

### MP7 · Remaining Pages Polish `[x]`
Files: `Courses.jsx`, `Coach.jsx`, `Rules.jsx`, `Settings.jsx`, `WeeklyOverview.jsx`.
- [x] Courses: thin decay lines, Cormorant days-since numbers
- [x] Coach: bordered plain-text suggestion rows
- [x] Rules: Cormorant numbers, Geist body
- [x] Settings: plain borders, amber focus rings
- [x] Weekly Overview: sharp-border grid cells

### MP8 · Backend Scaffolding `[x]`
- [x] Monorepo: `apps/api/`, `packages/shared/`, root workspaces
- [x] `apps/api/` via `npm create hono@latest` (Cloudflare Workers)
- [x] Install `drizzle-orm`, `@libsql/client`, `better-auth`, `zod`
- [x] `packages/shared/src/schema.ts`: Zod entities (User, Schedule, TimeLog, Task, Course, Settings)
- [x] `apps/api/src/db/schema.ts`: Drizzle 8 tables (users, schedules, time_logs, tasks, big_three, pomodoro_sessions, courses, settings)
- [x] `apps/api/src/db/index.ts`: Turso client
- [x] `drizzle-kit generate` + `push` against local Turso dev DB
- [x] Routes: auth / schedule / logs / tasks / courses / settings
- [x] Verify: `wrangler dev` → `POST /auth/sign-up/email` 200, `GET /me` 200

### MP9 · Frontend ↔ API Sync `[ ]`
- [ ] `src/lib/api.ts` fetch wrapper (auth header, errors)
- [ ] `src/lib/auth.ts` login/register/logout + localStorage token
- [ ] Auth gate in `Layout.jsx` → redirect to `/login`
- [ ] `src/pages/Login.jsx` — minimal email+password, Meridian mark centered
- [ ] Sync pattern: Zustand write → background `api.post()`
- [ ] Boot hydration: `useEffect` fetch → fill stores (server wins)
- [ ] Offline fallback: local write only on API failure
- [ ] Wrap `useTimeLog` / `useTasks` / `useSettings` writes

### MP10 · Landing Page `[x]`
- [x] `apps/landing/` — Astro 5 + Tailwind v4
- [x] Hero: Meridian mark, "Your daily meridian.", `Start free →` CTA, inline timeline mockup
- [x] Features zig-zag: Schedule · Track · Improve (inline SVG mockups, no 3-col cards)
- [x] Pricing: Free vs Pro $5/mo two-col
- [x] Footer: GitHub + `hello@meridian.day`
- [x] Deploy to Cloudflare Pages (meridian-landing-4it.pages.dev)

### Sequence

```
[1] → [2] → [3] → [4] → [5] → [6] → [7]
                                     ↓
                                    [8] → [9] → [10]
```
MP3–7 can overlap. MP8 can start any time after MP1. MP10 independent.

Plan file: `/Users/Apple/.claude/plans/caveman-skill-ultra-front-end-serialized-hollerith.md`.
