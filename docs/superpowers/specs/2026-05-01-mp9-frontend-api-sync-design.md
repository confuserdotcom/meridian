# MP9 — Frontend ↔ API Sync Design

**Date:** 2026-05-01  
**Status:** Approved  
**Goal:** Wire Meridian frontend to the Hono/Turso/better-auth API (MP8) using TanStack Query v5 as the server-state layer. Designed for SaaS scale, not just a personal dashboard.

---

## Decisions

| Question | Decision |
|---|---|
| Auth storage | Cookie sessions (better-auth default, CORS `credentials:true` already wired) |
| First login | Fresh start — no local data migration |
| Data layer | TanStack Query v5 for all server-backed data |
| Sync scope | tasks, timeLogs, courses, settings |
| Update debounce | Settings: 300ms debounce. All other mutations: immediate |
| Zustand fate | Keep for UI-only state; migrate 4 data stores to TQ |

---

## Architecture

```
src/
  lib/
    api.ts            ← typed fetch wrapper (credentials:include, throws on error)
    auth.ts           ← login / register / logout / getSession (plain fetch, not TQ)
    queryClient.ts    ← QueryClient with defaults + global 401 handler
  contexts/
    AuthContext.jsx   ← user state, session check on mount, exposes auth actions
  hooks/
    queries/
      useTasks.ts     ← replaces src/hooks/useTasks.js
      useTimeLogs.ts  ← replaces src/hooks/useTimeLog.js
      useCourses.ts   ← replaces src/hooks/useCourses.js
      useSettings.ts  ← replaces src/hooks/useSettings.js (includes phase)
    usePhase.js       ← stays, becomes bridge over useSettings TQ query
    (all other Zustand hooks untouched)
  pages/
    Login.jsx         ← new: email+password, Meridian mark centered
```

### What stays Zustand (untouched)
`useTimer`, `usePomodoro`, `useCalendarView`, `useCalendar`, `useStreak`, `useBigThree`, `useCheckin`

---

## Section 1 — API Client (`src/lib/api.ts`)

```ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function apiFetch<T>(path: string, options?: RequestInit & { body?: unknown }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  get:    <T>(path: string) => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
```

---

## Section 2 — Auth (`src/lib/auth.ts` + `src/contexts/AuthContext.jsx`)

**`src/lib/auth.ts`** — raw fetch wrappers (not TQ; auth state is not server cache):
- `login(email, password)` → `POST /auth/sign-in/email`
- `register(name, email, password)` → `POST /auth/sign-up/email`
- `logout()` → `POST /auth/sign-out`
- `getSession()` → `GET /me` → returns `{ data: User } | null`

**`AuthContext`**:
- On mount: calls `getSession()` → sets `user` or `null`
- While checking: `isLoading = true`
- Exposes: `{ user, isLoading, login, register, logout }`
- On `auth:expired` window event: sets `user = null`

**`Layout.jsx` auth gate**:
```
isLoading → full-screen: Meridian mark pulsing, centered
!user     → <Navigate to="/login" replace />
user      → <Outlet />
```

**`src/pages/Login.jsx`**:
- Centered column: Meridian mark SVG + "MERIDIAN" wordmark (Geist Mono, tracked)
- Email field + password field (1px border, `rounded-sm`, Geist)
- Submit button: flat ink fill, white text, `rounded-sm`
- Toggle: "No account? Register" / "Have account? Sign in" — inline, no separate route
- Error: plain muted text below form, no toast
- On success: `navigate('/', { replace: true })`

---

## Section 3 — QueryClient (`src/lib/queryClient.ts`)

```ts
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') {
        queryClient.clear();
        window.dispatchEvent(new Event('auth:expired'));
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});
```

`QueryClientProvider` + `AuthProvider` wrap the app in `main.jsx`.

---

## Section 4 — TQ Hook Pattern

All 4 resource hooks follow this shape. Example: tasks.

```ts
// Query
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<{ data: Task[] }>('/tasks').then(r => r.data),
  });
}

// Mutation (optimistic)
export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: NewTask) => api.post('/tasks', task),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) => [
        ...old,
        { ...item, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() },
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
// useUpdateTask, useDeleteTask, useToggleTask, useLogHours follow same shape
```

**Settings** — single-object PATCH with debounce:

