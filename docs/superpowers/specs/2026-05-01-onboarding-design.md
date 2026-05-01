# Onboarding Flow Design

**Date:** 2026-05-01  
**Scope:** First-time user onboarding — 5-step wizard on `/onboarding` + dashboard tooltip tour

---

## Goal

New users register and land on a cold dashboard with no context. This onboarding gives them a guided setup (wizard) that seeds their profile, then a skippable tooltip tour that teaches the 5 core dashboard interactions.

## Approach

Single `/onboarding` route with step state tracked locally. Custom `<TourTooltip>` + `<TourSpotlight>` components built to Meridian spec. No external onboarding/tour libraries. `useOnboarding` Zustand store persists completion flags.

---

## Data Model

New store: `useOnboarding` (key: `lcc-onboarding`)

```js
{
  completed: false,           // wizard finished → gates dashboard access
  tourSeen: false,            // dashboard tour finished or skipped
  name: '',                   // display name from step 1
  workHours: null,            // { start: 'HH:MM', end: 'HH:MM' } | null
  hobbies: [],                // string[] — free-text tags
  nonAcademicInterests: []    // string[] — free-text tags
}
```

Wizard writes directly to **existing stores** — no duplication:
- Wake time → `useSettings.wakeOffset`
- Phase → `usePhase.setPhase()`
- Courses → `useCourses.addCourse()`

---

## Auth + Routing Gate

`Layout.jsx` already redirects unauthenticated users to `/login`. Add a second check:

```
authenticated && !onboarding.completed → redirect /onboarding
authenticated && onboarding.completed → render normally
```

`/onboarding` route added to the router alongside existing routes.

---

## Wizard — 5 Steps (`/onboarding`)

| Step | Question | Input type | Store target |
|------|----------|------------|--------------|
| 1 | "What should we call you?" | Text field | `useOnboarding.name` |
| 2 | "When does your day start?" | Time picker HH:MM | `useSettings.wakeOffset` |
| 3 | "What's your current mode?" | 3 buttons: Normal / Exam / Break | `usePhase.setPhase()` |
| 4 | "What are you studying?" | Add-course list (name + optional review interval in days, default 3) | `useCourses.addCourse()` |
| 5 | "Tell us about yourself" | Hobbies free-text tags + work hours toggle → time range | `useOnboarding.hobbies/workHours` |

**UI:**
- Meridian mark centered top
- 5 progress dots (filled = completed, current = accent, future = muted)
- Back / Continue buttons (Back hidden on step 1)
- Step 4 has "Add later →" skip link
- Step 5 work hours: toggle → reveals start/end time inputs
- On step 5 Continue: `onboarding.completed = true` → navigate to `/`

**Aesthetic:** Matches Login.jsx — centered card, 1px border, ink/paper, mono labels, no shadow.

---

## Dashboard Tooltip Tour

Triggers once on first dashboard load after wizard: `completed && !tourSeen`.

### 5 Tour Stops

| Stop | Target | Tooltip text |
|------|--------|-------------|
| 1 | Timeline planned lane header | "Your plan lives here. Drag blocks, resize, rearrange." |
| 2 | Timeline planned lane (▶ area) | "Hit play on any block to start tracking. Actual time logs to the right lane." |
| 3 | Phase selector | "Switch modes when exams hit or breaks start. Schedule adjusts automatically." |
| 4 | Streak counter | "Every day you track at least one block counts. Compounds fast." |
| 5 | BigThree panel | "Three things. That's your day's contract with yourself." |

### Mechanics

- Full-screen semi-transparent overlay (`bg-ink/40`) with CSS `clip-path` cutout around target
- Tooltip bubble anchors near target, auto-flips vertically if near screen edge
- Buttons: `Next →` (advances stop) / `Skip tour` (ends immediately)
- On stop 5 Next or any Skip: `onboarding.tourSeen = true`
- Target elements get a `data-tour="<stop-name>"` attribute for reliable selection

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useOnboarding.js` | Zustand store — completion flags + profile data |
| Create | `src/pages/Onboarding.jsx` | 5-step wizard, step state, writes to stores |
| Create | `src/components/Onboarding/OnboardingStep.jsx` | Step wrapper — progress dots, Back/Continue nav |
| Create | `src/components/Onboarding/TourTooltip.jsx` | Spotlight overlay + tooltip bubble |
| Modify | `src/components/Layout/Layout.jsx` | Add onboarding redirect gate |
| Modify | `src/App.jsx` | Add `/onboarding` route |

---

## Success Criteria

- New user registers → redirected to `/onboarding`
- Completing wizard sets name, wake time, phase, courses (if added), lifestyle data
- After wizard → redirected to `/`, tour starts automatically
- Tour highlights all 5 stops in order, skippable at any point
- Returning user (completed wizard) → no onboarding, no tour
- `tourSeen` persists across refreshes (Zustand persist)
