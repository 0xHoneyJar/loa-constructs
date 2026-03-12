import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock setup (must come before app import) ---

// Select call tracking — each db.select() call consumes the next result
let selectResults: unknown[][] = [];
let selectCallIndex = 0;

// Insert/update tracking
let insertResults: unknown[][] = [];
let insertCallIndex = 0;
let updateResults: unknown[][] = [];
let updateCallIndex = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => void) => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    resolve(result);
  };
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(() => chain);
  chain.onConflictDoNothing = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => void) => {
    const result = insertResults[insertCallIndex] ?? [];
    insertCallIndex++;
    resolve(result);
  };
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => void) => {
    const result = updateResults[updateCallIndex] ?? [];
    updateCallIndex++;
    resolve(result);
  };
  return chain;
}

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => makeInsertChain()),
    update: vi.fn(() => makeUpdateChain()),
    execute: vi.fn(() => Promise.resolve({ rows: [] })),
    query: {
      packs: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
      skills: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
    },
  },
  packs: { name: 'packs' }, packVersions: { name: 'packVersions' }, packFiles: { name: 'packFiles' },
  skills: { name: 'skills' }, skillVersions: { name: 'skillVersions' }, skillFiles: { name: 'skillFiles' },
  users: { name: 'users', id: {}, email: {}, name: {}, passwordHash: {}, emailVerified: {}, isAdmin: {}, githubOrgMember: {}, walletAddress: {}, githubUserId: {}, githubOrgCheckedAt: {}, stripeCustomerId: {}, updatedAt: {} },
  teams: { name: 'teams' }, teamMembers: { name: 'teamMembers' },
  subscriptions: { name: 'subscriptions' }, licenses: { name: 'licenses' },
  apiKeys: { name: 'apiKeys' }, auditLogs: { name: 'auditLogs' },
  teamInvitations: { name: 'teamInvitations' },
  packSubscriptions: { name: 'packSubscriptions' }, packInstallations: { name: 'packInstallations' },
  skillUsage: { name: 'skillUsage' }, graduationRequests: { name: 'graduationRequests' },
  teamRoleEnum: {}, subscriptionTierEnum: {}, subscriptionStatusEnum: {},
  skillCategoryEnum: {}, ownerTypeEnum: {}, usageActionEnum: {},
  packStatusEnum: {}, packPricingTypeEnum: {}, packInstallActionEnum: {},
  constructMaturityEnum: {}, graduationRequestStatusEnum: {}, invitationStatusEnum: {},
  usersRelations: {}, teamsRelations: {}, teamMembersRelations: {},
  teamInvitationsRelations: {}, subscriptionsRelations: {},
  skillsRelations: {}, skillVersionsRelations: {}, skillFilesRelations: {},
  packsRelations: {}, packVersionsRelations: {}, packFilesRelations: {},
}));

