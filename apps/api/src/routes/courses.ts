import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../db';
import { createDb } from '../db';
import { courses } from '../db/schema';
import { createAuth } from '../lib/auth';
import { CreateCourseInputSchema, UpdateCourseInputSchema } from '@meridian/shared/schema';

const coursesRoute = new Hono<{ Bindings: Env }>();

async function getSession(c: Context<{ Bindings: Env }>) {
  const db = createDb(c.env);
  const auth = createAuth(db, c.env);
  return auth.api.getSession({ headers: c.req.raw.headers });
}

coursesRoute.get('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.userId, session.user.id))
    .orderBy(courses.createdAt);

  return c.json({ data: rows });
});

coursesRoute.post('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = CreateCourseInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const [row] = await db
    .insert(courses)
    .values({ userId: session.user.id, ...parsed.data })
    .returning();

  return c.json({ data: row }, 201);
});

coursesRoute.patch('/:id', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateCourseInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const setData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.lastStudied !== undefined) {
    setData.lastStudied = new Date(parsed.data.lastStudied * 1000);
  }
  const [row] = await db
    .update(courses)
    .set(setData)
    .where(and(eq(courses.id, id), eq(courses.userId, session.user.id)))
    .returning();

  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

coursesRoute.delete('/:id', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const db = createDb(c.env);
  await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, session.user.id)));

  return c.json({ ok: true });
});

export default coursesRoute;
