import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoisted mock variables (accessible inside vi.mock factories) ---
const { mockExecute, mockPing, mockRedisConfiguredRef } = vi.hoisted(() => {
  return {
    mockExecute: vi.fn(() => Promise.resolve({ rows: [] })),
    mockPing: vi.fn(() => Promise.resolve('PONG')),
    mockRedisConfiguredRef: { value: false },
  };
});

vi.mock('../db/index.js', () => {
  const selectChain = {
    from: vi.fn(() => selectChain),
    leftJoin: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    orderBy: vi.fn(() => selectChain),
    limit: vi.fn(() => selectChain),
    offset: vi.fn(() => selectChain),
    then: (resolve: (value: unknown) => void) => resolve([]),
  };
  return {
    db: {
      select: vi.fn(() => selectChain),
      execute: mockExecute,
      query: {
        packs: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
        skills: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
      },
    },
    packs: { name: 'packs' },
    packVersions: { name: 'packVersions' },
    packFiles: { name: 'packFiles' },
    skills: { name: 'skills' },
    skillVersions: { name: 'skillVersions' },
    skillFiles: { name: 'skillFiles' },
    users: { name: 'users' },
    teams: { name: 'teams' },
    teamMembers: { name: 'teamMembers' },
    subscriptions: { name: 'subscriptions' },
    licenses: { name: 'licenses' },
    apiKeys: { name: 'apiKeys' },
    auditLogs: { name: 'auditLogs' },
    teamInvitations: { name: 'teamInvitations' },
    packSubscriptions: { name: 'packSubscriptions' },
    packInstallations: { name: 'packInstallations' },
    skillUsage: { name: 'skillUsage' },
    graduationRequests: { name: 'graduationRequests' },
    teamRoleEnum: {}, subscriptionTierEnum: {}, subscriptionStatusEnum: {},
    skillCategoryEnum: {}, ownerTypeEnum: {}, usageActionEnum: {},
    packStatusEnum: {}, packPricingTypeEnum: {}, packInstallActionEnum: {},
    constructMaturityEnum: {}, graduationRequestStatusEnum: {}, invitationStatusEnum: {},
    usersRelations: {}, teamsRelations: {}, teamMembersRelations: {},
    teamInvitationsRelations: {}, subscriptionsRelations: {},
    skillsRelations: {}, skillVersionsRelations: {}, skillFilesRelations: {},
    packsRelations: {}, packVersionsRelations: {}, packFilesRelations: {},
  };
});

vi.mock('../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-jwt-secret-for-unit-tests-only-32chars!',
    JWT_ISSUER: 'https://api.constructs.network',
    JWT_EXPIRES_IN: '7d',
    REDIS_URL: undefined,
    R2_ACCOUNT_ID: 'test',
    R2_ACCESS_KEY_ID: 'test',
    R2_SECRET_ACCESS_KEY: 'test',
    R2_BUCKET: 'test',
    MAINTENANCE_MODE: 'false',
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
  getRedis: vi.fn(() => {
    if (!mockRedisConfiguredRef.value) throw new Error('REDIS_URL is not configured');
    return { ping: mockPing };
  }),
  isRedisConfigured: vi.fn(() => mockRedisConfiguredRef.value),
  CACHE_KEYS: {
    rateLimit: (key: string, window: string) => `rate:${key}:${window}`,
    constructList: () => 'constructs:list',
    constructDetail: () => 'constructs:detail',
    constructSummary: () => 'constructs:summary',
    constructExists: () => 'constructs:exists',
    categoryList: () => 'categories:list',
    categoryDetail: () => 'categories:detail',
    userTier: () => 'user:tier',
    skillList: () => 'skills:list',
    skill: () => 'skill',
    session: () => 'session',
  },
  CACHE_TTL: { userTier: 300, skillList: 60, skill: 300, constructList: 60, constructDetail: 60, constructSummary: 60, constructExists: 300, categories: 3600 },
  getCacheVisibilityTier: vi.fn(() => 'anon'),
  invalidateConstructCaches: vi.fn(),
}));

vi.mock('../lib/monitoring.js', () => ({
  captureException: vi.fn(() => 'mock-event-id'),
  addBreadcrumb: vi.fn(),
  getAppVersion: vi.fn(() => '0.1.0-test'),
  initMonitoring: vi.fn(),
}));

