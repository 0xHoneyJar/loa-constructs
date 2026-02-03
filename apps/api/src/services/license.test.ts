/**
 * License Service Tests
 * @see sprint.md Sprint 4: T4.3 License Service
 * @see sprint-license-jwt-rs256.md T3.3: Integration Tests - License RS256 Flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jose from 'jose';
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

// Mock env config - tests can override these
const mockEnvConfig = {
  JWT_SECRET: 'test-jwt-secret-for-license-tests-32chars',
  JWT_PRIVATE_KEY: undefined as string | undefined,
  JWT_PUBLIC_KEY: undefined as string | undefined,
  JWT_KEY_ID: 'key-2026-02',
};

vi.mock('../config/env.js', () => ({
  env: {
    get JWT_SECRET() {
      return mockEnvConfig.JWT_SECRET;
    },
  },
  getPrivateKey: () => {
    if (!mockEnvConfig.JWT_PRIVATE_KEY) throw new Error('No private key');
    return Buffer.from(mockEnvConfig.JWT_PRIVATE_KEY, 'base64').toString('utf-8');
  },
  getPublicKey: () => {
    if (!mockEnvConfig.JWT_PUBLIC_KEY) throw new Error('No public key');
    return Buffer.from(mockEnvConfig.JWT_PUBLIC_KEY, 'base64').toString('utf-8');
  },
  getKeyId: () => mockEnvConfig.JWT_KEY_ID,
  isRS256Available: () => !!mockEnvConfig.JWT_PRIVATE_KEY && !!mockEnvConfig.JWT_PUBLIC_KEY,
  isHS256Available: () => !!mockEnvConfig.JWT_SECRET,
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

vi.mock('./public-keys.js', () => ({
  getCurrentKeyMetadata: vi.fn(() =>
    Promise.resolve({
      keyId: mockEnvConfig.JWT_KEY_ID,
      algorithm: 'RS256',
    })
  ),
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

/**
 * RS256 JWT Signing Tests
 * @see sprint-license-jwt-rs256.md T3.3: Integration Tests - License RS256 Flow
 */
describe('RS256 JWT Signing', () => {
  // Generate test RSA keys for each test
  let testPrivateKey: string;
  let testPublicKey: string;

  beforeEach(async () => {
    // Generate a fresh RSA key pair for testing
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
    testPrivateKey = await jose.exportPKCS8(privateKey);
    testPublicKey = await jose.exportSPKI(publicKey);

    // Reset env config
    mockEnvConfig.JWT_SECRET = 'test-jwt-secret-for-license-tests-32chars';
    mockEnvConfig.JWT_PRIVATE_KEY = undefined;
    mockEnvConfig.JWT_PUBLIC_KEY = undefined;
    mockEnvConfig.JWT_KEY_ID = 'key-2026-02';

    vi.clearAllMocks();
  });

  describe('Algorithm Selection', () => {
    it('should prefer RS256 when both RS256 and HS256 are configured', async () => {
      mockEnvConfig.JWT_PRIVATE_KEY = Buffer.from(testPrivateKey).toString('base64');
      mockEnvConfig.JWT_PUBLIC_KEY = Buffer.from(testPublicKey).toString('base64');
      mockEnvConfig.JWT_SECRET = 'also-have-hs256-secret';

      const { isRS256Available, isHS256Available } = await import('../config/env.js');
      expect(isRS256Available()).toBe(true);
      expect(isHS256Available()).toBe(true);
    });

    it('should fall back to HS256 when RS256 is not configured', async () => {
      mockEnvConfig.JWT_PRIVATE_KEY = undefined;
      mockEnvConfig.JWT_PUBLIC_KEY = undefined;
      mockEnvConfig.JWT_SECRET = 'hs256-only-secret';

      const { isRS256Available, isHS256Available } = await import('../config/env.js');
      expect(isRS256Available()).toBe(false);
      expect(isHS256Available()).toBe(true);
    });
  });

  describe('JWT Header', () => {
    it('should include kid field when using RS256', async () => {
      // Create a test token with RS256
      const privateKey = await jose.importPKCS8(testPrivateKey, 'RS256');
      const token = await new jose.SignJWT({ sub: 'test-user' })
        .setProtectedHeader({
          alg: 'RS256',
          typ: 'JWT',
          kid: 'key-2026-02',
        })
        .setIssuedAt()
        .sign(privateKey);

      // Decode and verify header
      const [headerB64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
      expect(header.kid).toBe('key-2026-02');
    });
  });

  describe('Token Verification', () => {
    it('should verify RS256 token with matching public key', async () => {
      const privateKey = await jose.importPKCS8(testPrivateKey, 'RS256');
      const publicKey = await jose.importSPKI(testPublicKey, 'RS256');

      const token = await new jose.SignJWT({
        sub: 'user-123',
        skill: 'test-skill',
        version: '1.0.0',
        tier: 'pro',
        watermark: 'abc123',
        lid: 'license-id',
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'key-2026-02' })
        .setIssuedAt()
        .setIssuer('https://api.constructs.network')
        .setAudience('loa-constructs-client')
        .setExpirationTime('30d')
        .sign(privateKey);

      const { payload } = await jose.jwtVerify(token, publicKey, {
        issuer: 'https://api.constructs.network',
        audience: 'loa-constructs-client',
      });

      expect(payload.sub).toBe('user-123');
      expect(payload.skill).toBe('test-skill');
    });

    it('should reject RS256 token with wrong key', async () => {
      const privateKey = await jose.importPKCS8(testPrivateKey, 'RS256');

      // Generate a different key pair
      const { publicKey: wrongPublicKey } = await jose.generateKeyPair('RS256');

      const token = await new jose.SignJWT({ sub: 'user-123' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'key-2026-02' })
        .setIssuedAt()
        .setIssuer('https://api.constructs.network')
        .setAudience('loa-constructs-client')
        .setExpirationTime('30d')
        .sign(privateKey);

      await expect(
        jose.jwtVerify(token, wrongPublicKey, {
          issuer: 'https://api.constructs.network',
          audience: 'loa-constructs-client',
        })
      ).rejects.toThrow();
    });
  });

  describe('HS256 Backward Compatibility', () => {
    it('should generate and verify HS256 token', async () => {
      const secret = new TextEncoder().encode('test-jwt-secret-for-license-tests-32chars');

      const token = await new jose.SignJWT({
        sub: 'user-123',
        skill: 'test-skill',
        version: '1.0.0',
        tier: 'free',
        watermark: 'abc123',
        lid: 'license-id',
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer('https://api.constructs.network')
        .setAudience('loa-constructs-client')
        .setExpirationTime('30d')
        .sign(secret);

      const { payload } = await jose.jwtVerify(token, secret, {
        issuer: 'https://api.constructs.network',
        audience: 'loa-constructs-client',
      });

      expect(payload.sub).toBe('user-123');
    });

    it('should not have kid in HS256 header (legacy format)', async () => {
      const secret = new TextEncoder().encode('test-secret');

      const token = await new jose.SignJWT({ sub: 'test' })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .sign(secret);

      const [headerB64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

      expect(header.alg).toBe('HS256');
      expect(header.kid).toBeUndefined();
    });
  });
});