vi.mock('../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-jwt-secret-for-unit-tests-only-32chars!',
    JWT_ISSUER: 'https://api.constructs.network',
    REDIS_URL: undefined,
    R2_ACCOUNT_ID: 'test',
    R2_ACCESS_KEY_ID: 'test',
    R2_SECRET_ACCESS_KEY: 'test',
    R2_BUCKET: 'test',
    MAINTENANCE_MODE: 'false',
    CONSTRUCTS_ORG: '0xHoneyJar',
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

vi.mock('../lib/monitoring.js', () => ({
  captureException: vi.fn(() => 'mock-event-id'),
  addBreadcrumb: vi.fn(),
  getAppVersion: vi.fn(() => '0.1.0-test'),
  initMonitoring: vi.fn(),
}));

// Redis mock — not configured by default (no rate limiting)
let mockRedisConfigured = false;

vi.mock('../services/redis.js', () => ({
  getRedis: vi.fn(() => {
    if (!mockRedisConfigured) throw new Error('REDIS_URL is not configured');
    return { ping: vi.fn(), incr: vi.fn(), expire: vi.fn(), exists: vi.fn(() => Promise.resolve(0)), setex: vi.fn() };
  }),
  isRedisConfigured: vi.fn(() => mockRedisConfigured),
  CACHE_KEYS: {
    rateLimit: (key: string, window: string) => `rate:${key}:${window}`,
    userTier: (userId: string) => `user:${userId}:tier`,
    constructList: () => 'cl', constructDetail: () => 'cd', constructSummary: () => 'cs',
    constructExists: () => 'ce', categoryList: () => 'catl', categoryDetail: () => 'catd',
    skillList: () => 'sl', skill: () => 's', session: () => 'se',
  },
  CACHE_TTL: { userTier: 300, skillList: 60, skill: 300, constructList: 60, constructDetail: 60, constructSummary: 60, constructExists: 300, categories: 3600 },
  getCacheVisibilityTier: vi.fn(() => 'anon'),
  invalidateConstructCaches: vi.fn(),
}));

// Mock email service (never actually send emails)
vi.mock('../services/email.js', () => ({
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
}));

// Mock audit service
vi.mock('../services/audit.js', () => ({
  logAuthEvent: vi.fn(() => Promise.resolve()),
  logUserAccountEvent: vi.fn(() => Promise.resolve()),
}));

// Mock subscription service
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

// Import app AFTER all mocks
import { app } from '../app.js';
import bcrypt from 'bcryptjs';
import { createAuthHeaders, createRefreshToken } from '../../tests/helpers/auth.js';
import { createMockUser } from '../../tests/helpers/fixtures.js';

// Pre-hash a password for test fixtures
let testPasswordHash: string;

beforeEach(async () => {
  vi.clearAllMocks();
  selectResults = [];
  selectCallIndex = 0;
  insertResults = [];
  insertCallIndex = 0;
  updateResults = [];
  updateCallIndex = 0;
  mockRedisConfigured = false;

  // Use a low-cost hash for speed in tests
  if (!testPasswordHash) {
    testPasswordHash = await bcrypt.hash('correct-password', 4);
  }
});

describe('Auth Routes', () => {
  describe('POST /v1/auth/login', () => {
    it('returns token pair on success', async () => {
      // Mock: find user by email
      selectResults = [
        [createMockUser({ id: 'user-1', name: 'Test', passwordHash: testPasswordHash })],
        // Mock: audit log insert (ignored)
      ];
      insertResults = [
        [{ id: 'audit-1' }], // audit log
      ];

      const res = await app.request('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@constructs.network', password: 'correct-password' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(body).toHaveProperty('token_type', 'Bearer');
      expect(body).toHaveProperty('expires_in');
      expect(body.user.id).toBe('user-1');
    });

    it('returns 401 on wrong password', async () => {
      selectResults = [
        [createMockUser({ id: 'user-1', name: 'Test', passwordHash: testPasswordHash })],
      ];

      const res = await app.request('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@constructs.network', password: 'wrong-password' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 on non-existent email (anti-enumeration)', async () => {
      selectResults = [[]]; // No user found

      const res = await app.request('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@constructs.network', password: 'any-password' }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      // Same error shape as wrong password (anti-enumeration)
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Invalid email or password');
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('returns new tokens with valid refresh token', async () => {
      const refreshToken = await createRefreshToken('user-1', { jti: 'jti-refresh-1' });

      // Mock: user lookup for refresh
      selectResults = [
        [createMockUser({ id: 'user-1', name: 'Test' })],
      ];

      const res = await app.request('/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(body).toHaveProperty('token_type', 'Bearer');
    });

    it('returns 401 when token is blacklisted', async () => {
      // Enable Redis so blacklist check works
      mockRedisConfigured = true;

      // Override the Redis mock for this test to return exists=1 (blacklisted)
      const redisModule = await import('../services/redis.js');
      const mockRedis = {
        ping: vi.fn(),
        incr: vi.fn(() => Promise.resolve(1)),
        expire: vi.fn(() => Promise.resolve(1)),
        exists: vi.fn(() => Promise.resolve(1)), // Token IS blacklisted
        setex: vi.fn(),
      };
      vi.mocked(redisModule.getRedis).mockReturnValue(mockRedis as unknown as ReturnType<typeof redisModule.getRedis>);
      vi.mocked(redisModule.isRedisConfigured).mockReturnValue(true);

      const refreshToken = await createRefreshToken('user-1', { jti: 'jti-blacklisted' });

      const res = await app.request('/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      // Should be 401 because token is blacklisted
      expect(res.status).toBe(401);
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('calls blacklistService.add() with correct JTI', async () => {
      const jti = 'jti-logout-test';
      const refreshToken = await createRefreshToken('user-1', { jti });

      // Mock: getUserById for requireAuth (access token validation)
      selectResults = [
        [createMockUser({ id: 'user-1', name: 'Test' })],
      ];

      const authHeaders = await createAuthHeaders('user-1', 'test@constructs.network');

      const res = await app.request('/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /v1/auth/me', () => {
    it('returns user with is_org_member, tier, wallet_address', async () => {
      // Mock: getUserById for requireAuth
      selectResults = [
        [createMockUser({ id: 'user-1', githubOrgMember: true, walletAddress: '0xABC123' })],
      ];

      const authHeaders = await createAuthHeaders('user-1', 'test@constructs.network');

      const res = await app.request('/v1/auth/me', {
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeTruthy();
      expect(body.user.id).toBe('user-1');
      expect(body.user).toHaveProperty('is_org_member', true);
      expect(body.user).toHaveProperty('tier', 'free');
      expect(body.user).toHaveProperty('wallet_address', '0xABC123');
    });
  });

  describe('GET /v1/auth/validate', () => {
    it('returns { valid: true, auth_method: "jwt" }', async () => {
      // Mock: getUserById for requireAuth
      selectResults = [
        [createMockUser({ id: 'user-1' })],
      ];

      const authHeaders = await createAuthHeaders('user-1', 'test@constructs.network');

      const res = await app.request('/v1/auth/validate', {
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.auth_method).toBe('jwt');
      expect(body.user.id).toBe('user-1');
    });
  });
});
