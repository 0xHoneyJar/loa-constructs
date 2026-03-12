import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock setup (must come before app/service imports) ---

const mockRedis = {
  setex: vi.fn(() => Promise.resolve('OK')),
  exists: vi.fn(() => Promise.resolve(0)),
  del: vi.fn(() => Promise.resolve(1)),
};

let redisConfigured = true;

vi.mock('./redis.js', () => ({
  getRedis: vi.fn(() => {
    if (!redisConfigured) throw new Error('REDIS_URL is not configured');
    return mockRedis;
  }),
  isRedisConfigured: vi.fn(() => redisConfigured),
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

// Import after mocks
import { blacklistService } from './blacklist.js';

describe('blacklistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisConfigured = true;
  });

  describe('add()', () => {
    it('skips when Redis not configured', async () => {
      redisConfigured = false;

      await expect(blacklistService.add('jti-1', 3600)).resolves.toBeUndefined();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('skips expired tokens (TTL <= 0)', async () => {
      await expect(blacklistService.add('jti-1', 0)).resolves.toBeUndefined();
      expect(mockRedis.setex).not.toHaveBeenCalled();

      await expect(blacklistService.add('jti-2', -100)).resolves.toBeUndefined();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('sets key with correct TTL', async () => {
      await blacklistService.add('jti-test', 7200);

      expect(mockRedis.setex).toHaveBeenCalledWith('blacklist:jti-test', 7200, '1');
    });

    it('degrades gracefully on Redis error (does not throw)', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis connection error'));

      await expect(blacklistService.add('jti-fail', 3600)).resolves.toBeUndefined();
    });
  });

  describe('isBlacklisted()', () => {
    it('returns false when Redis not configured', async () => {
      redisConfigured = false;

      const result = await blacklistService.isBlacklisted('jti-1');
      expect(result).toBe(false);
    });

    it('returns false when token not found', async () => {
      mockRedis.exists.mockResolvedValueOnce(0);

      const result = await blacklistService.isBlacklisted('jti-not-found');
      expect(result).toBe(false);
      expect(mockRedis.exists).toHaveBeenCalledWith('blacklist:jti-not-found');
    });

    it('returns true when token found', async () => {
      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await blacklistService.isBlacklisted('jti-found');
      expect(result).toBe(true);
    });

    it('returns true on Redis error (fail-secure)', async () => {
      mockRedis.exists.mockRejectedValueOnce(new Error('Redis connection error'));

      const result = await blacklistService.isBlacklisted('jti-error');
      expect(result).toBe(true);
    });
  });
});
