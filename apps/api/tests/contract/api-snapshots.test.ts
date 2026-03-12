import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Contract Tests for API Response Shapes
 *
 * These tests verify that API responses maintain a consistent shape/contract.
 * They act as a regression guard during the infrastructure migration from
 * Fly.io + Neon to Railway + Supabase.
 *
 * Snapshots were captured from current production (2026-02-02).
 *
 * Task: T23.6 (Sprint 2 - Infrastructure Migration)
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const productionFixturesDir = join(__dirname, '../fixtures/production');
const loadProductionFixture = (name: string) =>
  JSON.parse(readFileSync(join(productionFixturesDir, `${name}.json`), 'utf8'));

// Mock data for constructs
const mockPacks = [
  {
    id: 'pack-1',
    name: 'Observer',
    slug: 'observer',
    description: 'AI-powered user research observer',
    status: 'published',
    icon: 'eye',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-20T00:00:00Z'),
    deletedAt: null,
    authorId: 'user-1',
    maturity: 'stable',
    searchKeywords: ['observe', 'watch'],
    searchUseCases: ['monitoring'],
  },
];

const mockSkills = [
  {
    id: 'skill-1',
    name: 'Analyze',
    slug: 'analyze',
    description: 'Analysis workflow',
    isPublic: true,
    isDeprecated: false,
    category: 'development',
    ownerId: 'user-1',
    ownerType: 'user',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-20T00:00:00Z'),
  },
];

// Mock database with full schema exports
vi.mock('../../src/db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    query: {
      packs: {
        findFirst: vi.fn(() => Promise.resolve(null)),
        findMany: vi.fn(() => Promise.resolve(mockPacks)),
      },
      skills: {
        findFirst: vi.fn(() => Promise.resolve(null)),
        findMany: vi.fn(() => Promise.resolve(mockSkills)),
      },
    },
  },
  // Schema table exports
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
  // Enum exports
  teamRoleEnum: {},
  subscriptionTierEnum: {},
  subscriptionStatusEnum: {},
  skillCategoryEnum: {},
  ownerTypeEnum: {},
  usageActionEnum: {},
  packStatusEnum: {},
  packPricingTypeEnum: {},
  packInstallActionEnum: {},
  constructMaturityEnum: {},
  graduationRequestStatusEnum: {},
  invitationStatusEnum: {},
  // Relations exports
  usersRelations: {},
  teamsRelations: {},
  teamMembersRelations: {},
  teamInvitationsRelations: {},
  subscriptionsRelations: {},
  skillsRelations: {},
  skillVersionsRelations: {},
  skillFilesRelations: {},
  packsRelations: {},
  packVersionsRelations: {},
  packFilesRelations: {},
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-key-at-least-32-characters-long',
    JWT_EXPIRES_IN: '7d',
    REDIS_URL: undefined,
    R2_ACCOUNT_ID: 'test',
    R2_ACCESS_KEY_ID: 'test',
    R2_SECRET_ACCESS_KEY: 'test',
    R2_BUCKET: 'test',
    MAINTENANCE_MODE: 'false',
  },
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../src/services/redis.js', () => ({
  getRedis: vi.fn(() => {
    throw new Error('REDIS_URL is not configured');
  }),
  isRedisConfigured: vi.fn().mockReturnValue(false),
  CACHE_KEYS: {
    rateLimit: (key: string, window: string) => `rate:${key}:${window}`,
    userTier: () => 'ut', constructList: () => 'cl', constructDetail: () => 'cd',
    constructSummary: () => 'cs', constructExists: () => 'ce',
    categoryList: () => 'catl', categoryDetail: () => 'catd',
    skillList: () => 'sl', skill: () => 's', session: () => 'se',
  },
  CACHE_TTL: { userTier: 300, skillList: 60, skill: 300, constructList: 60, constructDetail: 60, constructSummary: 60, constructExists: 300, categories: 3600 },
  getCacheVisibilityTier: vi.fn(() => 'anon'),
  invalidateConstructCaches: vi.fn(),
}));

vi.mock('../../src/lib/monitoring.js', () => ({
  captureException: vi.fn(() => 'mock-event-id'),
  addBreadcrumb: vi.fn(),
  getAppVersion: vi.fn(() => '0.1.0-test'),
  initMonitoring: vi.fn(),
}));

