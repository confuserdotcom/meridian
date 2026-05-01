# MP9 — Frontend ↔ API Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Meridian React frontend to the Hono/Turso/better-auth API using TanStack Query v5 as the server-state layer, replacing the 4 persisted Zustand stores (tasks, timeLogs, courses, settings).

**Architecture:** Cookie-based session auth (better-auth, already wired on API side). TanStack Query v5 handles all server-backed data with optimistic mutations + rollback. Zustand kept for pure UI state (timer, pomodoro, calendarView, calendar overrides, streak, bigThree, checkin).

**Tech Stack:** `@tanstack/react-query` v5, better-auth cookie sessions, Hono API at `VITE_API_URL`, TypeScript for all new files in `src/lib/` and `src/hooks/queries/`.

---

## File Map

**New files:**
- `src/lib/api.ts` — typed fetch wrapper
- `src/lib/queryClient.ts` — QueryClient singleton + global 401 handler
- `src/lib/auth.ts` — login/register/logout/getSession (plain fetch, not TQ)
- `src/contexts/AuthContext.jsx` — user state + session check on mount
- `src/pages/Login.jsx` — email+password login/register page
- `src/hooks/queries/useTasks.ts` — TQ hook replacing `src/hooks/useTasks.js`
- `src/hooks/queries/useTimeLogs.ts` — TQ hook replacing `src/hooks/useTimeLog.js`
- `src/hooks/queries/useCourses.ts` — TQ hook replacing `src/hooks/useCourses.js`
- `src/hooks/queries/useSettings.ts` — TQ hook replacing `src/hooks/useSettings.js`
- `.env.local` — `VITE_API_URL=http://localhost:8787`

**Modified files:**
- `src/main.jsx` — add QueryClientProvider + AuthProvider
- `src/App.jsx` — add /login route, update useSettings import
- `src/hooks/usePhase.js` — rewrite as bridge over useSettings TQ
- `src/components/Layout/Layout.jsx` — add auth gate
- `src/components/Timeline/Timeline.jsx` — migrate 4 store usages
- `src/components/Timeline/TimerBar.jsx` — migrate useTimeLog.addLog
- `src/components/StudySuggestions/StudySuggestions.jsx` — migrate useTasks + useCourses
- `src/components/CircularPomodoro/CircularPomodoro.jsx` — migrate useTasks + useCourses
- `src/components/Pomodoro/Pomodoro.jsx` — migrate useCourses
- `src/components/PhaseSelector/PhaseSelector.jsx` — migrate usePhase
- `src/components/StatsCards/StatsCards.jsx` — migrate usePhase
- `src/components/EndOfDayLog/EndOfDayLog.jsx` — migrate usePhase
- `src/pages/Dashboard.jsx` — migrate usePhase
- `src/pages/Tracker.jsx` — migrate useTimeLogs
- `src/pages/Courses.jsx` — migrate useCourses
- `src/pages/Coach.jsx` — migrate useTasks + useCourses
- `src/pages/Settings.jsx` — migrate useSettings + usePhase
- `src/pages/DailyDetail.jsx` — migrate usePhase
- `src/pages/WeeklyOverview.jsx` — migrate usePhase
- `src/pages/Rules.jsx` — migrate usePhase (if uses selector)
- `src/components/ParticleBackground/ParticleBackground.jsx` — migrate useSettings

**Deleted at end:**
- `src/hooks/useTasks.js`
- `src/hooks/useTimeLog.js`
- `src/hooks/useCourses.js`
- `src/hooks/useSettings.js`

---

## Task 1: Foundation — install TQ, api client, queryClient

**Files:**
- Create: `.env.local`
- Create: `src/lib/api.ts`
- Create: `src/lib/queryClient.ts`

- [ ] **Step 1: Install @tanstack/react-query**

```bash
npm install @tanstack/react-query
```

Expected: package added to `package.json` dependencies.

- [ ] **Step 2: Create `.env.local`**

```
VITE_API_URL=http://localhost:8787
```

- [ ] **Step 3: Create `src/lib/api.ts`**

```ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function apiFetch<T>(
  path: string,
  options?: Omit<RequestInit, 'body'> & { body?: unknown },
): Promise<T> {
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
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',   body }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT',    body }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH',  body }),
  delete: <T>(path: string) =>               apiFetch<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Step 4: Create `src/lib/queryClient.ts`**

```ts
import { QueryClient, QueryCache } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        queryClient.clear();
        window.dispatchEvent(new Event('auth:expired'));
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/Apple/Downloads/app && npm run build 2>&1 | tail -20
```

Expected: build succeeds (these files have no consumers yet, no errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/api.ts src/lib/queryClient.ts .env.local package.json package-lock.json
git commit -m "feat(mp9): add TQ foundation — api client + queryClient + env"
```

---

## Task 2: Auth layer — auth.ts, AuthContext, Login page

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/contexts/AuthContext.jsx`
- Create: `src/pages/Login.jsx`

- [ ] **Step 1: Create `src/lib/auth.ts`**

```ts
import type { User } from '@meridian/shared/schema';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function authFetch(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any)?.message ?? 'Auth error');
  }
  return res.json();
}

export async function login(email: string, password: string) {
  return authFetch('/auth/sign-in/email', { email, password });
}

export async function register(name: string, email: string, password: string) {
  return authFetch('/auth/sign-up/email', { name, email, password });
}

export async function logout() {
  await fetch(`${BASE}/auth/sign-out`, { method: 'POST', credentials: 'include' });
}

