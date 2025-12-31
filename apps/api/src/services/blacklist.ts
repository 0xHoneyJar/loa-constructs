/**
 * Token Blacklist Service
 * @see sdd-v2.md §4.1 L1: Token Blacklist Service
 * @see sprint-v2.md T13.1: Token Blacklist Service
 *
 * Implements token revocation via Redis blacklist for true logout functionality.
 * Tokens are blacklisted by their JTI (JWT ID) with TTL matching token expiry.
 */

import { getRedis, isRedisConfigured } from './redis.js';
import { logger } from '../lib/logger.js';

// --- Constants ---

const BLACKLIST_PREFIX = 'blacklist:';

// Refresh token expiry in seconds (30 days)
export const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

// --- Blacklist Service ---

export const blacklistService = {
  /**
   * Add a token to the blacklist
   * @param jti - JWT ID (unique token identifier)
   * @param expiresInSeconds - TTL for blacklist entry (should match remaining token lifetime)
   */
  async add(jti: string, expiresInSeconds: number): Promise<void> {
    if (!isRedisConfigured()) {
      logger.warn({ jti }, 'Token blacklist skipped - Redis not configured');
      return;
    }

    try {
      const redis = getRedis();
      const key = `${BLACKLIST_PREFIX}${jti}`;

      // Only blacklist if TTL is positive
      if (expiresInSeconds <= 0) {
        logger.debug({ jti }, 'Token already expired, skipping blacklist');
        return;
      }

      await redis.setex(key, expiresInSeconds, '1');
      logger.info({ jti, ttl: expiresInSeconds }, 'Token added to blacklist');
    } catch (error) {
      // Log but don't throw - graceful degradation
      logger.error({ error, jti }, 'Failed to add token to blacklist');
    }
  },

  /**
   * Check if a token is blacklisted
   * @param jti - JWT ID to check
   * @returns true if blacklisted, false otherwise
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    if (!isRedisConfigured()) {
      // If Redis is not configured, tokens cannot be blacklisted
      // This is a security trade-off for simpler dev environments
      return false;
    }

    try {
      const redis = getRedis();
      const key = `${BLACKLIST_PREFIX}${jti}`;
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      // On Redis error, fail secure - treat as blacklisted
      // This prevents tokens from being used during Redis outages
      logger.error({ error, jti }, 'Failed to check token blacklist');
      return true;
    }
  },

  /**
   * Remove a token from the blacklist (rarely needed, for testing)
   * @param jti - JWT ID to remove
   */
  async remove(jti: string): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      const redis = getRedis();
      const key = `${BLACKLIST_PREFIX}${jti}`;
      await redis.del(key);
      logger.info({ jti }, 'Token removed from blacklist');
    } catch (error) {
      logger.error({ error, jti }, 'Failed to remove token from blacklist');
    }
  },
};