vi.mock('../../src/services/category.js', () => ({
  normalizeCategory: (slug: string) => {
    const mappings: Record<string, string> = { gtm: 'marketing', dev: 'development' };
    return mappings[slug.toLowerCase()] || slug.toLowerCase();
  },
  listCategories: vi.fn().mockResolvedValue([
    { id: '1', slug: 'marketing', label: 'Marketing', color: '#FF44FF', description: 'GTM and campaigns', sortOrder: 1, constructCount: 5 },
    { id: '2', slug: 'development', label: 'Development', color: '#44FF88', description: 'Coding and testing', sortOrder: 2, constructCount: 10 },
  ]),
  getCategoryBySlug: vi.fn().mockImplementation(async (slug: string) => {
    const cats: Record<string, { id: string; slug: string; label: string; color: string; description: string; sortOrder: number; constructCount: number }> = {
      marketing: { id: '1', slug: 'marketing', label: 'Marketing', color: '#FF44FF', description: 'GTM and campaigns', sortOrder: 1, constructCount: 5 },
      development: { id: '2', slug: 'development', label: 'Development', color: '#44FF88', description: 'Coding and testing', sortOrder: 2, constructCount: 10 },
    };
    return cats[slug.toLowerCase()] || null;
  }),
}));

// Import app after all mocks are set up
import { app } from '../../src/app.js';

describe('Contract Tests: API Response Shapes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/health', () => {
    it('should return expected health response shape', async () => {
      const res = await app.request('/v1/health', {
        method: 'GET',
      });

      expect(res.status).toBe(200);

      const body = await res.json();

      // Verify response shape matches production contract
      // Health endpoint returns 'healthy', 'warn', or 'unhealthy'
      expect(body).toMatchObject({
        status: expect.stringMatching(/^(healthy|warn|unhealthy)$/),
        timestamp: expect.any(String),
      });

      // Timestamp should be ISO 8601 format - Date.parse returns NaN for invalid strings
      const parsedTs = Date.parse(body.timestamp);
      expect(Number.isNaN(parsedTs)).toBe(false);
      expect(new Date(parsedTs).toISOString()).toBe(body.timestamp);

      // Snapshot test for exact shape (update with: vitest -u)
      // Exclude dynamic fields: timestamp, build time, uptime
      expect(body).toMatchSnapshot({
        timestamp: expect.any(String),
        build: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it('should include version in health response when available', async () => {
      const res = await app.request('/v1/health', {
        method: 'GET',
      });

      const body = await res.json();

      // Version is optional but should be string if present
      if (body.version !== undefined) {
        expect(typeof body.version).toBe('string');
      }
    });
  });

  describe('GET /v1/packs/:slug - 404 Response', () => {
    it('should return expected 404 error response shape', async () => {
      const res = await app.request('/v1/packs/non-existent-pack-slug', {
        method: 'GET',
      });

      expect(res.status).toBe(404);

      const body = await res.json();

      // Verify 404 error response shape - API returns nested error object
      expect(body).toHaveProperty('error');
      expect(body.error).toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
      });

      // Error message should be descriptive
      expect(body.error.message.toLowerCase()).toContain('not found');

      // Snapshot test for 404 response shape (exclude dynamic request_id)
      expect(body).toMatchSnapshot({
        request_id: expect.any(String),
      });
    });

    it('should include request_id in error response if available', async () => {
      const res = await app.request('/v1/packs/non-existent-pack', {
        method: 'GET',
      });

      const body = await res.json();

      // request_id is optional but should be string if present
      if (body.request_id !== undefined) {
        expect(typeof body.request_id).toBe('string');
      }
    });
  });

  describe('Error Response Contract', () => {
    it('should return consistent error shape for validation errors', async () => {
      // Test with invalid query parameter
      const res = await app.request('/v1/constructs?page=-1', {
        method: 'GET',
      });

      // Should either succeed with default or return 400 - fail on unexpected statuses like 500
      expect([200, 400]).toContain(res.status);

      if (res.status === 400) {
        const body = await res.json();
        expect(body).toHaveProperty('error');
        // Error can be: string, object with code/message, or object with issues array (Zod validation)
        if (typeof body.error === 'object') {
          // Zod validation errors have issues array
          if (body.error.issues !== undefined) {
            expect(Array.isArray(body.error.issues)).toBe(true);
          } else {
            // Standard error object has message
            expect(body.error).toHaveProperty('message');
            expect(typeof body.error.message).toBe('string');
          }
        } else {
          expect(typeof body.error).toBe('string');
        }
      }
    });
  });
});