export async function getSession(): Promise<{ data: User } | null> {
  const res = await fetch(`${BASE}/me`, { credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}
```

- [ ] **Step 2: Create `src/contexts/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as authLogin, register as authRegister, logout as authLogout, getSession } from '../lib/auth';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    const session = await getSession();
    setUser(session?.data ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    await authLogin(email, password);
    await checkSession();
  }, [checkSession]);

  const register = useCallback(async (name, email, password) => {
    await authRegister(name, email, password);
    await checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    await authLogout();
    queryClient.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Create `src/pages/Login.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function MeridianMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="0" x2="12" y2="24" />
    </svg>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Name required'); setLoading(false); return; }
        await register(name, email, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-ink flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center gap-3 mb-10">
          <MeridianMark size={28} />
          <span className="font-mono text-[11px] tracking-[0.28em] text-ink dark:text-paper">MERIDIAN</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-line dark:border-[#222] bg-transparent px-3 py-2 text-sm font-sans text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent rounded-sm"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-line dark:border-[#222] bg-transparent px-3 py-2 text-sm font-sans text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent rounded-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-line dark:border-[#222] bg-transparent px-3 py-2 text-sm font-sans text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent rounded-sm"
          />

          {error && (
            <p className="text-[11px] font-mono text-muted">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink dark:bg-paper text-paper dark:text-ink font-mono text-[10px] uppercase tracking-[0.18em] py-2.5 rounded-sm disabled:opacity-50 transition-opacity"
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          className="mt-4 w-full text-center font-mono text-[10px] text-muted hover:text-ink dark:hover:text-paper transition-colors"
        >
          {mode === 'login' ? 'No account? Register' : 'Have account? Sign in'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/contexts/AuthContext.jsx src/pages/Login.jsx
git commit -m "feat(mp9): add auth layer — auth.ts, AuthContext, Login page"
```

---

## Task 3: Wire providers + auth gate + /login route

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Layout/Layout.jsx`

- [ ] **Step 1: Update `src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Update `src/App.jsx`**

Add `/login` route and handle dark mode with a local storage fallback (settings are async now — this is fixed properly in Task 7; for now keep the Zustand import):

```jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import WeeklyOverview from './pages/WeeklyOverview';
import DailyDetail from './pages/DailyDetail';
import Coach from './pages/Coach';
import Courses from './pages/Courses';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import Tracker from './pages/Tracker';
import Timer from './pages/Timer';
import Login from './pages/Login';
import { useSettings } from './hooks/useSettings';

export default function App() {
  const darkMode = useSettings((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
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

- [ ] **Step 3: Add auth gate to `src/components/Layout/Layout.jsx`**

Add these imports at the top of the existing file:

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
```

Replace the `export default function Layout()` body — add auth check at the top before the existing return:

```jsx
export default function Layout() {
  const { user, isLoading } = useAuth();
  const streak = useStreak((s) => s.count);
  const pomodoroRunning = usePomodoro((s) => s.isRunning);
  const pomodoroSeconds = usePomodoro((s) => s.secondsLeft);

  const pomodoroMins = Math.floor(pomodoroSeconds / 60);
  const pomodoroSecs = pomodoroSeconds % 60;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-ink flex items-center justify-center">
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="animate-pulse text-muted">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="0" x2="12" y2="24" />
        </svg>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    // ... rest of existing JSX unchanged ...
  );
}
```

The full updated `src/components/Layout/Layout.jsx`:

```jsx
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, BookOpen, Settings, Brain, GraduationCap, Clock, Timer } from 'lucide-react';
import { useStreak } from '../../hooks/useStreak';
import { usePomodoro } from '../../hooks/usePomodoro';
import { useAuth } from '../../contexts/AuthContext';
import { sounds } from '../../utils/sounds';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Today' },
  { to: '/week', icon: CalendarDays, label: 'Week' },
  { to: '/timer', icon: Timer, label: 'Timer' },
  { to: '/coach', icon: Brain, label: 'Coach' },
  { to: '/courses', icon: GraduationCap, label: 'Courses' },
  { to: '/tracker', icon: Clock, label: 'Track' },
  { to: '/rules', icon: BookOpen, label: 'Rules' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function MeridianMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="0" x2="12" y2="24" />
    </svg>
  );
}

export default function Layout() {
  const { user, isLoading } = useAuth();
  const streak = useStreak((s) => s.count);
  const pomodoroRunning = usePomodoro((s) => s.isRunning);
  const pomodoroSeconds = usePomodoro((s) => s.secondsLeft);

  const pomodoroMins = Math.floor(pomodoroSeconds / 60);
  const pomodoroSecs = pomodoroSeconds % 60;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-ink flex items-center justify-center">
        <MeridianMark size={24} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-paper dark:bg-ink text-ink dark:text-paper transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-paper/80 dark:bg-ink/80 backdrop-blur-md border-b border-line dark:border-[#222]">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MeridianMark size={18} />
            <span className="font-mono text-[11px] font-medium tracking-[0.28em] hidden sm:block">MERIDIAN</span>
          </div>

          <nav className="flex items-center">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => sounds.click()}
                className={({ isActive }) =>
                  `relative flex items-center justify-center h-12 w-11 sm:w-auto sm:px-3 text-[10px] font-mono tracking-[0.18em] uppercase transition-colors after:absolute after:bottom-0 after:left-2 after:right-2 after:h-px ${
                    isActive
                      ? 'text-ink dark:text-paper after:bg-accent'
                      : 'text-muted hover:text-ink dark:hover:text-paper after:bg-transparent'
                  }`
                }
              >
                {({ isActive: _ }) => (
                  <>
                    <Icon size={16} className="sm:hidden" strokeWidth={1.5} />
                    <span className="hidden sm:inline">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 min-w-0">
            {pomodoroRunning && (
              <span className="font-mono text-[10px] tabular-nums text-ink dark:text-paper border border-line dark:border-[#222] px-1.5 py-0.5">
                {String(pomodoroMins).padStart(2, '0')}:{String(pomodoroSecs).padStart(2, '0')}
              </span>
            )}
            {streak > 0 && (
              <span className="font-mono text-[10px] text-accent tracking-wider">{streak}d</span>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Start dev server and verify redirect**

```bash
npm run dev
```

Open `http://localhost:5173`. Expected: redirected to `/login`. Login page shows Meridian mark + email/password form. (Register won't work yet — API must be running. Auth gate works without API being up.)

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx src/App.jsx src/components/Layout/Layout.jsx
git commit -m "feat(mp9): wire QueryClientProvider, AuthProvider, auth gate, /login route"
```

---

## Task 4: useTasks TQ hook + migrate consumers

**Files:**
- Create: `src/hooks/queries/useTasks.ts`
- Modify: `src/components/Timeline/Timeline.jsx` (tasks part only — do full migration in Task 6)
- Modify: `src/components/StudySuggestions/StudySuggestions.jsx`
- Modify: `src/components/CircularPomodoro/CircularPomodoro.jsx`
- Modify: `src/pages/Coach.jsx`

- [ ] **Step 1: Create `src/hooks/queries/useTasks.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@meridian/shared/schema';

// ─── Query ────────────────────────────────────────────────────────────────────

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<{ data: Task[] }>('/tasks').then((r) => r.data),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: CreateTaskInput) => api.post<{ data: Task }>('/tasks', task),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) => [
        ...old,
        {
          id: 'temp-' + Date.now(),
          userId: '',
          title: item.title,
          courseId: item.courseId ?? null,
          deadline: item.deadline,
          estimatedHours: item.estimatedHours,
          hoursSpent: 0,
          completed: false,
          isExam: item.isExam ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskInput }) =>
      api.patch<{ data: Task }>(`/tasks/${id}`, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) => old.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch<{ data: Task }>(`/tasks/${id}`, { completed }),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, completed } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useLogTaskHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hoursSpent }: { id: string; hoursSpent: number }) =>
      api.patch<{ data: Task }>(`/tasks/${id}`, { hoursSpent }),
    onMutate: async ({ id, hoursSpent }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, hoursSpent } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── Computed helpers (pure functions, no store) ─────────────────────────────

