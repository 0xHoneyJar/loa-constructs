/**
 * Postgres-backed webhook nonce replay-protection (T-1.11b · FR-1.6.2 · ADR-007).
 * Cycle: constructs-network-migration
 * SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §2.1.4
 *
 * Closes flatline-SDD CRITICAL 850 + HIGH 760 — in-memory state was lost
 * across container restarts and didn't work cross-replica. Postgres-backed
 * is atomic + cross-replica safe via the unique-constraint conflict on
 * the `nonce` primary key.
 *
 * Cleanup: a 10-minute interval cron / Hono setInterval removes expired rows.
 *   DELETE FROM webhook_nonces WHERE expires_at < NOW();
 */
import type { Context, MiddlewareHandler } from 'hono';
import { db } from '../db/index.js';
import { webhookNonces } from '../db/schema.js';
import { logger } from '../lib/logger.js';

const MAX_SKEW_MS = 5 * 60 * 1000; // 5-minute clock-skew tolerance

/**
 * Returns true if the (nonce, timestamp) combination is a replay or stale.
 * Returns false if it's first-seen — and atomically claims it.
 *
 * Atomicity: INSERT ... ON CONFLICT relies on the primary-key constraint
 * to surface duplicate-key errors as code 23505. We catch only that code;
 * any other DB error propagates so the caller can 5xx.
 */
export async function isReplay(
  nonce: string,
  timestampISO: string,
): Promise<boolean> {
  const now = Date.now();
  const ts = Date.parse(timestampISO);
  if (Number.isNaN(ts) || Math.abs(now - ts) > MAX_SKEW_MS) {
    // Stale, future, or unparseable timestamp — reject.
    return true;
  }

  try {
    await db.insert(webhookNonces).values({
      nonce,
      receivedAt: new Date(now),
      expiresAt: new Date(now + MAX_SKEW_MS),
    });
    return false;
  } catch (e: any) {
    // PG unique-violation = replay.
    if (e?.code === '23505' || /duplicate key/i.test(e?.message ?? '')) {
      return true;
    }
    throw e;
  }
}

export interface NonceStoreOptions {
  /** Override isReplay (test injection) */
  isReplayImpl?: typeof isReplay;
}

/**
 * Hono middleware. Reads nonce + timestamp from c.var (set by hmac-verify)
 * and 409s if it's a replay or stale. Pairs with hmacVerifyMiddleware:
 *
 *   app.post('/v1/admin/refresh-registry',
 *     hmacVerifyMiddleware(),
 *     nonceStoreMiddleware(),
 *     rateLimitStoreMiddleware(),
 *     handler);
 */
export function nonceStoreMiddleware(
  opts: NonceStoreOptions = {},
): MiddlewareHandler {
  const check = opts.isReplayImpl ?? isReplay;
  return async (c: Context, next) => {
    const nonce = c.get('verifiedNonce') as string | undefined;
    const timestamp = c.get('verifiedTimestamp') as string | undefined;

    if (!nonce || !timestamp) {
      // hmac-verify should have populated these. If absent, fail closed.
      logger.warn({
        msg: 'Nonce: hmac-verify did not populate context — middleware order?',
      });
      return c.json({ error: 'webhook auth chain misconfigured' }, 401);
    }

    let replay: boolean;
    try {
      replay = await check(nonce, timestamp);
    } catch (e) {
      logger.error({
        msg: 'Nonce: store error',
        error: e instanceof Error ? e.message : String(e),
      });
      return c.json({ error: 'nonce store unavailable' }, 503);
    }

    if (replay) {
      return c.json({ error: 'replay or stale timestamp' }, 409);
    }
    return next();
  };
}
