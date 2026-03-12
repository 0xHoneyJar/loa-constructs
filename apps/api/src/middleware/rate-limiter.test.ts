import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// --- Mock setup ---

const mockRedis = {
  incr: vi.fn(() => Promise.resolve(1)),
  expire: vi.fn(() => Promise.resolve(1)),
};

let redisConfigured = true;

vi.mock('../services/redis.js', () => ({
  getRedis: vi.fn(() => {
    if (!redisConfigured) throw new Error('REDIS_URL is not configured');
    return mockRedis;
  }),
  isRedisConfigured: vi.fn(() => redisConfigured),
  CACHE_KEYS: {
    rateLimit: (key: string, window: string) => `rate:${key}:${window}`,
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../lib/errors.js', async () => {
  const { AppError } = await vi.importActual<typeof import('../lib/errors.js')>('../lib/errors.js');
  return {
    AppError,
    Errors: {
      RateLimitExceeded: (retryAfter: number) =>
        new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, { retry_after: retryAfter }),
    },
  };
});

// Import after mocks
import { rateLimiter, type RateLimitOptions } from './rate-limiter.js';

function createTestApp(options: RateLimitOptions) {
  const app = new Hono();

  // Simple error handler for the test app
  app.onError((err, c) => {
    if (err && typeof err === 'object' && 'status' in err) {
      const appErr = err as { code: string; message: string; status: number; details?: Record<string, unknown> };
      return c.json({ error: { code: appErr.code, message: appErr.message, details: appErr.details } }, appErr.status as 429);
    }
    return c.json({ error: { message: err.message } }, 500);
  });

  app.use('*', rateLimiter(options));
  app.get('/test', (c) => c.json({ ok: true }));
  app.get('/v1/auth/login', (c) => c.json({ ok: true }));
  return app;
}

const defaultOptions: RateLimitOptions = {
  prefix: 'test',
  limits: {
    default: { limit: 10, window: 60 },
  },
};

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisConfigured = true;
    mockRedis.incr.mockResolvedValue(1);
  });

  it('passes through when Redis not configured', async () => {
    redisConfigured = false;
    const app = createTestApp(defaultOptions);

    const res = await app.request('/test');
    expect(res.status).toBe(200);

    // No rate limit headers when Redis is down
    expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
  });

  it('sets X-RateLimit-* headers on response', async () => {
    mockRedis.incr.mockResolvedValueOnce(3); // 3rd request
    const app = createTestApp(defaultOptions);

    const res = await app.request('/test');
    expect(res.status).toBe(200);

    expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('7'); // 10 - 3
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('returns 429 with Retry-After when limit exceeded', async () => {
    mockRedis.incr.mockResolvedValueOnce(11); // over limit of 10
    const app = createTestApp(defaultOptions);

    const res = await app.request('/test');
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.error.message).toBe('Too many requests');
  });

  it('auth endpoints fail closed (503) on Redis error', async () => {
    // Redis configured but errors on incr
    mockRedis.incr.mockRejectedValueOnce(new Error('Redis connection error'));
    const app = createTestApp(defaultOptions);

    const res = await app.request('/v1/auth/login');
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('non-auth endpoints fail open with X-RateLimit-Degraded: true on Redis error', async () => {
    mockRedis.incr.mockRejectedValueOnce(new Error('Redis connection error'));
    const app = createTestApp(defaultOptions);

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Degraded')).toBe('true');
  });

  it('skip function bypasses rate limiting', async () => {
    const options: RateLimitOptions = {
      ...defaultOptions,
      skip: (c) => c.req.path === '/test',
    };
    const app = createTestApp(options);

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(mockRedis.incr).not.toHaveBeenCalled();
  });
});