/**
 * Production Response Snapshots
 *
 * These snapshots document the exact response shapes from production
 * as of the migration date. Update with `vitest -u` only after
 * confirming the new shape is intentional.
 *
 * Fixtures loaded from tests/fixtures/production/*.json
 */
describe('Production Response Snapshots', () => {
  it('documents expected /v1/health response', () => {
    const productionHealthResponse = loadProductionFixture('health');
    expect(productionHealthResponse).toMatchSnapshot();
  });

  it('documents expected /v1/constructs response', () => {
    const productionConstructsResponse = loadProductionFixture('constructs');
    expect(productionConstructsResponse).toMatchSnapshot();
  });

  it('documents expected 404 error response', () => {
    const production404Response = loadProductionFixture('404');
    expect(production404Response).toMatchSnapshot();
  });
});

/**
 * Expanded Contract Snapshots (T2.4)
 *
 * Snapshot tests for all public endpoints:
 * - Categories list/detail
 * - Constructs list/detail (404 shape)
 * - Health live/metrics/ready
 */
describe('Expanded Endpoint Snapshots (T2.4)', () => {
  describe('GET /v1/categories', () => {
    it('snapshot: categories list response shape', async () => {
      const res = await app.request('/v1/categories');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toMatchSnapshot({
        request_id: expect.any(String),
      });
    });
  });

  describe('GET /v1/categories/:slug', () => {
    it('snapshot: category detail response shape', async () => {
      const res = await app.request('/v1/categories/marketing');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toMatchSnapshot({
        request_id: expect.any(String),
      });
    });

    it('snapshot: category 404 response shape', async () => {
      const res = await app.request('/v1/categories/nonexistent');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body).toMatchSnapshot({
        request_id: expect.any(String),
      });
    });
  });

  describe('GET /v1/constructs (empty result)', () => {
    it('snapshot: constructs list empty response shape', async () => {
      const res = await app.request('/v1/constructs');
      expect(res.status).toBe(200);

      const body = await res.json();
      // Use expect.any() for dynamic fields
      expect(body).toMatchSnapshot({
        request_id: expect.any(String),
        pagination: {
          page: expect.any(Number),
          per_page: expect.any(Number),
          total: expect.any(Number),
          total_pages: expect.any(Number),
        },
      });
    });
  });

  describe('GET /v1/constructs/:slug - 404', () => {
    it('snapshot: construct 404 response shape', async () => {
      const res = await app.request('/v1/constructs/nonexistent-construct');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body).toMatchSnapshot({
        request_id: expect.any(String),
      });
    });
  });

  describe('GET /v1/health/live', () => {
    it('snapshot: health live response shape', async () => {
      const res = await app.request('/v1/health/live');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toMatchSnapshot({
        uptime_seconds: expect.any(Number),
        timestamp: expect.any(String),
        startup_time: expect.any(String),
      });
    });
  });

  describe('GET /v1/health/metrics', () => {
    it('snapshot: health metrics response shape', async () => {
      const res = await app.request('/v1/health/metrics');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toMatchSnapshot({
        memory: {
          rss_mb: expect.any(Number),
          heap_used_mb: expect.any(Number),
          heap_total_mb: expect.any(Number),
          external_mb: expect.any(Number),
        },
        process: {
          pid: expect.any(Number),
          node_version: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String),
        },
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime_seconds: expect.any(Number),
      });
    });
  });

  describe('GET /v1/health/ready', () => {
    it('snapshot: health ready response shape', async () => {
      const res = await app.request('/v1/health/ready');
      // May be 200 or 503 depending on DB mock
      expect([200, 503]).toContain(res.status);

      const body = await res.json();
      expect(body).toMatchSnapshot({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        checks: expect.any(Array),
      });
    });
  });
});
