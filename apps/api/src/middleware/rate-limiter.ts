import type { MiddlewareHandler } from 'hono';
import { trustedClientIp } from './trust-ip.js';

/**
 * In-memory leaky-bucket rate-limit middleware (SDD §6.2)
 *
 * Single-instance constraint — per SDD §6.2.1, the Railway service MUST run
 * as one instance. Horizontal scaling would break per-IP buckets (attacker
 * hitting different instances gets N× budget). Escalation path documented
 * in SDD §6.2.1 (move to stats_events table or edge layer if needed).
 *
 * Bucket: sliding window, one Map per limiter instance, opaque string keys.
 * Cleared on restart — acceptable because rate-limit is best-effort abuse
 * deterrent, not a hard quota.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

function createBucketMiddleware(opts: {
  limit: number;
  windowSec: number;
  keyFn: (c: Parameters<MiddlewareHandler>[0]) => string;
}): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();

  return async (c, next) => {
    const now = Date.now();
    const key = opts.keyFn(c);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
      return next();
    }

    if (bucket.count >= opts.limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      return c.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Retry in ${retryAfter}s.`,
          },
          request_id: c.get('requestId'),
        },
        429,
        {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(opts.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(bucket.resetAt / 1000)),
        }
      );
    }

    bucket.count += 1;
    await next();
    c.res.headers.set('X-RateLimit-Limit', String(opts.limit));
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, opts.limit - bucket.count)));
    c.res.headers.set('X-RateLimit-Reset', String(Math.floor(bucket.resetAt / 1000)));
  };
}

/**
 * Global API rate-limiter — 300 req/min per IP (safety net against bursts).
 */
export function apiRateLimiter(): MiddlewareHandler {
  return createBucketMiddleware({
    limit: 300,
    windowSec: 60,
    keyFn: (c) => `api:${trustedClientIp(c)}`,
  });
}

/**
 * Stats endpoint rate-limiter — per-IP per-slug bucket.
 * Default view: 10/min, download: 5/min (SDD §3.2).
 */
export function statsRateLimiter(action: 'view' | 'download'): MiddlewareHandler {
  const limit = action === 'view' ? 10 : 5;
  return createBucketMiddleware({
    limit,
    windowSec: 60,
    keyFn: (c) => {
      const slug = c.req.param('slug') || 'unknown';
      return `${action}:${trustedClientIp(c)}:${slug}`;
    },
  });
}
