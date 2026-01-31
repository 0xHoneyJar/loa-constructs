/**
 * Redis Client Configuration
 * @see sdd.md §1.3 Data Layer - Redis (Upstash)
 * @see sdd.md §3.6 Caching Strategy
 */

import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';

// --- Redis Client ---

let redisClient: Redis | null = null;

/**
 * Get Redis client instance (lazy initialization)
 * @throws Error if REDIS_URL is not configured
 */
export function getRedis(): Redis {
  if (!redisClient) {
    if (!env.REDIS_URL) {
      throw new Error('REDIS_URL is not configured');
    }
    // Upstash Redis URL format includes both URL and token
    // Example: https://xxx.upstash.io?token=xxx
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

/**
 * Cache key patterns
 * @see sdd.md §3.6 Caching Strategy
 */
export const CACHE_KEYS = {
  // User's effective subscription tier
  userTier: (userId: string) => `user:${userId}:tier`,

  // Skill list (paginated)
  skillList: (params: string) => `skills:list:${params}`,

  // Skill details
  skill: (slug: string) => `skill:${slug}`,

  // Rate limit counters
  rateLimit: (key: string, window: string) => `rate:${key}:${window}`,

  // Session tokens (for invalidation)
  session: (tokenHash: string) => `session:${tokenHash}`,

  // Constructs (unified view)
  constructList: (params: string) => `constructs:list:${params}`,
  constructDetail: (slug: string) => `constructs:detail:${slug}`,
  constructSummary: () => 'constructs:summary',
  constructExists: (slug: string) => `constructs:exists:${slug}`,
} as const;

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  userTier: 300, // 5 minutes
  skillList: 60, // 1 minute
  skill: 300, // 5 minutes
  constructList: 60, // 1 minute
  constructDetail: 60, // 1 minute
  constructSummary: 60, // 1 minute
  constructExists: 300, // 5 minutes
} as const;