export function getActiveTasks(tasks: Task[]) {
  return tasks.filter((t) => !t.completed);
}

export function getUrgencyScore(task: Task): number {
  if (task.completed) return 0;
  const now = Date.now();
  const deadline = new Date(task.deadline).getTime();
  const hoursLeft = Math.max(0, (deadline - now) / (1000 * 60 * 60));
  const hoursNeeded = Math.max(0, task.estimatedHours - task.hoursSpent);
  const progress = task.estimatedHours > 0 ? task.hoursSpent / task.estimatedHours : 0;
  const examMultiplier = task.isExam ? 1.5 : 1;

  if (hoursLeft <= 0) return 100;
  if (hoursLeft <= 24 && progress < 0.5) return 95 * examMultiplier;
  if (hoursLeft <= 48 && progress < 0.5) return 85 * examMultiplier;

  const timeRatio = hoursNeeded / Math.max(1, hoursLeft / 24);
  return Math.min(100, Math.round(timeRatio * 40 * examMultiplier));
}

export function getAtRiskTasks(tasks: Task[]) {
  return tasks
    .filter((t) => !t.completed)
    .map((t) => ({ ...t, urgency: getUrgencyScore(t) }))
    .filter((t) => t.urgency >= 60)
    .sort((a, b) => b.urgency - a.urgency);
}

export function isRescueMode(tasks: Task[]) {
  return getAtRiskTasks(tasks).length >= 3;
}
```

- [ ] **Step 2: Migrate `src/pages/Coach.jsx`**

Replace the useTasks + useCourses imports and destructuring. Find these lines at the top:

```jsx
import { useTasks } from '../hooks/useTasks';
import { useCourses } from '../hooks/useCourses';
```

Replace with:

```jsx
import { useTasks, getActiveTasks, getUrgencyScore, getAtRiskTasks, isRescueMode as checkRescueMode } from '../hooks/queries/useTasks';
import { useAddTask, useDeleteTask, useToggleTask } from '../hooks/queries/useTasks';
import { useCourses } from '../hooks/useCourses'; // migrated in Task 6
```

Find and replace the store destructuring:

```jsx
// OLD:
const { tasks, addTask, removeTask, toggleComplete, getUrgencyScore, getAtRiskTasks, isRescueMode } = useTasks();
const { courses, getEffectiveConfidence, getDecayInfo } = useCourses();

// NEW:
const { data: tasks = [] } = useTasks();
const { mutate: addTask } = useAddTask();
const { mutate: removeTask } = useDeleteTask();
const { mutate: toggleComplete } = useToggleTask();
const { courses, getEffectiveConfidence, getDecayInfo } = useCourses(); // courses stays until Task 6
```

Update call sites:
- `addTask({ title, deadline, estimatedHours, isExam })` → same shape, matches `CreateTaskInput` ✓
- `removeTask(id)` → same ✓
- `toggleComplete(id)` → becomes `toggleComplete({ id, completed: !task.completed })`
- `getUrgencyScore(task)` → `getUrgencyScore(task)` (imported function, same call)
- `getAtRiskTasks()` → `getAtRiskTasks(tasks)`
- `isRescueMode()` → `checkRescueMode(tasks)`

- [ ] **Step 3: Migrate `src/components/StudySuggestions/StudySuggestions.jsx`**

```jsx
// OLD imports:
import { useCourses } from '../../hooks/useCourses';
import { useTasks } from '../../hooks/useTasks';

// NEW imports:
import { useTasks } from '../../hooks/queries/useTasks';
import { useCourses } from '../../hooks/useCourses'; // migrated in Task 6
```

```jsx
// OLD:
const { courses, getDecayInfo, getEffectiveConfidence } = useCourses();
const { tasks } = useTasks();

// NEW:
const { courses, getDecayInfo, getEffectiveConfidence } = useCourses();
const { data: tasks = [] } = useTasks();
```

- [ ] **Step 4: Migrate `src/components/CircularPomodoro/CircularPomodoro.jsx`**

```jsx
// OLD imports:
import { useCourses } from '../../hooks/useCourses';
import { useTasks } from '../../hooks/useTasks';

