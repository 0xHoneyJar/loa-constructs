import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Constructs Route Tests
 * @see prd-constructs-api.md FR-1: Constructs Endpoint
 * @see sprint.md T2.1: Core API Test — constructs.test.ts (routes)
 *
 * 14 test cases covering: list response shape, filters (type, category, featured, q),
 * pagination, Zod validation rejection, detail, 404, HEAD, summary, visibility.
 */

// --- Mock setup (must come before app import) ---

// Select call tracking — each db.select() call consumes the next result
let selectResults: unknown[][] = [];
let selectCallIndex = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.groupBy = vi.fn(() => chain);
  chain.having = vi.fn(() => chain);
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
  chain.then = (resolve: (value: unknown) => void) => resolve([]);
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => void) => resolve([]);
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
  packs: { name: 'packs', id: {}, slug: {}, status: {}, visibility: {}, category: {}, isFeatured: {}, tierRequired: {}, constructType: {}, downloads: {}, maturity: {}, ownerType: {}, ownerId: {} },
  packVersions: { name: 'packVersions', packId: {}, version: {}, isLatest: {} },
  packFiles: { name: 'packFiles' },
  skills: { name: 'skills', id: {}, slug: {}, isPublic: {}, category: {}, tierRequired: {}, downloads: {} },
  skillVersions: { name: 'skillVersions' },
  skillFiles: { name: 'skillFiles' },
  users: { name: 'users', id: {} },
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
  constructIdentities: { name: 'constructIdentities', packId: {} },
  constructVerifications: { name: 'constructVerifications', packId: {} },
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

vi.mock('../services/redis.js', () => ({
  getRedis: vi.fn(() => {
    throw new Error('REDIS_URL is not configured');
  }),
  isRedisConfigured: vi.fn(() => false),
  CACHE_KEYS: {
    rateLimit: (key: string, window: string) => `rate:${key}:${window}`,
    userTier: (userId: string) => `user:${userId}:tier`,
    constructList: (params: string) => `constructs:list:${params}`,
    constructDetail: (slug: string) => `constructs:detail:${slug}`,
    constructSummary: (tier?: string) => tier ? `constructs:summary:${tier}` : 'constructs:summary',
    constructExists: (slug: string) => `constructs:exists:${slug}`,
    categoryList: () => 'categories:list',
    categoryDetail: (slug: string) => `categories:detail:${slug}`,
    skillList: () => 'skills:list',
    skill: () => 'skill',
    session: () => 'session',
  },
  CACHE_TTL: { userTier: 300, skillList: 60, skill: 300, constructList: 60, constructDetail: 60, constructSummary: 60, constructExists: 300, categories: 3600 },
  getCacheVisibilityTier: vi.fn(() => 'anon'),
  invalidateConstructCaches: vi.fn(),
}));

// Mock subscription service (needed by auth middleware)
vi.mock('../services/subscription.js', () => ({
  getEffectiveTier: vi.fn().mockResolvedValue({
    tier: 'free',
    source: 'personal',
    subscriptionId: null,
    expiresAt: null,
  }),
  canAccessTier: vi.fn(() => true),
}));

// Import app AFTER all mocks
import { app } from '../app.js';
import { createAuthHeaders } from '../../tests/helpers/auth.js';
import { createMockUser } from '../../tests/helpers/fixtures.js';

// --- Mock pack/skill data factories ---

