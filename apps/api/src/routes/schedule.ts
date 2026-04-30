import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../db';
import { createDb } from '../db';
import { schedules } from '../db/schema';
import { createAuth } from '../lib/auth';
import { UpsertScheduleInputSchema } from '@meridian/shared/schema';

const schedule = new Hono<{ Bindings: Env }>();

async function getSession(c: Context<{ Bindings: Env }>) {
  const db = createDb(c.env);
  const auth = createAuth(db, c.env);
  return auth.api.getSession({ headers: c.req.raw.headers });
}

schedule.get('/:phase', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const phase = c.req.param('phase');
  const db = createDb(c.env);

  const [row] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.userId, session.user.id), eq(schedules.phase, phase as 'normal' | 'exam' | 'break')))
    .limit(1);

  if (!row) return c.json({ data: null });
  return c.json({ data: row });
});

schedule.put('/:phase', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const phase = c.req.param('phase');
  const body = await c.req.json();
  const parsed = UpsertScheduleInputSchema.safeParse({ phase, ...body });
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const now = new Date();

  const [row] = await db
    .insert(schedules)
    .values({
      userId: session.user.id,
      phase: parsed.data.phase,
      dayBlocks: parsed.data.dayBlocks,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schedules.userId, schedules.phase],
      set: { dayBlocks: parsed.data.dayBlocks, updatedAt: now },
    })
    .returning();

  return c.json({ data: row });
});

export default schedule;
