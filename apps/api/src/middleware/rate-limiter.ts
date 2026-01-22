/**
 * Rate Limiting Middleware
 * @see sprint.md T11.4: Enhanced Rate Limiting
 * @see sdd.md §5.5 Rate Limiting
 */

import type { MiddlewareHandler } from 'hono';
import { getRedis, isRedisConfigured, CACHE_KEYS } from '../services/redis.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// --- Types ---

export type UserTier = 'free' | 'pro' | 'team' | 'enterprise';

export interface RateLimitConfig {
  /** Requests per window */
  limit: number;
  /** Window size in seconds */
  window: number;
}

export interface RateLimitOptions {
  /** Key prefix for this limiter */
  prefix: string;
  /** Per-tier limits (falls back to 'default' if tier not specified) */
  limits: {
    free?: RateLimitConfig;
    pro?: RateLimitConfig;
    team?: RateLimitConfig;
    enterprise?: RateLimitConfig;
    default: RateLimitConfig;
  };
  /** Custom key generator (default: uses IP or user ID) */
  keyGenerator?: (c: any) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (c: any) => boolean;
}

// --- Default Rate Limits ---

/**
 * Default rate limits per tier
 * @see sdd.md §5.5 Rate Limiting
 */
export const DEFAULT_RATE_LIMITS: RateLimitOptions['limits'] = {
  free: { limit: 100, window: 60 },       // 100 req/min
  pro: { limit: 300, window: 60 },        // 300 req/min
  team: { limit: 500, window: 60 },       // 500 req/min
  enterprise: { limit: 1000, window: 60 }, // 1000 req/min
  default: { limit: 100, window: 60 },    // Default fallback
};

/**
 * Auth-specific rate limits (stricter for security)
 */
export const AUTH_RATE_LIMITS: RateLimitOptions['limits'] = {
  free: { limit: 10, window: 60 },        // 10 req/min for login attempts
  pro: { limit: 20, window: 60 },
  team: { limit: 30, window: 60 },
  enterprise: { limit: 50, window: 60 },
  default: { limit: 10, window: 60 },
};

/**
 * Search/browse rate limits (moderate)
 */
export const SEARCH_RATE_LIMITS: RateLimitOptions['limits'] = {
  free: { limit: 30, window: 60 },        // 30 req/min for searches
  pro: { limit: 100, window: 60 },
  team: { limit: 200, window: 60 },
  enterprise: { limit: 500, window: 60 },
  default: { limit: 30, window: 60 },
};

// --- Auth Endpoints (fail closed on error) ---

/**
 * Auth endpoints that should fail closed on Redis errors
 * @see sprint-v2.md T15.4: Rate Limiter Resilience (L5)
 */
const AUTH_ENDPOINTS = [
  '/v1/auth/',
  '/auth/',
];

/**
 * Check if a path is an auth endpoint
 */
function isAuthEndpoint(path: string): boolean {
  return AUTH_ENDPOINTS.some(ep => path.startsWith(ep));
}

// --- Rate Limiter Implementation ---

/**
 * Get rate limit key for a request
 */
function getDefaultKey(c: any): string {
  // Prefer user ID if authenticated
  const userId = c.get('userId');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
  return `ip:${ip}`;
}

/**
 * Get current window identifier (sliding window)
 */
function getCurrentWindow(windowSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  return String(Math.floor(now / windowSeconds));
}

/**
 * Sliding window rate limiter using Redis
 */
