import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';

/**
 * Response Schema Validation Tests (T2.5)
 *
 * Defines Zod schemas for all API response shapes and validates
 * that live test responses conform to them. Any response field
 * change will cause a Zod validation failure.
 *
 * @see sprint.md T2.5: Contract Test — response-schemas.test.ts
 */

// --- Mock setup (must come before app import) ---

const { mockExecute, mockPing, mockRedisConfiguredRef } = vi.hoisted(() => ({
  mockExecute: vi.fn(() => Promise.resolve({ rows: [] })),
  mockPing: vi.fn(() => Promise.resolve('PONG')),
  mockRedisConfiguredRef: { value: false },
}));

vi.mock('../../src/db/index.js', () => {
  const selectChain: Record<string, unknown> = {};
  selectChain.from = vi.fn(() => selectChain);
  selectChain.leftJoin = vi.fn(() => selectChain);
  selectChain.innerJoin = vi.fn(() => selectChain);
  selectChain.where = vi.fn(() => selectChain);
  selectChain.orderBy = vi.fn(() => selectChain);
  selectChain.groupBy = vi.fn(() => selectChain);
  selectChain.having = vi.fn(() => selectChain);
  selectChain.limit = vi.fn(() => selectChain);
  selectChain.offset = vi.fn(() => selectChain);
  selectChain.then = (resolve: (value: unknown) => void) => resolve([]);

  return {
    db: {
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => ({ then: (r: (v: unknown) => void) => r([]) })) })) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ then: (r: (v: unknown) => void) => r([]) })) })) })),
      execute: mockExecute,
      query: {
        packs: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
        skills: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
      },
    },
    packs: { name: 'packs' }, packVersions: { name: 'packVersions' }, packFiles: { name: 'packFiles' },
    skills: { name: 'skills' }, skillVersions: { name: 'skillVersions' }, skillFiles: { name: 'skillFiles' },
    users: { name: 'users' }, teams: { name: 'teams' }, teamMembers: { name: 'teamMembers' },
    subscriptions: { name: 'subscriptions' }, licenses: { name: 'licenses' },
    apiKeys: { name: 'apiKeys' }, auditLogs: { name: 'auditLogs' },
    teamInvitations: { name: 'teamInvitations' },
    packSubscriptions: { name: 'packSubscriptions' }, packInstallations: { name: 'packInstallations' },
    skillUsage: { name: 'skillUsage' }, graduationRequests: { name: 'graduationRequests' },
    constructIdentities: { name: 'constructIdentities', packId: {} },
    constructVerifications: { name: 'constructVerifications' },
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

vi.mock('../../src/config/env.js', () => ({
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

vi.mock('../../src/lib/monitoring.js', () => ({
  captureException: vi.fn(() => 'mock-event-id'),
  addBreadcrumb: vi.fn(),
  getAppVersion: vi.fn(() => '0.1.0-test'),
  initMonitoring: vi.fn(),
}));

vi.mock('../../src/services/redis.js', () => ({
  getRedis: vi.fn(() => {
    if (!mockRedisConfiguredRef.value) throw new Error('REDIS_URL is not configured');
    return { ping: mockPing };
  }),
  isRedisConfigured: vi.fn(() => mockRedisConfiguredRef.value),
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

vi.mock('../../src/services/category.js', () => ({
  normalizeCategory: (slug: string) => slug.toLowerCase(),
  listCategories: vi.fn().mockResolvedValue([
    { id: '1', slug: 'development', label: 'Development', color: '#44FF88', description: 'Coding', sortOrder: 1, constructCount: 5 },
  ]),
  getCategoryBySlug: vi.fn().mockImplementation(async (slug: string) => {
    if (slug === 'development') {
      return { id: '1', slug: 'development', label: 'Development', color: '#44FF88', description: 'Coding', sortOrder: 1, constructCount: 5 };
    }
    return null;
  }),
}));

// Import app AFTER all mocks
import { app } from '../../src/app.js';

// --- Zod Response Schemas ---

/**
 * Health endpoint response (GET /v1/health)
 */
const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'warn', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
  uptime: z.number().nonnegative(),
  environment: z.string(),
  build: z.string(),
});

/**
 * Health ready endpoint (GET /v1/health/ready)
 */
const HealthReadyResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  checks: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['pass', 'fail', 'warn']),
      message: z.string().optional(),
      latency_ms: z.number().optional(),
    })
  ),
});

/**
 * Health live endpoint (GET /v1/health/live)
 */
const HealthLiveResponseSchema = z.object({
  status: z.literal('alive'),
  uptime_seconds: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

/**
 * Health metrics endpoint (GET /v1/health/metrics)
 */
const HealthMetricsResponseSchema = z.object({
  memory: z.object({
    rss_mb: z.number(),
    heap_used_mb: z.number(),
    heap_total_mb: z.number(),
    external_mb: z.number(),
  }),
  process: z.object({
    pid: z.number().int().positive(),
    node_version: z.string(),
    platform: z.string(),
    arch: z.string(),
  }),
  timestamp: z.string().datetime(),
  version: z.string(),
  uptime_seconds: z.number().nonnegative(),
});

/**
 * Error response (all error endpoints)
 */
const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
  request_id: z.string().optional(),
});