// NEW imports:
import { useTasks, useLogTaskHours } from '../../hooks/queries/useTasks';
import { useCourses } from '../../hooks/useCourses'; // migrated in Task 6
```

```jsx
// OLD:
const courses = useCourses((s) => s.courses);
const logStudyTime = useCourses((s) => s.logStudyTime);
const tasks = useTasks((s) => s.tasks);
const logHours = useTasks((s) => s.logHours);

// NEW:
const courses = useCourses((s) => s.courses);
const logStudyTime = useCourses((s) => s.logStudyTime);
const { data: tasks = [] } = useTasks();
const { mutate: logHoursMutate } = useLogTaskHours();
```

Update `logHours(id, hours)` call sites — the old signature adds hours cumulatively. New API takes absolute `hoursSpent`. Compute new value inline:

```jsx
// OLD: logHours(taskId, hoursToAdd)
// NEW: find task, compute new total, call mutation
const task = tasks.find((t) => t.id === taskId);
if (task) logHoursMutate({ id: taskId, hoursSpent: Math.round((task.hoursSpent + hoursToAdd) * 10) / 10 });
```

- [ ] **Step 5: Start API (separate terminal) and verify tasks load**

```bash
# terminal 1
cd /Users/Apple/Downloads/app/apps/api && npx wrangler dev

# terminal 2
npm run dev
```

Open `http://localhost:5173/login`, register an account, navigate to `/coach`. Expected: tasks list renders (empty for new account). Add a task — it should appear immediately (optimistic) and persist.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/queries/useTasks.ts src/pages/Coach.jsx src/components/StudySuggestions/StudySuggestions.jsx src/components/CircularPomodoro/CircularPomodoro.jsx
git commit -m "feat(mp9): useTasks TQ hook + migrate Coach, StudySuggestions, CircularPomodoro"
```

---

## Task 5: useTimeLogs TQ hook + migrate consumers

**Files:**
- Create: `src/hooks/queries/useTimeLogs.ts`
- Modify: `src/components/Timeline/TimerBar.jsx`
- Modify: `src/components/Timeline/Timeline.jsx` (logs part only)
- Modify: `src/pages/Tracker.jsx`

**Important:** The API stores `plannedStart`, `plannedEnd`, `actualStart`, `actualEnd` as integers (minutes since midnight). The session object from `useTimer.stopTimer()` has these as HH:MM strings. Use `parseTime` from `src/utils/time.js` to convert.

- [ ] **Step 1: Create `src/hooks/queries/useTimeLogs.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { TimeLog, CreateTimeLogInput } from '@meridian/shared/schema';
import { parseTime } from '../utils/time';

// ─── Query ────────────────────────────────────────────────────────────────────

export function useTimeLogs(date?: string) {
  return useQuery({
    queryKey: date ? ['timeLogs', date] : ['timeLogs'],
    queryFn: () =>
      api
        .get<{ data: TimeLog[] }>(date ? `/logs?date=${date}` : '/logs')
        .then((r) => r.data),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** session: the object returned by useTimer.stopTimer() */
export function useAddTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (session: {
      category: string;
      plannedStart: string;
      plannedEnd: string;
      actualStart: string;
      actualEnd: string;
      date: string;
      taskName?: string;
    }) => {
      const input: CreateTimeLogInput = {
        category: session.category,
        plannedStart: parseTime(session.plannedStart),
        plannedEnd:   parseTime(session.plannedEnd),
        actualStart:  parseTime(session.actualStart),
        actualEnd:    parseTime(session.actualEnd),
        date: session.date,
        note: session.taskName ?? undefined,
      };
      return api.post<{ data: TimeLog }>('/logs', input);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['timeLogs'] }),
  });
}

export function useDeleteTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/logs/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['timeLogs'] });
      const prev = qc.getQueryData<TimeLog[]>(['timeLogs']);
      qc.setQueryData<TimeLog[]>(['timeLogs'], (old = []) => old.filter((l) => l.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['timeLogs'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['timeLogs'] }),
  });
}

// ─── Computed helpers ─────────────────────────────────────────────────────────

/** Exponentially-weighted prediction of actual duration given category + planned minutes */
export function predictDuration(
  logs: TimeLog[],
  category: string,
  plannedMinutes: number,
): { predicted: number; confidence: number; ratio: number; samples: number } {
  const relevant = logs.filter(
    (l) =>
      l.category === category &&
      l.plannedEnd - l.plannedStart > 0 &&
      l.actualEnd - l.actualStart > 0,
  );

  if (relevant.length === 0) {
    return { predicted: plannedMinutes, confidence: 0, ratio: 1, samples: 0 };
  }

  const sorted = [...relevant].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const decay = 0.82;
  let weightSum = 0;
  let ratioSum = 0;
  sorted.forEach((log, i) => {
    const weight = Math.pow(decay, sorted.length - 1 - i);
    const planned = log.plannedEnd - log.plannedStart;
    const actual = log.actualEnd - log.actualStart;
    const ratio = actual / planned;
    ratioSum += ratio * weight;
    weightSum += weight;
  });

  const avgRatio = weightSum > 0 ? ratioSum / weightSum : 1;
  const confidence = Math.min(100, Math.round((sorted.length / 8) * 100));
  const predicted = Math.max(5, Math.round(plannedMinutes * avgRatio));

  return { predicted, confidence, ratio: Math.round(avgRatio * 100) / 100, samples: sorted.length };
}

export function getDateSummary(logs: TimeLog[], date: string) {
  const dayLogs = logs.filter((l) => l.date === date);
  if (dayLogs.length === 0) return { sessions: 0, planned: 0, actual: 0, variance: 0 };

  const actual = dayLogs.reduce((s, l) => s + (l.actualEnd - l.actualStart), 0);
  const planned = dayLogs.reduce((s, l) => s + (l.plannedEnd - l.plannedStart), 0);
  return { sessions: dayLogs.length, planned, actual, variance: actual - planned };
}
```

Note: `parseTime` is in `src/utils/time.js`. Import path from `src/hooks/queries/` is `../../utils/time` — adjust if linting complains about JS in TS context.

- [ ] **Step 2: Migrate `src/components/Timeline/TimerBar.jsx`**

```jsx
// OLD:
import { useTimeLog } from '../../hooks/useTimeLog';
// ...
const addLog = useTimeLog((s) => s.addLog);
// ...
addLog(session);