export const rateLimiter = (options: RateLimitOptions): MiddlewareHandler => {
  const { prefix, limits, keyGenerator = getDefaultKey, skip } = options;

  return async (c, next) => {
    // Check skip condition
    if (skip?.(c)) {
      return next();
    }

    // Check if Redis is configured
    if (!isRedisConfigured()) {
      logger.warn('Rate limiting disabled: Redis not configured');
      return next();
    }

    try {
      const redis = getRedis();

      // Get user tier (default to 'free' if not authenticated)
      const user = c.get('user');
      const tier: UserTier = user?.tier || 'free';

      // Get rate limit config for this tier
      const config = limits[tier] || limits.default;

      // Generate cache key
      const baseKey = keyGenerator(c);
      const window = getCurrentWindow(config.window);
      const key = CACHE_KEYS.rateLimit(`${prefix}:${baseKey}`, window);

      // Increment counter
      const current = await redis.incr(key);

      // Set TTL on first request
      if (current === 1) {
        await redis.expire(key, config.window);
      }

      // Calculate remaining and reset time
      const remaining = Math.max(0, config.limit - current);
      const resetTime = (Math.floor(Date.now() / 1000 / config.window) + 1) * config.window;

      // Set rate limit headers
      c.header('X-RateLimit-Limit', String(config.limit));
      c.header('X-RateLimit-Remaining', String(remaining));
      c.header('X-RateLimit-Reset', String(resetTime));

      // Check if over limit
      if (current > config.limit) {
        const retryAfter = resetTime - Math.floor(Date.now() / 1000);
        c.header('Retry-After', String(retryAfter));

        logger.warn(
          {
            key: baseKey,
            tier,
            limit: config.limit,
            current,
            prefix,
          },
          'Rate limit exceeded'
        );

        throw Errors.RateLimitExceeded(retryAfter);
      }

      await next();
    } catch (error) {
      // Re-throw rate limit errors
      if (error instanceof Error && error.message === 'Too many requests') {
        throw error;
      }

      const path = c.req.path;

      // Log Redis errors
      logger.error({ error, prefix, path }, 'Rate limiter error');

      // L5: Fail closed for auth endpoints (security-critical)
      if (isAuthEndpoint(path)) {
        logger.warn({ path }, 'Rate limiter failing closed for auth endpoint');
        return c.json(
          {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Rate limiting service temporarily unavailable',
            },
          },
          503
        );
      }

      // Fail open for other endpoints with warning header
      c.header('X-RateLimit-Degraded', 'true');
      await next();
    }
  };
};

// --- Preset Rate Limiters ---

/**
 * General API rate limiter
 */
export const apiRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'api',
    limits: DEFAULT_RATE_LIMITS,
  });

/**
 * Auth endpoint rate limiter (stricter)
 */
export const authRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'auth',
    limits: AUTH_RATE_LIMITS,
    // Use IP only for auth (user isn't authenticated yet)
    keyGenerator: (c) => {
      const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
        || c.req.header('x-real-ip')
        || 'unknown';
      return `ip:${ip}`;
    },
  });

/**
 * Search/browse rate limiter
 */
export const searchRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'search',
    limits: SEARCH_RATE_LIMITS,
  });

/**
 * Skills API rate limiter (for download/install tracking)
 */
export const skillsRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'skills',
    limits: {
      free: { limit: 50, window: 60 },
      pro: { limit: 200, window: 60 },
      team: { limit: 300, window: 60 },
      enterprise: { limit: 500, window: 60 },
      default: { limit: 50, window: 60 },
    },
  });

/**
 * Creator API rate limiter (for publishing)
 */
export const creatorRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'creator',
    limits: {
      free: { limit: 10, window: 60 },   // Limited publishing for free
      pro: { limit: 30, window: 60 },
      team: { limit: 100, window: 60 },
      enterprise: { limit: 200, window: 60 },
      default: { limit: 10, window: 60 },
    },
  });

/**
 * Stripe Connect rate limiter (very strict)
 * Prevents abuse of Stripe Connect account creation
 * @see auditor-sprint-feedback.md CRITICAL-1
 */
export const stripeConnectRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'stripe-connect',
    limits: {
      // Very strict: 3 attempts per hour regardless of tier
      free: { limit: 3, window: 3600 },
      pro: { limit: 3, window: 3600 },
      team: { limit: 3, window: 3600 },
      enterprise: { limit: 5, window: 3600 },
      default: { limit: 3, window: 3600 },
    },
  });

/**
 * Pack submission rate limiter (H-001)
 * Prevents spam submissions and resource exhaustion
 * @see SECURITY-AUDIT-REPORT.md H-001
 */
export const submissionRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'submission',
    limits: {
      // Strict: 5 submissions per minute to prevent spam
      free: { limit: 5, window: 60 },
      pro: { limit: 10, window: 60 },
      team: { limit: 20, window: 60 },
      enterprise: { limit: 30, window: 60 },
      default: { limit: 5, window: 60 },
    },
  });

/**
 * File upload rate limiter (H-001)
 * Prevents resource exhaustion via repeated uploads
 * @see SECURITY-AUDIT-REPORT.md H-001
 */
export const uploadRateLimiter = (): MiddlewareHandler =>
  rateLimiter({
    prefix: 'upload',
    limits: {
      // Moderate: 10 uploads per minute
      free: { limit: 10, window: 60 },
      pro: { limit: 30, window: 60 },
      team: { limit: 50, window: 60 },
      enterprise: { limit: 100, window: 60 },
      default: { limit: 10, window: 60 },
    },
  });
