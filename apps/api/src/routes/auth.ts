import { Hono } from 'hono';
import type { Env } from '../db';
import { createDb } from '../db';
import { createAuth } from '../lib/auth';

const auth = new Hono<{ Bindings: Env }>();

// Forward all /auth/* requests to better-auth handler
auth.all('/*', async (c) => {
  const db = createDb(c.env);
  const authInstance = createAuth(db, c.env);
  return authInstance.handler(c.req.raw);
});

export default auth;