// NEW:
import { useAddTimeLog } from '../../hooks/queries/useTimeLogs';
// ...
const { mutate: addLog } = useAddTimeLog();
// ...
addLog(session); // session shape matches: has category, plannedStart/End, actualStart/End, date, taskName
```

Full updated imports section of `TimerBar.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';
import { useAddTimeLog } from '../../hooks/queries/useTimeLogs';
import { sounds } from '../../utils/sounds';
```

In `TimerBar` component:

```jsx
const { mutate: addLog } = useAddTimeLog();
```

`handleStop` remains the same — `addLog(session)` still works because `useAddTimeLog` accepts the session shape.

- [ ] **Step 3: Migrate `src/pages/Tracker.jsx`**

```jsx
// OLD:
import { useTimeLog } from '../hooks/useTimeLog';
// const logs = useTimeLog((s) => s.logs);
// const removeLog = useTimeLog((s) => s.removeLog);
// const clearAll = useTimeLog((s) => s.clearAll);
// const getDateSummary = useTimeLog((s) => s.getDateSummary);
// const predictDuration = useTimeLog((s) => s.predictDuration);

// NEW:
import { useTimeLogs, useDeleteTimeLog, predictDuration, getDateSummary } from '../hooks/queries/useTimeLogs';
```

Replace store calls:

```jsx
const { data: logs = [] } = useTimeLogs();
const { mutate: removeLog } = useDeleteTimeLog();
// clearAll: not supported by API (no bulk delete endpoint). Remove the clearAll button or leave it for a future endpoint.
```

Update call sites:
- `removeLog(id)` → same ✓
- `getDateSummary(date)` → `getDateSummary(logs, date)` (now a pure function)
- `predictDuration(category, plannedMins)` → `predictDuration(logs, category, plannedMins)`

- [ ] **Step 4: Migrate logs usage in `src/components/Timeline/Timeline.jsx`**

```jsx
// OLD:
import { useTimeLog } from '../../hooks/useTimeLog';
// const logs = useTimeLog((s) => s.logs);
// const predictDuration = useTimeLog((s) => s.predictDuration);

// NEW:
import { useTimeLogs, predictDuration } from '../../hooks/queries/useTimeLogs';
```

```jsx
// OLD:
const logs = useTimeLog((s) => s.logs);
const predictDuration = useTimeLog((s) => s.predictDuration);

// NEW:
const { data: logs = [] } = useTimeLogs();
// predictDuration is now an imported function — update call sites:
// OLD: predictDuration(category, plannedMins)
// NEW: predictDuration(logs, category, plannedMins)
```

- [ ] **Step 5: Verify timer + tracker flow**

With API running:
1. Start a timer on any block → stop it
2. Navigate to `/tracker` — log should appear
3. Delete a log — it should disappear (optimistic)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/queries/useTimeLogs.ts src/components/Timeline/TimerBar.jsx src/components/Timeline/Timeline.jsx src/pages/Tracker.jsx
git commit -m "feat(mp9): useTimeLogs TQ hook + migrate TimerBar, Timeline, Tracker"
```

---

## Task 6: useCourses TQ hook + migrate consumers

**Files:**
- Create: `src/hooks/queries/useCourses.ts`
- Modify: `src/components/Timeline/Timeline.jsx` (courses part)
- Modify: `src/components/StudySuggestions/StudySuggestions.jsx`
- Modify: `src/components/CircularPomodoro/CircularPomodoro.jsx`
- Modify: `src/components/Pomodoro/Pomodoro.jsx`
- Modify: `src/pages/Coach.jsx`
- Modify: `src/pages/Courses.jsx`

**Note:** `lastStudied` in the API is Unix seconds (integer). The local Zustand store stored it as ISO date string. When calling `logStudyTime`, pass `Math.floor(Date.now() / 1000)`. When computing `getDecayInfo`, multiply by 1000: `new Date(course.lastStudied * 1000)`.

