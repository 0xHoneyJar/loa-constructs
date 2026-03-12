/**
 * Shared Redis Mock Factory
 *
 * Creates a mock Redis client with configurable fail modes.
 *
 * Usage:
 *   vi.mock('../../src/services/redis.js', () => getMockRedisModule());
 *   // Or with fail mode:
 *   vi.mock('../../src/services/redis.js', () => getMockRedisModule({ failMode: true }));
 */

import { vi } from 'vitest';

/**
 * Create a mock Redis client.
 *
 * @param opts.failMode - If true, all operations reject with 'Redis connection error'
 */
export function createMockRedis(opts?: { failMode?: boolean }) {
  const error = new Error('Redis connection error');
  const fail = opts?.failMode ?? false;

  return {
    get: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve(null))),
    set: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve('OK'))),
    del: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve(1))),
    incr: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve(1))),
    expire: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve(1))),
    exists: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve(0))),
    setex: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve('OK'))),
    ping: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve('PONG'))),
    keys: vi.fn(() => (fail ? Promise.reject(error) : Promise.resolve([]))),
  };
}

/**
 * Get the full vi.mock() payload for the services/redis module.
 *
 * @param opts.configured - Whether isRedisConfigured() returns true (default: true)
 * @param opts.failMode - Whether Redis operations fail (default: false)
 */
export function getMockRedisModule(opts?: { configured?: boolean; failMode?: boolean }) {
  const configured = opts?.configured ?? true;
  const redis = createMockRedis({ failMode: opts?.failMode });

  return {
    getRedis: vi.fn(() => {
      if (!configured) throw new Error('REDIS_URL is not configured');
      return redis;
    }),
    isRedisConfigured: vi.fn(() => configured),
    // Re-export real constants (not mocked)
    CACHE_KEYS: {
      userTier: (userId: string) => `user:${userId}:tier`,
      skillList: (params: string) => `skills:list:${params}`,
      skill: (slug: string) => `skill:${slug}`,
      rateLimit: (key: string, window: string) => `rate:${key}:${window}`,
      session: (tokenHash: string) => `session:${tokenHash}`,
      constructList: (params: string) => `constructs:list:${params}`,
      constructDetail: (slugWithTier: string) => `constructs:detail:${slugWithTier}`,
      constructSummary: (tier?: string) => tier ? `constructs:summary:${tier}` : 'constructs:summary',
      constructExists: (slugWithTier: string) => `constructs:exists:${slugWithTier}`,
      categoryList: () => 'categories:list',
      categoryDetail: (slug: string) => `categories:detail:${slug}`,
    },
    CACHE_TTL: {
      userTier: 300,
      skillList: 60,
      skill: 300,
      constructList: 60,
      constructDetail: 60,
      constructSummary: 60,
      constructExists: 300,
      categories: 3600,
    },
    getCacheVisibilityTier: vi.fn(() => 'anon'),
    invalidateConstructCaches: vi.fn(() => Promise.resolve()),
    // Expose the mock redis instance for test assertions
    _mockRedis: redis,
  };
}
