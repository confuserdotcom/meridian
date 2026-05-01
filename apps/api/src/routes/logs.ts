import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import type { Env } from '../db';
import { createDb } from '../db';
import { timeLogs } from '../db/schema';
import { createAuth } from '../lib/auth';
import { CreateTimeLogInputSchema } from '@meridian/shared/schema';

const logs = new Hono<{ Bindings: Env }>();

async function getSession(c: Context<{ Bindings: Env }>) {
  const db = createDb(c.env);
  const auth = createAuth(db, c.env);
  return auth.api.getSession({ headers: c.req.raw.headers });
}

logs.get('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const date = c.req.query('date');
  const db = createDb(c.env);

  const rows = await db
    .select()
    .from(timeLogs)
    .where(
      date
        ? and(eq(timeLogs.userId, session.user.id), eq(timeLogs.date, date))
        : eq(timeLogs.userId, session.user.id),
    )
    .orderBy(desc(timeLogs.createdAt))
    .limit(200);

  return c.json({ data: rows });
});

logs.post('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = CreateTimeLogInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const [row] = await db
    .insert(timeLogs)
    .values({ userId: session.user.id, ...parsed.data })
    .returning();

  return c.json({ data: row }, 201);
});

logs.delete('/:id', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const db = createDb(c.env);

  await db
    .delete(timeLogs)
    .where(and(eq(timeLogs.id, id), eq(timeLogs.userId, session.user.id)));

  return c.json({ ok: true });
});

export default logs;