- [ ] **Step 1: Create `src/hooks/queries/useCourses.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Course, CreateCourseInput, UpdateCourseInput } from '@meridian/shared/schema';

const DECAY_THRESHOLD_DAYS = 5;
const DECAY_RATE = 2;
const DECAY_CAP = 20;

// ─── Query ────────────────────────────────────────────────────────────────────

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<{ data: Course[] }>('/courses').then((r) => r.data),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useAddCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (course: CreateCourseInput) => api.post<{ data: Course }>('/courses', course),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ['courses'] });
      const prev = qc.getQueryData<Course[]>(['courses']);
      qc.setQueryData<Course[]>(['courses'], (old = []) => [
        ...old,
        {
          id: 'temp-' + Date.now(),
          userId: '',
          name: item.name,
          importance: item.importance,
          confidence: item.confidence,
          hoursTarget: item.hoursTarget,
          hoursLogged: 0,
          lastStudied: null,
          weeklyRatings: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['courses'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateCourseInput }) =>
      api.patch<{ data: Course }>(`/courses/${id}`, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ['courses'] });
      const prev = qc.getQueryData<Course[]>(['courses']);
      qc.setQueryData<Course[]>(['courses'], (old = []) =>
        old.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['courses'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['courses'] });
      const prev = qc.getQueryData<Course[]>(['courses']);
      qc.setQueryData<Course[]>(['courses'], (old = []) => old.filter((c) => c.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['courses'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useLogStudyTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours, currentHoursLogged }: { id: string; hours: number; currentHoursLogged: number }) =>
      api.patch<{ data: Course }>(`/courses/${id}`, {
        hoursLogged: Math.round((currentHoursLogged + hours) * 10) / 10,
        lastStudied: Math.floor(Date.now() / 1000),
      }),
    onMutate: async ({ id, hours, currentHoursLogged }) => {
      await qc.cancelQueries({ queryKey: ['courses'] });
      const prev = qc.getQueryData<Course[]>(['courses']);
      qc.setQueryData<Course[]>(['courses'], (old = []) =>
        old.map((c) =>
          c.id === id
            ? {
                ...c,
                hoursLogged: Math.round((currentHoursLogged + hours) * 10) / 10,
                lastStudied: Math.floor(Date.now() / 1000),
              }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['courses'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useSubmitWeeklyRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      rating,
      note,
      currentRatings,
    }: {
      id: string;
      rating: number;
      note: string;
      currentRatings: { week: string; rating: number; note: string }[];
    }) => {
      const week = new Date().toISOString().slice(0, 10);
      const weeklyRatings = [
        ...currentRatings.slice(-11),
        { week, rating, note },
      ];
      return api.patch<{ data: Course }>(`/courses/${id}`, {
        confidence: rating * 20,
        weeklyRatings,
      });
    },
    onMutate: async ({ id, rating, note, currentRatings }) => {
      await qc.cancelQueries({ queryKey: ['courses'] });
      const prev = qc.getQueryData<Course[]>(['courses']);
      const week = new Date().toISOString().slice(0, 10);
      qc.setQueryData<Course[]>(['courses'], (old = []) =>
        old.map((c) =>
          c.id === id
            ? {
                ...c,
                confidence: rating * 20,
                weeklyRatings: [...c.weeklyRatings.slice(-11), { week, rating, note }],
              }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['courses'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

// ─── Computed helpers ─────────────────────────────────────────────────────────

export function getDecayInfo(course: Course) {
  if (!course.lastStudied) return { decayed: false, daysSince: null, decayAmount: 0 };
  const daysSince = Math.floor(
    (Date.now() - course.lastStudied * 1000) / (1000 * 60 * 60 * 24),
  );
  if (daysSince <= DECAY_THRESHOLD_DAYS) return { decayed: false, daysSince, decayAmount: 0 };
  const decayDays = daysSince - DECAY_THRESHOLD_DAYS;
  const decayAmount = Math.min(decayDays * DECAY_RATE, DECAY_CAP);
  return { decayed: true, daysSince, decayAmount };
}

export function getEffectiveConfidence(course: Course) {
  const { decayAmount } = getDecayInfo(course);
  return Math.max(0, course.confidence - decayAmount);
}
```

- [ ] **Step 2: Migrate `src/components/Timeline/Timeline.jsx` (courses part)**

```jsx
// OLD:
import { useCourses } from '../../hooks/useCourses';
// const courses = useCourses((s) => s.courses);
// const getDecayInfo = useCourses((s) => s.getDecayInfo);
// const getEffectiveConfidence = useCourses((s) => s.getEffectiveConfidence);

// NEW:
import { useCourses, getDecayInfo, getEffectiveConfidence } from '../../hooks/queries/useCourses';
```

```jsx
// OLD:
const courses = useCourses((s) => s.courses);
const getDecayInfo = useCourses((s) => s.getDecayInfo);
const getEffectiveConfidence = useCourses((s) => s.getEffectiveConfidence);

// NEW:
const { data: courses = [] } = useCourses();
// getDecayInfo and getEffectiveConfidence are now imported functions
// Update call sites: getDecayInfo(course) and getEffectiveConfidence(course) — same call signatures ✓
```

- [ ] **Step 3: Migrate `src/components/StudySuggestions/StudySuggestions.jsx`**

```jsx
// OLD:
import { useCourses } from '../../hooks/useCourses';
// const { courses, getDecayInfo, getEffectiveConfidence } = useCourses();

// NEW:
import { useCourses, getDecayInfo, getEffectiveConfidence } from '../../hooks/queries/useCourses';
```

```jsx
// OLD:
const { courses, getDecayInfo, getEffectiveConfidence } = useCourses();

// NEW:
const { data: courses = [] } = useCourses();
// getDecayInfo and getEffectiveConfidence are imported functions — call sites unchanged ✓
```

- [ ] **Step 4: Migrate `src/components/CircularPomodoro/CircularPomodoro.jsx`**

```jsx
// OLD:
import { useCourses } from '../../hooks/useCourses';
// const courses = useCourses((s) => s.courses);
// const logStudyTime = useCourses((s) => s.logStudyTime);

// NEW:
import { useCourses, useLogStudyTime } from '../../hooks/queries/useCourses';
```

```jsx
// OLD:
const courses = useCourses((s) => s.courses);
const logStudyTime = useCourses((s) => s.logStudyTime);

// NEW:
const { data: courses = [] } = useCourses();
const { mutate: logStudyTimeMutate } = useLogStudyTime();
```

Update `logStudyTime(id, hours)` call sites:

```jsx
// OLD: logStudyTime(courseId, hours)
// NEW: need current hoursLogged to compute new total
const course = courses.find((c) => c.id === courseId);
if (course) logStudyTimeMutate({ id: courseId, hours, currentHoursLogged: course.hoursLogged });
```

- [ ] **Step 5: Migrate `src/components/Pomodoro/Pomodoro.jsx`**

```jsx
// OLD:
import { useCourses } from '../../hooks/useCourses';
// const { courses, logStudyTime } = useCourses();

// NEW:
import { useCourses, useLogStudyTime } from '../../hooks/queries/useCourses';
```

```jsx
// OLD:
const { courses, logStudyTime } = useCourses();

// NEW:
const { data: courses = [] } = useCourses();
const { mutate: logStudyTimeMutate } = useLogStudyTime();
```

Same call site update as CircularPomodoro above.

- [ ] **Step 6: Migrate `src/pages/Coach.jsx` (courses part)**

