import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { generateApiKey, hashApiKey } from '../services/auth.js';
import { apiKeys } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq, and, count } from 'drizzle-orm';

/**
 * API Key Management — cycle-040
 * CRUD endpoints for self-service API key management.
 * Uses existing generateApiKey/hashApiKey from services/auth.ts.
 */
const keys = new Hono();

// POST /v1/keys — Create API key
keys.post('/', requireAuth(), async (c) => {
  const userId = c.get('userId');

  let body: { name?: string; scopes?: string[] };
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  // Enforce 10-key limit
  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.revoked, false)));

  if (activeCount >= 10) {
    return c.json({ error: 'Maximum 10 active API keys per user' }, 400);
  }

  const { key, prefix } = generateApiKey();
  const hash = await hashApiKey(key);

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      keyPrefix: prefix,
      keyHash: hash,
      name: body.name || 'Unnamed key',
      scopes: body.scopes || ['read:skills', 'write:installs'],
    })
    .returning();

  return c.json(
    {
      id: row.id,
      key, // Full key returned ONCE
      prefix: row.keyPrefix,
      name: row.name,
      scopes: row.scopes,
      created_at: row.createdAt,
    },
    201,
  );
});

// GET /v1/keys — List user's active keys
keys.get('/', requireAuth(), async (c) => {
  const userId = c.get('userId');

  const rows = await db
    .select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      name: apiKeys.name,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.revoked, false)))
    .orderBy(apiKeys.createdAt);

  return c.json({ keys: rows });
});

// DELETE /v1/keys/:id — Revoke key
keys.delete('/:id', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const keyId = c.req.param('id');

  const [updated] = await db
    .update(apiKeys)
    .set({ revoked: true })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });

  if (!updated) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ revoked: true });
});

export { keys as keysRouter };
