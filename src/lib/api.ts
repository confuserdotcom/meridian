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
