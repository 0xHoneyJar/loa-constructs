import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { generateApiKey, hashApiKey } from '../services/auth.js';
import { apiKeys } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq, and, count } from 'drizzle-orm';

/**
 * API Key Management — cycle-040 + cycle-044 (write:signals, appSlug, key sync)
 * CRUD endpoints for self-service API key management.
 * Uses existing generateApiKey/hashApiKey from services/auth.ts.
 */
const keys = new Hono();

const ALLOWED_SCOPES = ['read:skills', 'write:installs', 'read:analytics', 'write:signals'];

/**
 * Fire-and-forget sync of signal key to Convex signalKeys table.
 * Uses public action endpoint with write-key auth (HIGH-006 fix).
 * If sync fails, logs warning — manual resync available via admin endpoint.
 */
async function syncKeyToConvex(
  keyPrefix: string,
  keyHash: string,
  appSlug: string,
) {
  const convexUrl = process.env.CONVEX_URL;
  const convexWriteKey = process.env.CONVEX_WRITE_KEY;
  if (!convexUrl || !convexWriteKey) return;

  try {
    const response = await fetch(`${convexUrl}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'signals:syncSignalKeyPublic',
        args: { writeKey: convexWriteKey, keyPrefix, keyHash, appSlug },
      }),
    });
    if (!response.ok) {
      console.warn(`[keys] Convex key sync failed: ${response.status}`);
    }
  } catch (err) {
    console.warn('[keys] Convex key sync error:', err);
  }
}

async function syncKeyRevocationToConvex(keyPrefix: string) {
  const convexUrl = process.env.CONVEX_URL;
  const convexWriteKey = process.env.CONVEX_WRITE_KEY;
  if (!convexUrl || !convexWriteKey) return;

  try {
    await fetch(`${convexUrl}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'signals:revokeSignalKeyPublic',
        args: { writeKey: convexWriteKey, keyPrefix },
      }),
    });
  } catch (err) {
    console.warn('[keys] Convex key revocation sync error:', err);
  }
}

// POST /v1/keys — Create API key
keys.post('/', requireAuth(), async (c) => {
  const userId = c.get('userId');

  let body: { name?: string; scopes?: string[]; appSlug?: string };
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

  const scopes = (body.scopes || ['read:skills', 'write:installs']).filter(
    (s: string) => ALLOWED_SCOPES.includes(s),
  );
  if (scopes.length === 0) {
    return c.json({ error: 'No valid scopes provided' }, 400);
  }

  // Require appSlug when write:signals scope is included
  const hasSignalScope = scopes.includes('write:signals');
  const appSlug = body.appSlug?.slice(0, 100).trim() || null;
  if (hasSignalScope && !appSlug) {
    return c.json({ error: 'appSlug required for write:signals scope' }, 400);
  }

  const name = (body.name || 'Unnamed key').slice(0, 100).trim() || 'Unnamed key';

  const { key, prefix } = generateApiKey();
  const hash = await hashApiKey(key);

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      keyPrefix: prefix,
      keyHash: hash,
      name,
      scopes,
      appSlug,
    })
    .returning();

  // Fire-and-forget: sync signal key to Convex for direct validation
  if (hasSignalScope && appSlug) {
    syncKeyToConvex(prefix, hash, appSlug);
  }

  return c.json(
    {
      id: row.id,
      key, // Full key returned ONCE
      prefix: row.keyPrefix,
      name: row.name,
      scopes: row.scopes,
      appSlug: row.appSlug,
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
    .returning({ id: apiKeys.id, keyPrefix: apiKeys.keyPrefix, scopes: apiKeys.scopes });

  if (!updated) {
    return c.json({ error: 'Key not found' }, 404);
  }

  // Fire-and-forget: sync revocation to Convex if it had signal scope
  if (updated.scopes?.includes('write:signals')) {
    syncKeyRevocationToConvex(updated.keyPrefix);
  }

  return c.json({ revoked: true });
});

export { keys as keysRouter };
