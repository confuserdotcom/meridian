import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../db';
import { createDb } from '../db';
import { tasks } from '../db/schema';
import { createAuth } from '../lib/auth';
import { CreateTaskInputSchema, UpdateTaskInputSchema } from '@meridian/shared/schema';

const tasksRoute = new Hono<{ Bindings: Env }>();

async function getSession(c: Context<{ Bindings: Env }>) {
  const db = createDb(c.env);
  const auth = createAuth(db, c.env);
  return auth.api.getSession({ headers: c.req.raw.headers });
}

tasksRoute.get('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, session.user.id))
    .orderBy(tasks.deadline);

  return c.json({ data: rows });
});

tasksRoute.post('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = CreateTaskInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const [row] = await db
    .insert(tasks)
    .values({
      userId: session.user.id,
      title: parsed.data.title,
      courseId: parsed.data.courseId ?? null,
      deadline: parsed.data.deadline,
      estimatedHours: parsed.data.estimatedHours,
      isExam: parsed.data.isExam,
    })
    .returning();

  return c.json({ data: row }, 201);
});

tasksRoute.patch('/:id', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateTaskInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const [row] = await db
    .update(tasks)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
    .returning();

  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

tasksRoute.delete('/:id', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const db = createDb(c.env);
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)));

  return c.json({ ok: true });
});

export default tasksRoute;
