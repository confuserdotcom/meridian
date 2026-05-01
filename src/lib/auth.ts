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
