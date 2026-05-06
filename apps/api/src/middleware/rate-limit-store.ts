/**
 * Postgres-backed token-bucket rate limiter (T-1.11b · FR-1.6.3 · ADR-007).
 * Cycle: constructs-network-migration
 * SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §2.1.4
 *
 * Closes flatline-SDD HIGH 720+705 — in-memory rate-limit state was lost
 * across container restarts and didn't work cross-replica. Postgres
 * `INSERT ... ON CONFLICT DO UPDATE` is atomic + concurrency-safe in a
 * single roundtrip.
 *
 * Algorithm: 60 tokens/hour (1 token/min refill), bucket capacity 60.
 * When tokens < 1 AND the bucket was active recently, blocked_until is
 * set 1h ahead — caller gets 429 with Retry-After until that timestamp.
 */
import type { Context, MiddlewareHandler } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { logger } from '../lib/logger.js';

const TOKENS_PER_HOUR = 60;
const REFILL_PER_SEC = TOKENS_PER_HOUR / 3600; // ~0.0167

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Atomic upsert with token-bucket refill calculation. Single roundtrip.
 * Returns { allowed, retryAfterSeconds } — caller surfaces 429 if !allowed.
 *
 * Note: `tokens` is stored as TEXT in Drizzle's TS schema (the migration
 * uses DOUBLE PRECISION) because Drizzle's typed numeric columns require
 * decimal-as-string anyway. Raw SQL handles the math.
 */
export async function checkAndConsume(
  sourceIp: string,
): Promise<RateLimitResult> {
  const result = await db.execute(sql`
    INSERT INTO rate_limit_buckets (source_ip, tokens, refilled_at, blocked_until)
    VALUES (${sourceIp}, ${TOKENS_PER_HOUR - 1}, NOW(), NULL)
    ON CONFLICT (source_ip) DO UPDATE SET
      tokens = LEAST(
        ${TOKENS_PER_HOUR}::float8,
        rate_limit_buckets.tokens::float8 +
          EXTRACT(EPOCH FROM (NOW() - rate_limit_buckets.refilled_at)) * ${REFILL_PER_SEC}::float8
      ) - 1,
      refilled_at = NOW(),
      blocked_until = CASE
        WHEN rate_limit_buckets.tokens::float8 < 1
          AND rate_limit_buckets.refilled_at > NOW() - INTERVAL '1 hour'
        THEN NOW() + INTERVAL '1 hour'
        ELSE NULL
      END
    RETURNING tokens, blocked_until
  `);

  const row = (result as unknown as Array<{ tokens: number | string; blocked_until: Date | string | null }>)[0];
  if (!row) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (row.blocked_until) {
    const blockedUntil = new Date(row.blocked_until as string);
    if (blockedUntil > new Date()) {
      const retryAfterSeconds = Math.max(
        0,
        Math.ceil((blockedUntil.getTime() - Date.now()) / 1000),
      );
      return { allowed: false, retryAfterSeconds };
    }
  }

  // Defensive: tokens column could be string-encoded numeric depending on driver.
  const remainingTokens =
    typeof row.tokens === 'string' ? parseFloat(row.tokens) : row.tokens;
  return {
    allowed: remainingTokens >= 0,
    retryAfterSeconds: 0,
  };
}

export interface RateLimitStoreOptions {
  /** Override checkAndConsume (test injection) */
  checkAndConsumeImpl?: typeof checkAndConsume;
  /** Override how source IP is extracted from the request */
  ipResolver?: (c: Context) => string;
}

function defaultIpResolver(c: Context): string {
  // Honor X-Forwarded-For first hop (Railway terminates TLS upstream of us).
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0]?.trim() ?? 'unknown';
  }
  // c.env may not exist in test envs; fall back to a known sentinel.
  return c.req.header('x-real-ip') ?? 'unknown';
}

export function rateLimitStoreMiddleware(
  opts: RateLimitStoreOptions = {},
): MiddlewareHandler {
  const check = opts.checkAndConsumeImpl ?? checkAndConsume;
  const resolveIp = opts.ipResolver ?? defaultIpResolver;
  return async (c: Context, next) => {
    const sourceIp = resolveIp(c);

    let result: RateLimitResult;
    try {
      result = await check(sourceIp);
    } catch (e) {
      logger.error({
        msg: 'RateLimit: store error',
        error: e instanceof Error ? e.message : String(e),
      });
      // Fail open on store errors — webhook auth still requires HMAC + nonce,
      // so an attacker can't abuse a temporarily-broken rate limiter to
      // exfiltrate registry content. Block on a future hardening cycle if
      // operator preference shifts to fail-closed.
      return next();
    }

    if (!result.allowed) {
      c.res.headers.set('Retry-After', String(result.retryAfterSeconds));
      return c.json(
        { error: 'rate limit exceeded', retry_after_seconds: result.retryAfterSeconds },
        429,
      );
    }
    return next();
  };
}