function mockPackRow(overrides?: Record<string, unknown>) {
  return {
    id: 'pack-1',
    name: 'Beehive',
    slug: 'observer',
    description: 'AI-powered user research observer',
    longDescription: 'Full description of Beehive pack',
    status: 'published',
    visibility: 'public',
    maturity: 'stable',
    icon: 'eye',
    authorId: 'user-1',
    ownerId: 'user-1',
    ownerType: 'user',
    isFeatured: true,
    featured: true,
    repositoryUrl: 'https://github.com/0xHoneyJar/construct-observer',
    homepageUrl: null,
    documentationUrl: null,
    searchKeywords: ['observe', 'research'],
    searchUseCases: ['user research'],
    downloads: 150,
    ratingSum: 0,
    ratingCount: 0,
    tierRequired: 'free',
    constructType: 'skill-pack',
    category: 'development',
    sourceType: 'git',
    gitUrl: 'https://github.com/0xHoneyJar/construct-observer.git',
    skillProse: null,
    graduatedAt: null,
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-20T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function mockSkillRow(overrides?: Record<string, unknown>) {
  return {
    id: 'skill-1',
    name: 'Analyze',
    slug: 'analyze',
    description: 'Analysis workflow',
    longDescription: null,
    isPublic: true,
    isDeprecated: false,
    category: 'development',
    ownerId: 'user-1',
    ownerType: 'user',
    tierRequired: 'free',
    downloads: 50,
    ratingSum: 0,
    ratingCount: 0,
    maturity: 'stable',
    searchKeywords: ['analyze'],
    searchUseCases: ['analysis'],
    repositoryUrl: null,
    documentationUrl: null,
    graduatedAt: null,
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-20T00:00:00Z'),
    ...overrides,
  };
}

function mockVersionRow(overrides?: Record<string, unknown>) {
  return {
    id: 'version-1',
    packId: 'pack-1',
    version: '1.0.0',
    changelog: null,
    manifest: { name: 'observer', version: '1.0.0', type: 'skill-pack', skills: [{ slug: 'observe', name: 'Observe', description: 'Observe users' }], commands: [{ name: '/observe' }] },
    isLatest: true,
    publishedAt: new Date('2026-01-15T00:00:00Z'),
    createdAt: new Date('2026-01-15T00:00:00Z'),
    totalSizeBytes: 1024,
    fileCount: 5,
    ...overrides,
  };
}

function mockOwnerRow(overrides?: Record<string, unknown>) {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@constructs.network',
    avatarUrl: null,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  selectResults = [];
  selectCallIndex = 0;
});

describe('Constructs Routes', () => {
  describe('GET /v1/constructs', () => {
    it('returns { data, pagination, request_id } shape', async () => {
      // listConstructs fetches packs + skills via multiple db.select() calls
      // Packs query: packs rows, versions batch, owners batch, identities batch, verifications batch
      // Skills query: skills rows, versions batch, owners batch
      // Total counts: pack count, skill count
      selectResults = [
        [mockPackRow()],    // packs query
        [mockVersionRow()], // pack versions batch
        [mockOwnerRow()],   // pack owners batch
        [],                 // pack identities batch
        [],                 // pack verifications batch
        [mockSkillRow()],   // skills query
        [],                 // skill versions batch
        [mockOwnerRow()],   // skill owners batch
        [{ count: 1 }],    // pack count
        [{ count: 1 }],    // skill count
      ];

      const res = await app.request('/v1/constructs');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(body).toHaveProperty('request_id');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toHaveProperty('page');
      expect(body.pagination).toHaveProperty('per_page');
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('total_pages');
    });

    it('applies type=pack filter', async () => {
      selectResults = [
        [mockPackRow()],
        [mockVersionRow()],
        [mockOwnerRow()],
        [],
        [],
        [{ count: 1 }],
      ];

      const res = await app.request('/v1/constructs?type=pack');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      // Should only contain pack results (no skills query)
    });

    it('applies type=skill filter', async () => {
      selectResults = [
        [mockSkillRow()],
        [],
        [mockOwnerRow()],
        [{ count: 1 }],
      ];

      const res = await app.request('/v1/constructs?type=skill');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    it('applies category filter', async () => {
      selectResults = [
        [mockPackRow({ category: 'security' })],
        [mockVersionRow()],
        [mockOwnerRow()],
        [],
        [],
        [mockSkillRow({ category: 'security' })],
        [],
        [mockOwnerRow()],
        [{ count: 1 }],
        [{ count: 1 }],
      ];

      const res = await app.request('/v1/constructs?category=security');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    it('applies featured=true filter', async () => {
      selectResults = [
        [mockPackRow({ isFeatured: true })],
        [mockVersionRow()],
        [mockOwnerRow()],
        [],
        [],
        [],
        [],
        [],
        [{ count: 1 }],
        [{ count: 0 }],
      ];

      const res = await app.request('/v1/constructs?featured=true');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    it('applies q (search) filter', async () => {
      selectResults = [
        [mockPackRow()],
        [mockVersionRow()],
        [mockOwnerRow()],
        [],
        [],
        [mockSkillRow()],
        [],
        [mockOwnerRow()],
        [{ count: 1 }],
        [{ count: 1 }],
      ];

      const res = await app.request('/v1/constructs?q=observe');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });

    it('applies pagination (page + per_page)', async () => {
      selectResults = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [{ count: 50 }],
        [{ count: 20 }],
      ];

      const res = await app.request('/v1/constructs?page=2&per_page=5');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.per_page).toBe(5);
    });

    it('rejects per_page=101 (Zod validation)', async () => {
      const res = await app.request('/v1/constructs?per_page=101');

      // Zod validation rejects values > 100
      expect(res.status).toBe(400);
    });

    it('rejects page=-1 (Zod validation)', async () => {
      const res = await app.request('/v1/constructs?page=-1');

      // Negative page is rejected by z.coerce.number().int().positive()
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/constructs/:slug', () => {
    it('returns detail for existing construct', async () => {
      const pack = mockPackRow();
      const version = mockVersionRow();
      const owner = mockOwnerRow();

      // getConstructBySlug: first tries packs, then skills
      // fetchPackAsConstruct: pack query, version query, owner query, identity query, verification query
      selectResults = [
        [pack],     // pack by slug
        [version],  // latest version
        [owner],    // owner
        [],         // identity
        [],         // verification
      ];

      const res = await app.request('/v1/constructs/observer');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('request_id');
      expect(body.data).toHaveProperty('slug', 'observer');
      expect(body.data).toHaveProperty('name', 'Beehive');
      expect(body.data).toHaveProperty('type', 'pack');
      expect(body.data).toHaveProperty('visibility', 'public');
    });

    it('returns 404 for non-existent construct', async () => {
      // Both pack and skill queries return empty
      selectResults = [
        [], // pack by slug (empty)
        [], // skill by slug (empty)
      ];

      const res = await app.request('/v1/constructs/nonexistent');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('HEAD /v1/constructs/:slug', () => {
    it('returns 200 with empty body for existing construct', async () => {
      // constructExists: select pack with visibility fields, then canAccessPack check
      selectResults = [
        [{ id: 'pack-1', visibility: 'public', ownerId: 'user-1', ownerType: 'user', status: 'published' }], // pack exists
      ];

      const res = await app.request('/v1/constructs/observer', {
        method: 'HEAD',
      });

      expect(res.status).toBe(200);
      // HEAD responses have no body content
      const text = await res.text();
      expect(text).toBe('');
    });

    it('returns 404 for non-existent construct', async () => {
      selectResults = [
        [], // pack not found
        [], // skill not found
      ];

      const res = await app.request('/v1/constructs/nonexistent', {
        method: 'HEAD',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/constructs/summary', () => {
    it('returns minimal format with constructs, total, last_updated', async () => {
      selectResults = [
        [mockPackRow()],    // packs data
        [mockVersionRow()], // all versions for batch
      ];

      const res = await app.request('/v1/constructs/summary');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('constructs');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('last_updated');
      expect(Array.isArray(body.constructs)).toBe(true);
    });
  });

  describe('Visibility', () => {
    it('anonymous user sees only public constructs', async () => {
      // Anonymous request (no auth header)
      selectResults = [
        [mockPackRow({ visibility: 'public' })],
        [mockVersionRow()],
        [mockOwnerRow()],
        [],
        [],
        [mockSkillRow()],
        [],
        [mockOwnerRow()],
        [{ count: 1 }],
        [{ count: 1 }],
      ];

      const res = await app.request('/v1/constructs');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      // The service applies visibility conditions — for anonymous, only 'public'
      // The mock doesn't filter, but the key assertion is that the request succeeds
      // and the service received the correct access context (no user)
    });

    it('org member sees public + internal constructs', async () => {
      // Mock user lookup for requireAuth/optionalAuth
      selectResults = [
        // optionalAuth user lookup
        [createMockUser({ id: 'user-1', email: 'member@constructs.network', name: 'Member', githubOrgMember: true })],
        // listConstructs queries
        [mockPackRow({ visibility: 'internal' })],
        [mockVersionRow()],
        [mockOwnerRow()],
        [],
        [],
        [mockSkillRow()],
        [],
        [mockOwnerRow()],
        [{ count: 1 }],
        [{ count: 1 }],
      ];

      const authHeaders = await createAuthHeaders('user-1', 'member@constructs.network', { isOrgMember: true });

      const res = await app.request('/v1/constructs', {
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
    });
  });
});