> ⚠️ Implementation note: `debounce()` inside `mutationFn` breaks TQ (debounced fn doesn't return a Promise synchronously). Correct pattern: optimistic update fires immediately via `onMutate`; actual API call is debounced via a `useRef`-held debounced function that calls `mutate()`. Implementation resolves this — spec describes intent.

```ts
export function useUpdateSettings() {
  const qc = useQueryClient();
  const debouncedFn = useMemo(
    () => debounce((data: Partial<Settings>) => api.patch('/settings', data), 300),
    [],
  );
  return useMutation({
    mutationFn: (data) => debouncedFn(data) ?? Promise.resolve(),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['settings'] });
      const prev = qc.getQueryData<Settings>(['settings']);
      qc.setQueryData<Settings>(['settings'], (old) => ({ ...old!, ...updates }));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['settings'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
```

**Computed helpers** — extracted as plain functions in the same file, called with `data`:
```ts
export function getActiveTasks(tasks: Task[]) { return tasks.filter(t => !t.completed); }
export function getUrgencyScore(task: Task): number { /* existing logic */ }
export function predictDuration(logs: TimeLog[], category: string, plannedMins: number) { /* existing logic */ }
```

---

## Section 5 — `usePhase` Bridge

`usePhase.js` rewritten as a plain React hook (drops Zustand):

```ts
export function usePhase() {
  const { data: settings } = useSettings();
  const { mutate } = useUpdateSettings();
  return {
    phase: settings?.phase ?? 'normal',
    setPhase: (phase: Phase) => mutate({ phase }),
  };
}
```

⚠️ **Breaking change**: `usePhase(s => s.phase)` selector pattern removed. All consumers updated to `const { phase } = usePhase()`.

Same breaking change applies to all 4 migrated stores — `useX(s => s.field)` → `const { data } = useX()`.

---

## Section 6 — Error Handling + Offline

**Optimistic rollback**: each mutation's `onError` restores `ctx.prev` snapshot.

**401 expiry**: global `QueryCache.onError` fires `auth:expired` event → `AuthContext` sets `user = null` → Layout redirects to `/login`.

**Offline**: TQ `networkMode: 'offlineFirst'` on mutations means writes queue while offline and flush on reconnect. Cached reads stay available via `gcTime` default (5 min). No extra code needed.

**Loading states**: `isPending` from each query → skeleton (1px border box, same dimensions as content). `isError` → plain muted text + retry link. No spinners beyond the auth gate full-screen.

---

## Section 7 — Component Migration Scope

Files requiring consumer updates (selector pattern → TQ data):

| File | Change |
|---|---|
| `src/main.jsx` | Add `QueryClientProvider` + `AuthProvider` |
| `src/components/Layout/Layout.jsx` | Add auth gate (isLoading / !user) |
| `src/pages/Dashboard.jsx` | useTasks → TQ, useSettings → TQ |
| `src/pages/Courses.jsx` | useCourses → TQ |
| `src/pages/Tracker.jsx` | useTimeLog → useTimeLogs TQ |
| `src/pages/Timer.jsx` | useTimeLog.addLog → useAddTimeLog mutation (useTimeLogs) |
| `src/pages/Settings.jsx` | useSettings → TQ, usePhase → bridge |
| `src/components/Timeline/Timeline.jsx` | useTimeLog → TQ |

Files **not** touched: all un-migrated Zustand hooks, all style/token/data files, Coach, Rules, WeeklyOverview, DailyDetail (don't consume migrated stores directly).

---

## Environment Setup

`apps/web/.env.local` (or root `.env.local`):
```
VITE_API_URL=http://localhost:8787
```
Production: `VITE_API_URL=https://api.meridian.day` (set in Cloudflare Pages env vars).

**Dark mode flash**: `useSettings` query is async — on first render `data` is `undefined`. `useSettings.ts` must export a `useDarkMode()` helper that falls back to `localStorage.getItem('lcc-settings')` parsed value until query resolves, preventing flash-of-wrong-theme.

---

## Out of Scope (MP9)

- `useBigThree` sync (DB table exists, deferred to future MP)
- `useCalendar` schedule override sync
- Real-time multi-device push (polling via `refetchOnWindowFocus` is sufficient for now)
- Email verification flow
- Password reset
