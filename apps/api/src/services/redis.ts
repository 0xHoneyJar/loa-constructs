/**
 * Redis Client Configuration
 * @see sdd.md §1.3 Data Layer - Redis (Upstash)
 * @see sdd.md §3.6 Caching Strategy
 */

import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';
import type { PackAccessContext } from './packs.js';

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
 * Cache visibility tier — determines cache key segmentation (cycle-038)
 * Prevents cache poisoning between different access levels.
 */
export type CacheVisibilityTier = 'anon' | 'member' | 'auth';

/**
 * Derive cache visibility tier from access context (cycle-038)
 * Used to segment cache keys so that anonymous users never see
 * cached results that include internal constructs.
 */
export function getCacheVisibilityTier(access?: PackAccessContext): CacheVisibilityTier {
  if (!access) return 'anon';
  if (access.isAdmin || access.isOrgMember) return 'member';
  return 'auth';
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

  // Constructs (unified view) — tier-segmented cache keys (cycle-038)
  constructList: (params: string) => `constructs:list:${params}`,
  constructDetail: (slugWithTier: string) => `constructs:detail:${slugWithTier}`,
  constructSummary: (tier?: string) => tier ? `constructs:summary:${tier}` : 'constructs:summary',
  constructExists: (slugWithTier: string) => `constructs:exists:${slugWithTier}`,

  // Categories
  categoryList: () => 'categories:list',
  categoryDetail: (slug: string) => `categories:detail:${slug}`,
} as const;

/**
 * Invalidate all construct caches for a given slug (cycle-038)
 * Single source of truth for cache invalidation — prevents key namespace drift.
 */
export async function invalidateConstructCaches(slug: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    const tiers: CacheVisibilityTier[] = ['anon', 'member', 'auth'];
    for (const tier of tiers) {
      await redis.del(CACHE_KEYS.constructDetail(`${tier}:${slug}`));
      await redis.del(CACHE_KEYS.constructExists(`${tier}:${slug}`));
    }
    // Scan and delete list + summary caches (tier-segmented)
    const listKeys = await redis.keys('constructs:list:*');
    if (listKeys.length > 0) await redis.del(...listKeys);
    const summaryKeys = await redis.keys('constructs:summary:*');
    if (summaryKeys.length > 0) await redis.del(...summaryKeys);
  } catch (err) {
    // Log but don't fail — cache will TTL naturally
    console.warn('Failed to invalidate construct caches:', err);
  }
}

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
  categories: 3600, // 1 hour
} as const;
