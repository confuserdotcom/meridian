import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './db';
import { createDb } from './db';
import { createAuth } from './lib/auth';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedule';
import logsRoutes from './routes/logs';
import tasksRoutes from './routes/tasks';
import coursesRoutes from './routes/courses';
import settingsRoutes from './routes/settings';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());

app.use(
  '*',
  cors({
    origin: (origin) =>
      ['http://localhost:5173', 'https://meridian.day'].includes(origin) ? origin : null,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

app.get('/me', async (c) => {
  const db = createDb(c.env);
  const auth = createAuth(db, c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ data: session.user });
});

app.route('/auth', authRoutes);
app.route('/schedule', scheduleRoutes);
app.route('/logs', logsRoutes);
app.route('/tasks', tasksRoutes);
app.route('/courses', coursesRoutes);
app.route('/settings', settingsRoutes);

export default app;
