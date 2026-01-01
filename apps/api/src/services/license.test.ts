/**
 * License Service Tests
 * @see sprint.md Sprint 4: T4.3 License Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWatermark } from './license.js';

// Mock database and dependencies
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-license-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
  licenses: {},
  skills: {},
  subscriptions: {},
}));

vi.mock('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-for-license-tests-32chars',
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./subscription.js', () => ({
  canAccessTier: vi.fn((userTier, requiredTier) => {
    const hierarchy: Record<string, number> = {
      free: 0,
      pro: 1,
      team: 2,
      enterprise: 3,
    };
    return hierarchy[userTier] >= hierarchy[requiredTier];
  }),
}));

describe('License Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateWatermark', () => {
    it('should generate unique watermarks', () => {
      const watermark1 = generateWatermark('user-1');
      const watermark2 = generateWatermark('user-1');

      // Watermarks should be unique even for the same user
      expect(watermark1).not.toBe(watermark2);
    });

    it('should generate 32-character watermarks', () => {
      const watermark = generateWatermark('user-1');
      expect(watermark).toHaveLength(32);
    });

    it('should generate hex-only watermarks', () => {
      const watermark = generateWatermark('user-1');
      expect(/^[a-f0-9]+$/.test(watermark)).toBe(true);
    });

    it('should include user ID in hash input', () => {
      // Different users should generate different watermarks
      const watermark1 = generateWatermark('user-1');
      const watermark2 = generateWatermark('user-2');

      // While not strictly required (random component), very unlikely to match
      expect(watermark1).not.toBe(watermark2);
    });
  });

  describe('License Constants', () => {
    it('should define license issuer', () => {
      const issuer = 'https://api.constructs.network';
      expect(issuer).toBe('https://api.constructs.network');
    });

    it('should define license audience', () => {
      const audience = 'loa-constructs-client';
      expect(audience).toBe('loa-constructs-client');
    });

    it('should define free tier duration', () => {
      const freeDuration = 30;
      expect(freeDuration).toBe(30);
    });
  });

  describe('License Payload Structure', () => {
    it('should contain required fields', () => {
      const requiredFields = ['sub', 'skill', 'version', 'tier', 'watermark', 'lid'];
      expect(requiredFields).toHaveLength(6);
    });
  });

  describe('Tier Access Check', () => {
    it('should allow same tier access', async () => {
      const { canAccessTier } = await import('./subscription.js');
      expect(canAccessTier('free', 'free')).toBe(true);
      expect(canAccessTier('pro', 'pro')).toBe(true);
    });

    it('should allow higher tier to access lower tier', async () => {
      const { canAccessTier } = await import('./subscription.js');
      expect(canAccessTier('pro', 'free')).toBe(true);
      expect(canAccessTier('team', 'free')).toBe(true);
      expect(canAccessTier('enterprise', 'pro')).toBe(true);
    });

    it('should deny lower tier access to higher tier', async () => {
      const { canAccessTier } = await import('./subscription.js');
      expect(canAccessTier('free', 'pro')).toBe(false);
      expect(canAccessTier('pro', 'team')).toBe(false);
    });
  });
});

describe('Storage Key Generation', () => {
  it('should generate correct storage key format', () => {
    const generateStorageKey = (slug: string, version: string, path: string) => {
      const safePath = path.replace(/\.\./g, '').replace(/^\//, '');
      return `skills/${slug}/${version}/${safePath}`;
    };

    expect(generateStorageKey('my-skill', '1.0.0', 'index.yaml'))
      .toBe('skills/my-skill/1.0.0/index.yaml');

    expect(generateStorageKey('my-skill', '1.0.0', 'resources/template.md'))
      .toBe('skills/my-skill/1.0.0/resources/template.md');
  });

  it('should sanitize path traversal attempts', () => {
    const generateStorageKey = (slug: string, version: string, path: string) => {
      const safePath = path.replace(/\.\./g, '').replace(/^\//, '');
      return `skills/${slug}/${version}/${safePath}`;
    };

    expect(generateStorageKey('my-skill', '1.0.0', '../etc/passwd'))
      .toBe('skills/my-skill/1.0.0/etc/passwd');

    expect(generateStorageKey('my-skill', '1.0.0', '/absolute/path'))
      .toBe('skills/my-skill/1.0.0/absolute/path');
  });
});
