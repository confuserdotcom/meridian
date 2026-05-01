import { api } from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

function getToken(): string | null {
  return localStorage.getItem('meridian_token');
}

function setToken(t: string): void {
  localStorage.setItem('meridian_token', t);
}

function clearToken(): void {
  localStorage.removeItem('meridian_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<{ token: string; user: AuthUser }>('/auth/sign-in/email', { email, password });
  setToken(res.token);
  return res.user;
}

export async function register(email: string, password: string, name: string): Promise<AuthUser> {
  const res = await api.post<{ token: string; user: AuthUser }>('/auth/sign-up/email', { email, password, name });
  setToken(res.token);
  return res.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/sign-out', {});
  } finally {
    clearToken();
  }
}

export async function getMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    const res = await api.get<{ data: AuthUser }>('/me');
    return res.data;
  } catch {
    clearToken();
    return null;
  }
}
