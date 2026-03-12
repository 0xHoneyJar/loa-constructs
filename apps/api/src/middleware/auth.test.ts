import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// --- Mock setup ---

// Store select results for the db mock chain
let selectResults: unknown[] = [];
let selectCallIndex = 0;

const updateChain = {
  set: vi.fn(() => updateChain),
  where: vi.fn(() => updateChain),
  then: (resolve: (value: unknown) => void) => resolve([]),
};

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => {
      // Create a fresh chain for each select call
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        then: (resolve: (value: unknown) => void) => {
          const result = selectResults[selectCallIndex] ?? [];
          selectCallIndex++;
          resolve(result);
        },
      };
      return chain;
    }),
    update: vi.fn(() => updateChain),
  },
  users: { name: 'users', id: {}, email: {}, name: {}, emailVerified: {}, isAdmin: {}, githubOrgMember: {}, walletAddress: {} },
  apiKeys: { name: 'apiKeys', id: {}, userId: {}, keyPrefix: {}, keyHash: {}, revoked: {}, expiresAt: {}, lastUsedAt: {} },
}));

vi.mock('../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-for-unit-tests-only-32chars!',
    JWT_ISSUER: 'https://api.constructs.network',
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

vi.mock('../services/redis.js', () => ({
  getRedis: vi.fn().mockReturnValue(null),
  isRedisConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock('../services/subscription.js', () => ({
  getEffectiveTier: vi.fn().mockResolvedValue({
    tier: 'free',
    source: 'personal',
    subscriptionId: null,
    expiresAt: null,
  }),
  canAccessTier: vi.fn((userTier: string, requiredTier: string) => {
    const hierarchy: Record<string, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };
    return (hierarchy[userTier] ?? 0) >= (hierarchy[requiredTier] ?? 0);
  }),
}));

// Import AFTER mocks
import { requireAuth, optionalAuth, requireTier, requireOrgMember, requireVerifiedEmail } from './auth.js';
import { createAuthHeaders, createExpiredAuthHeaders } from '../../tests/helpers/auth.js';
import { createMockUser } from '../../tests/helpers/fixtures.js';

// Helper: create a minimal test app with auth middleware
function createApp(middleware: ReturnType<typeof requireAuth>) {
  const app = new Hono();
  app.onError((err, c) => {
    if (err && typeof err === 'object' && 'status' in err) {
      const appErr = err as { code: string; message: string; status: number; details?: Record<string, unknown> };
      return c.json(
        { error: { code: appErr.code, message: appErr.message, details: appErr.details } },
        appErr.status as 401 | 402 | 403
      );
    }
    return c.json({ error: { message: err.message } }, 500);
  });
  app.use('*', middleware);
  app.get('/test', (c) => {
    const user = c.get('user');
    const authMethod = c.get('authMethod');
    return c.json({ user: user ?? null, authMethod: authMethod ?? null });
  });
  return app;
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    selectCallIndex = 0;
  });

  describe('requireAuth()', () => {
    it('returns 401 with no Authorization header', async () => {
      const app = createApp(requireAuth());
      const res = await app.request('/test');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 with invalid JWT', async () => {
      const app = createApp(requireAuth());
      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer invalid-token-garbage' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns 401 with expired JWT', async () => {
      const app = createApp(requireAuth());
      const headers = await createExpiredAuthHeaders();
      const res = await app.request('/test', { headers });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('sets context vars with valid JWT + existing user', async () => {
      // Mock: getUserById returns a user (2 select calls: user lookup + subscription tier)
      selectResults = [
        [createMockUser()],
      ];

      const app = createApp(requireAuth());
      const headers = await createAuthHeaders('user-test-1', 'test@constructs.network');
      const res = await app.request('/test', { headers });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeTruthy();
      expect(body.user.id).toBe('user-test-1');
      expect(body.user.email).toBe('test@constructs.network');
      expect(body.authMethod).toBe('jwt');
    });

    it('returns 401 when JWT valid but user deleted from DB', async () => {
      // Mock: getUserById returns no results
      selectResults = [[]];

      const app = createApp(requireAuth());
      const headers = await createAuthHeaders('user-deleted-1');
      const res = await app.request('/test', { headers });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('handles API key path (sk_* prefix)', async () => {
      // Mock: apiKeys lookup returns a key, then user lookup, then update lastUsedAt
      selectResults = [
        [{ id: 'key-1', userId: 'user-test-1', keyHash: 'fake-hash', revoked: false, expiresAt: null }],
        [createMockUser()],
      ];

      // Mock bcrypt.compare to return true for API key verification
      const authService = await import('../services/auth.js');
      vi.spyOn(authService, 'verifyApiKey').mockResolvedValueOnce(true);

      const app = createApp(requireAuth());
      const res = await app.request('/test', {
        headers: { Authorization: 'sk_test_abcdef123456' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.authMethod).toBe('api_key');
    });
  });

  describe('optionalAuth()', () => {
    it('passes through without auth, no error', async () => {
      const app = createApp(optionalAuth());
      const res = await app.request('/test');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeNull();
    });

    it('attaches user with valid JWT', async () => {
      selectResults = [
        [createMockUser({ githubOrgMember: true, walletAddress: '0x123' })],
      ];

      const app = createApp(optionalAuth());
      const headers = await createAuthHeaders('user-test-1', 'test@constructs.network', { isOrgMember: true });
      const res = await app.request('/test', { headers });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeTruthy();
      expect(body.user.id).toBe('user-test-1');
      expect(body.user.isOrgMember).toBe(true);
    });
  });

  describe('requireTier()', () => {
    it('returns 402 for free user accessing pro tier', async () => {
      const app = new Hono();
      app.onError((err, c) => {
        if (err && 'status' in err) {
          const appErr = err as { code: string; message: string; status: number; details?: Record<string, unknown> };
          return c.json({ error: { code: appErr.code, details: appErr.details } }, appErr.status as 402);
        }
        return c.json({ error: { message: 'unexpected' } }, 500);
      });
      // Simulate authenticated user with free tier
      app.use('*', async (c, next) => {
        c.set('user', { id: 'u1', email: 'u@t.com', name: 'U', emailVerified: true, tier: 'free', isOrgMember: false, walletAddress: null });
        await next();
      });
      app.use('*', requireTier('pro'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error.code).toBe('TIER_UPGRADE_REQUIRED');
    });

    it('passes for pro user accessing pro tier', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('user', { id: 'u1', email: 'u@t.com', name: 'U', emailVerified: true, tier: 'pro', isOrgMember: false, walletAddress: null });
        await next();
      });
      app.use('*', requireTier('pro'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });
  });

  describe('requireOrgMember()', () => {
    it('returns 403 for non-org member', async () => {
      const app = new Hono();
      app.onError((err, c) => {
        if (err && 'status' in err) {
          const appErr = err as { code: string; message: string; status: number };
          return c.json({ error: { code: appErr.code } }, appErr.status as 403);
        }
        return c.json({ error: { message: 'unexpected' } }, 500);
      });
      app.use('*', async (c, next) => {
        c.set('user', { id: 'u1', email: 'u@t.com', name: 'U', emailVerified: true, tier: 'free', isOrgMember: false, walletAddress: null });
        await next();
      });
      app.use('*', requireOrgMember());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('requireVerifiedEmail()', () => {
    it('returns 403 for unverified email', async () => {
      const app = new Hono();
      app.onError((err, c) => {
        if (err && 'status' in err) {
          const appErr = err as { code: string; message: string; status: number };
          return c.json({ error: { code: appErr.code } }, appErr.status as 403);
        }
        return c.json({ error: { message: 'unexpected' } }, 500);
      });
      app.use('*', async (c, next) => {
        c.set('user', { id: 'u1', email: 'u@t.com', name: 'U', emailVerified: false, tier: 'free', isOrgMember: false, walletAddress: null });
        await next();
      });
      app.use('*', requireVerifiedEmail());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });
});