// Import app AFTER all mocks
import { app } from '../app.js';

describe('Health Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisConfiguredRef.value = false;
    mockExecute.mockResolvedValue({ rows: [] });
  });

  describe('GET /v1/health', () => {
    it('returns 200 with healthy status', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      const res = await app.request('/v1/health');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('uptime');
    });

    // T-1.4 acceptance (cycle constructs-network-migration · SDD §5.4):
    // /v1/health surfaces db_status so operators can confirm the Postgres
    // cutover landed without hitting the heavier /v1/health/ready check.
    it('returns db_status: connected when DB ping succeeds', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      const res = await app.request('/v1/health');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('db_status', 'connected');
    });

    it('returns 200 with db_status: disconnected when DB ping fails', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Connection refused'));
      const res = await app.request('/v1/health');
      // /v1/health is the load-balancer probe — stays 200 so traffic still
      // routes to the API for yaml-sourced read paths even when Postgres
      // is down. /v1/health/ready is the 503-returning readiness probe.
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('db_status', 'disconnected');
    });
  });

  describe('GET /v1/health/ready', () => {
    it('returns 200 with health check results', async () => {
      const res = await app.request('/v1/health/ready');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(['healthy', 'degraded']).toContain(body.status);
      expect(body).toHaveProperty('checks');
      expect(Array.isArray(body.checks)).toBe(true);
      expect(body.checks.length).toBeGreaterThan(0);
      expect(body.checks[0]).toHaveProperty('name', 'api');
      expect(body.checks[0]).toHaveProperty('status', 'pass');
    });

    it('returns 200 with database: pass when DB is up', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const res = await app.request('/v1/health/ready');
      expect(res.status).toBe(200);

      const body = await res.json();
      const dbCheck = body.checks.find((c: { name: string }) => c.name === 'database');
      expect(dbCheck).toBeTruthy();
      expect(dbCheck.status).toBe('pass');
    });

    it('returns 503 with database: fail when DB is down', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Connection refused'));

      const res = await app.request('/v1/health/ready');
      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.status).toBe('unhealthy');
      const dbCheck = body.checks.find((c: { name: string }) => c.name === 'database');
      expect(dbCheck).toBeTruthy();
      expect(dbCheck.status).toBe('fail');
    });

    it('returns 200 (degraded) with cache: warn when Redis is down', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      mockRedisConfiguredRef.value = true;
      mockPing.mockRejectedValueOnce(new Error('Redis connection error'));

      const res = await app.request('/v1/health/ready');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('degraded');
      const cacheCheck = body.checks.find((c: { name: string }) => c.name === 'cache');
      expect(cacheCheck).toBeTruthy();
      expect(cacheCheck.status).toBe('warn');
    });

    it('returns 200 with cache: warn when Redis not configured', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      mockRedisConfiguredRef.value = false;

      const res = await app.request('/v1/health/ready');
      expect(res.status).toBe(200);

      const body = await res.json();
      const cacheCheck = body.checks.find((c: { name: string }) => c.name === 'cache');
      expect(cacheCheck).toBeTruthy();
      expect(cacheCheck.status).toBe('warn');
    });
  });

  describe('GET /v1/health/metrics', () => {
    it('includes memory.rss_mb and process.pid', async () => {
      const res = await app.request('/v1/health/metrics');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('memory');
      expect(body.memory).toHaveProperty('rss_mb');
      expect(typeof body.memory.rss_mb).toBe('number');

      expect(body).toHaveProperty('process');
      expect(body.process).toHaveProperty('pid');
      expect(typeof body.process.pid).toBe('number');
    });
  });

  describe('GET /v1/health/live', () => {
    it('includes status: alive and uptime_seconds', async () => {
      const res = await app.request('/v1/health/live');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('status', 'alive');
      expect(body).toHaveProperty('uptime_seconds');
      expect(typeof body.uptime_seconds).toBe('number');
    });
  });
});

describe('API Root', () => {
  it('redirects / to /v1/health', async () => {
    const res = await app.request('/', { redirect: 'manual' });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/v1/health');
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent-route');

    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Route not found');
    expect(body).toHaveProperty('request_id');
  });
});