```jsx
// Replace the still-Zustand useCourses import added in Task 4:
// OLD: import { useCourses } from '../hooks/useCourses';
// NEW:
import { useCourses, getEffectiveConfidence, getDecayInfo } from '../hooks/queries/useCourses';
```

```jsx
// OLD: const { courses, getEffectiveConfidence, getDecayInfo } = useCourses();
// NEW:
const { data: courses = [] } = useCourses();
// getEffectiveConfidence and getDecayInfo are now imported functions — call sites unchanged ✓
```

- [ ] **Step 7: Migrate `src/pages/Courses.jsx`**

Read the full file to understand all destructured methods, then replace:

```jsx
// OLD:
import { useCourses } from '../hooks/useCourses';
const { addCourse, updateCourse, removeCourse, logStudyTime, submitWeeklyRating, getDecayInfo, getEffectiveConfidence } = useCourses();

// NEW:
import {
  useCourses,
  useAddCourse,
  useUpdateCourse,
  useDeleteCourse,
  useLogStudyTime,
  useSubmitWeeklyRating,
  getDecayInfo,
  getEffectiveConfidence,
} from '../hooks/queries/useCourses';
```

```jsx
const { data: courses = [] } = useCourses();
const { mutate: addCourse } = useAddCourse();
const { mutate: updateCourse } = useUpdateCourse();
const { mutate: removeCourse } = useDeleteCourse();
const { mutate: logStudyTimeMutate } = useLogStudyTime();
const { mutate: submitWeeklyRating } = useSubmitWeeklyRating();
```

Update call sites:
- `addCourse({ name, importance, confidence, hoursTarget })` → same shape ✓
- `updateCourse(id, updates)` → `updateCourse({ id, updates })`
- `removeCourse(id)` → same ✓
- `logStudyTime(id, hours)` → `logStudyTimeMutate({ id, hours, currentHoursLogged: course.hoursLogged })`
- `submitWeeklyRating(id, rating, note)` → `submitWeeklyRating({ id, rating, note, currentRatings: course.weeklyRatings })`
- `getDecayInfo(course)` and `getEffectiveConfidence(course)` → same, they're now imported functions ✓

- [ ] **Step 8: Verify courses page**

With API running: navigate to `/courses`. Courses list loads (empty for new account). Add a course — it appears immediately. Submit weekly rating. Check decay display.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/queries/useCourses.ts src/components/Timeline/Timeline.jsx src/components/StudySuggestions/StudySuggestions.jsx src/components/CircularPomodoro/CircularPomodoro.jsx src/components/Pomodoro/Pomodoro.jsx src/pages/Coach.jsx src/pages/Courses.jsx
git commit -m "feat(mp9): useCourses TQ hook + migrate all consumers"
```

---

## Task 7: useSettings TQ hook + usePhase bridge + migrate all consumers

**Files:**
- Create: `src/hooks/queries/useSettings.ts`
- Modify: `src/hooks/usePhase.js`
- Modify: `src/App.jsx`
- Modify: `src/pages/Settings.jsx`
- Modify: `src/components/PhaseSelector/PhaseSelector.jsx`
- Modify: `src/components/StatsCards/StatsCards.jsx`
- Modify: `src/components/EndOfDayLog/EndOfDayLog.jsx`
- Modify: `src/components/ParticleBackground/ParticleBackground.jsx`
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/DailyDetail.jsx`
- Modify: `src/pages/WeeklyOverview.jsx`
- Modify: `src/pages/Rules.jsx` (if uses selector)

**Note:** Settings API uses `PUT /settings` (upsert), not PATCH.

- [ ] **Step 1: Create `src/hooks/queries/useSettings.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Settings, UpdateSettingsInput } from '@meridian/shared/schema';

// Simple debounce — no lodash needed
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─── Query ────────────────────────────────────────────────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: Settings }>('/settings').then((r) => r.data),
  });
}

/** Synchronous dark mode read — falls back to Zustand-persisted localStorage value during initial load */
export function useDarkMode(): boolean {
  const { data } = useSettings();
  if (data !== undefined) return data.darkMode;
  try {
    const raw = localStorage.getItem('lcc-settings');
    if (raw) return JSON.parse(raw)?.state?.darkMode ?? false;
  } catch {}
  return false;
}

// ─── Mutation (debounced PUT) ─────────────────────────────────────────────────

// Debounced API call — created once outside component to persist across renders
let _pendingSettingsUpdate: UpdateSettingsInput = {};
let _settingsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function flushSettingsUpdate(fn: (data: UpdateSettingsInput) => void) {
  if (_settingsDebounceTimer) clearTimeout(_settingsDebounceTimer);
  _settingsDebounceTimer = setTimeout(() => {
    fn(_pendingSettingsUpdate);
    _pendingSettingsUpdate = {};
  }, 300);
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: UpdateSettingsInput) => api.put<{ data: Settings }>('/settings', data),
    onError: () => qc.invalidateQueries({ queryKey: ['settings'] }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const update = (updates: UpdateSettingsInput) => {
    // Optimistic update — immediate
    qc.setQueryData<Settings>(['settings'], (old) =>
      old ? { ...old, ...updates } : undefined,
    );
    // Merge pending changes, debounce API call
    _pendingSettingsUpdate = { ..._pendingSettingsUpdate, ...updates };
    flushSettingsUpdate((data) => mutation.mutate(data));
  };

  return { update, isPending: mutation.isPending };
}
```

- [ ] **Step 2: Rewrite `src/hooks/usePhase.js` as bridge**

```js
import { useSettings, useUpdateSettings } from './queries/useSettings';

export function usePhase() {
  const { data: settings } = useSettings();
  const { update } = useUpdateSettings();
  return {
    phase: settings?.phase ?? 'normal',
    setPhase: (phase) => update({ phase }),
  };
}
```

- [ ] **Step 3: Update `src/App.jsx`** — replace Zustand useSettings with TQ useDarkMode

```jsx
// OLD:
import { useSettings } from './hooks/useSettings';
// const darkMode = useSettings((s) => s.darkMode);

// NEW:
import { useDarkMode } from './hooks/queries/useSettings';
```