/**
 * Paginated list response (GET /v1/constructs, etc.)
 */
const PaginationSchema = z.object({
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});

const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: PaginationSchema,
  request_id: z.string(),
});

/**
 * Category response shape (GET /v1/categories)
 */
const CategoryItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  description: z.string().nullable(),
  construct_count: z.number().int().nonnegative(),
});

const CategoryListResponseSchema = z.object({
  data: z.array(CategoryItemSchema),
  request_id: z.string(),
});

const CategoryDetailResponseSchema = z.object({
  data: CategoryItemSchema,
  request_id: z.string(),
});

// --- Tests ---

afterEach(() => {
  vi.clearAllMocks();
  mockRedisConfiguredRef.value = false;
});

describe('Response Schema Validation (T2.5)', () => {
  describe('HealthResponseSchema', () => {
    it('validates GET /v1/health response', async () => {
      const res = await app.request('/v1/health');
      expect(res.status).toBe(200);

      const body = await res.json();
      const result = HealthResponseSchema.safeParse(body);
      if (!result.success) {
        // Log the actual issues for debugging
        console.error('Health response validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('validates GET /v1/health/ready response', async () => {
      const res = await app.request('/v1/health/ready');
      // Ready can be 200 or 503
      expect([200, 503]).toContain(res.status);

      const body = await res.json();
      const result = HealthReadyResponseSchema.safeParse(body);
      if (!result.success) {
        console.error('Health ready validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('validates GET /v1/health/live response', async () => {
      const res = await app.request('/v1/health/live');
      expect(res.status).toBe(200);

      const body = await res.json();
      const result = HealthLiveResponseSchema.safeParse(body);
      if (!result.success) {
        console.error('Health live validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('validates GET /v1/health/metrics response', async () => {
      const res = await app.request('/v1/health/metrics');
      expect(res.status).toBe(200);

      const body = await res.json();
      const result = HealthMetricsResponseSchema.safeParse(body);
      if (!result.success) {
        console.error('Health metrics validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });
  });

  describe('ErrorResponseSchema', () => {
    it('validates 404 error response', async () => {
      const res = await app.request('/v1/packs/nonexistent-slug');
      expect(res.status).toBe(404);

      const body = await res.json();
      const result = ErrorResponseSchema.safeParse(body);
      if (!result.success) {
        console.error('Error response validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('validates route-not-found error response', async () => {
      const res = await app.request('/v1/totally-unknown');
      expect(res.status).toBe(404);

      const body = await res.json();
      const result = ErrorResponseSchema.safeParse(body);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error.code).toBe('NOT_FOUND');
      }
    });

    it('validates Zod validation error response', async () => {
      const res = await app.request('/v1/constructs?per_page=101');
      expect(res.status).toBe(400);

      const body = await res.json();
      // Zod validation returns either structured error or issues array
      expect(body).toHaveProperty('error');
    });
  });

  describe('PaginatedResponseSchema', () => {
    it('validates GET /v1/constructs list response', async () => {
      const res = await app.request('/v1/constructs');
      expect(res.status).toBe(200);

      const body = await res.json();
      const result = PaginatedResponseSchema.safeParse(body);
      if (!result.success) {
        console.error('Paginated response validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('validates pagination invariants', async () => {
      const res = await app.request('/v1/constructs?page=1&per_page=10');
      expect(res.status).toBe(200);

      const body = await res.json();
      const result = PaginatedResponseSchema.safeParse(body);
      expect(result.success).toBe(true);

      if (result.success) {
        const { pagination } = result.data;
        // total_pages should be ceil(total / per_page)
        const expectedTotalPages = Math.ceil(pagination.total / pagination.per_page);
        expect(pagination.total_pages).toBe(expectedTotalPages);
        // data length should not exceed per_page
        expect(result.data.data.length).toBeLessThanOrEqual(pagination.per_page);
      }
    });
  });

  describe('CategoryResponseSchema', () => {
    it('validates GET /v1/categories list response', async () => {
      const res = await app.request('/v1/categories');
      expect(res.status).toBe(200);

      const body = await res.json();
      const result = CategoryListResponseSchema.safeParse(body);
      if (!result.success) {
        console.error('Category list validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('validates GET /v1/categories/:slug detail response', async () => {
      const res = await app.request('/v1/categories/development');
      expect(res.status).toBe(200);

      const body = await res.json();
      const result = CategoryDetailResponseSchema.safeParse(body);
      if (!result.success) {
        console.error('Category detail validation failed:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('rejects response with missing required field', () => {
      // Simulate a response with missing 'color' field
      const badCategory = {
        id: '1',
        slug: 'marketing',
        label: 'Marketing',
        // color: missing
        description: 'GTM',
        construct_count: 5,
      };

      const result = CategoryItemSchema.safeParse(badCategory);
      expect(result.success).toBe(false);
    });

    it('rejects response with wrong field type', () => {
      // Simulate a response where construct_count is a string
      const badCategory = {
        id: '1',
        slug: 'marketing',
        label: 'Marketing',
        color: '#FF44FF',
        description: 'GTM',
        construct_count: 'five', // wrong type
      };

      const result = CategoryItemSchema.safeParse(badCategory);
      expect(result.success).toBe(false);
    });
  });
});
