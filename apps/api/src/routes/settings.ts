import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../db';
import { createDb } from '../db';
import { settings } from '../db/schema';
import { createAuth } from '../lib/auth';
import { UpdateSettingsInputSchema } from '@meridian/shared/schema';

const settingsRoute = new Hono<{ Bindings: Env }>();

async function getSession(c: Context<{ Bindings: Env }>) {
  const db = createDb(c.env);
  const auth = createAuth(db, c.env);
  return auth.api.getSession({ headers: c.req.raw.headers });
}

settingsRoute.get('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb(c.env);
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session.user.id))
    .limit(1);

  // Return defaults if not yet set
  if (!row) {
    return c.json({
      data: {
        userId: session.user.id,
        darkMode: false,
        wakeOffset: 0,
        phase: 'normal',
        updatedAt: new Date(),
      },
    });
  }
  return c.json({ data: row });
});

settingsRoute.put('/', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = UpdateSettingsInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = createDb(c.env);
  const [row] = await db
    .insert(settings)
    .values({ userId: session.user.id, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();

  return c.json({ data: row });
});

export default settingsRoute;