```jsx
export default function App() {
  const darkMode = useDarkMode();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    // ... routes unchanged ...
  );
}
```

- [ ] **Step 4: Update `src/pages/Settings.jsx`**

```jsx
// OLD:
import { useSettings } from '../hooks/useSettings';
import { usePhase } from '../hooks/usePhase';

// NEW:
import { useSettings, useUpdateSettings } from '../hooks/queries/useSettings';
import { usePhase } from '../hooks/usePhase';
```

```jsx
// OLD:
const { darkMode, toggleDarkMode, wakeOffset, setWakeOffset } = useSettings();
const phase = usePhase((s) => s.phase);
const setPhase = usePhase((s) => s.setPhase); // if destructured separately

// NEW:
const { data: settings } = useSettings();
const { update } = useUpdateSettings();
const darkMode = settings?.darkMode ?? false;
const wakeOffset = settings?.wakeOffset ?? 0;
const toggleDarkMode = () => update({ darkMode: !darkMode });
const setWakeOffset = (offset) => update({ wakeOffset: offset });
const { phase, setPhase } = usePhase();
```

- [ ] **Step 5: Update all `usePhase` selector consumers**

Each of these files has the pattern `usePhase((s) => s.phase)`. Replace with `usePhase().phase`.

**`src/components/PhaseSelector/PhaseSelector.jsx`:**
```jsx
// OLD: const phase = usePhase((s) => s.phase);  and  const setPhase = usePhase((s) => s.setPhase);
// NEW:
const { phase, setPhase } = usePhase();
```

**`src/components/StatsCards/StatsCards.jsx`:**
```jsx
// OLD: const phase = usePhase((s) => s.phase);
// NEW:
const { phase } = usePhase();
```

**`src/components/EndOfDayLog/EndOfDayLog.jsx`:**
```jsx
// OLD: const phase = usePhase((s) => s.phase);
// NEW:
const { phase } = usePhase();
```

**`src/components/ParticleBackground/ParticleBackground.jsx`:**
```jsx
// OLD: const darkMode = useSettings((s) => s.darkMode);
// Also update useSettings if present:
// Replace with useDarkMode from TQ:
import { useDarkMode } from '../../hooks/queries/useSettings';
// ...
const darkMode = useDarkMode();
```

**`src/pages/Dashboard.jsx`:**
```jsx
// OLD: const phase = usePhase((s) => s.phase);
// NEW:
const { phase } = usePhase();
```

**`src/pages/DailyDetail.jsx`:**
```jsx
// OLD: const phase = usePhase((s) => s.phase);
// NEW:
const { phase } = usePhase();
```

**`src/pages/WeeklyOverview.jsx`:**
```jsx
// OLD: const phase = usePhase((s) => s.phase);
// NEW:
const { phase } = usePhase();
```

**`src/pages/Rules.jsx`:**
```jsx
// Check if it uses selector: grep for usePhase((s
// If yes: const { phase } = usePhase();
```

- [ ] **Step 6: Verify settings page + dark mode**

With API running:
1. Navigate to `/settings`
2. Toggle dark mode → page switches immediately (optimistic), API call fires 300ms later
3. Refresh page → dark mode preference persists (loaded from server)
4. Change phase → Timeline + schedule updates

- [ ] **Step 7: Commit**

```bash
git add src/hooks/queries/useSettings.ts src/hooks/usePhase.js src/App.jsx src/pages/Settings.jsx src/components/PhaseSelector/PhaseSelector.jsx src/components/StatsCards/StatsCards.jsx src/components/EndOfDayLog/EndOfDayLog.jsx src/components/ParticleBackground/ParticleBackground.jsx src/pages/Dashboard.jsx src/pages/DailyDetail.jsx src/pages/WeeklyOverview.jsx src/pages/Rules.jsx
git commit -m "feat(mp9): useSettings TQ hook, usePhase bridge, migrate all settings/phase consumers"
```

---

## Task 8: Cleanup — delete old Zustand store files + final verification

**Files:**
- Delete: `src/hooks/useTasks.js`
- Delete: `src/hooks/useTimeLog.js`
- Delete: `src/hooks/useCourses.js`
- Delete: `src/hooks/useSettings.js`

- [ ] **Step 1: Verify no remaining imports of old files**

```bash
grep -r "from.*hooks/useTasks'\|from.*hooks/useTimeLog'\|from.*hooks/useCourses'\|from.*hooks/useSettings'" /Users/Apple/Downloads/app/src --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts"
```

Expected: **no output**. If any imports remain, fix them before deleting.

- [ ] **Step 2: Delete old store files**

```bash
rm /Users/Apple/Downloads/app/src/hooks/useTasks.js
rm /Users/Apple/Downloads/app/src/hooks/useTimeLog.js
rm /Users/Apple/Downloads/app/src/hooks/useCourses.js
rm /Users/Apple/Downloads/app/src/hooks/useSettings.js
```

- [ ] **Step 3: Run build to confirm no broken imports**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Full flow smoke test**

With both API and frontend running:
1. Visit `/login` → register new account
2. Navigate to each page: Dashboard, Courses, Tracker, Timer, Coach, Settings, Week
3. Add a task in `/coach` → appears immediately
4. Add a course in `/courses` → appears immediately
5. Start + stop a timer on dashboard → log appears in `/tracker`
6. Toggle dark mode in `/settings` → persists after refresh
7. Change phase → schedule updates on dashboard

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(mp9): complete frontend ↔ API sync — delete legacy Zustand data stores"
```

---

## Known Limitations (post-MP9)

- `clearAll` logs (bulk delete) removed — no API endpoint. Can be added later.
- `blockRef` linkage (actual session → specific plan block) not stored in API — Timeline shows logs by date only.
- `useBigThree` still local Zustand (API table exists, deferred).
- `useCalendar` schedule overrides still local (custom block sync deferred).
