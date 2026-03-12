import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

/**
 * Webhooks Route Tests
 * @see sprint.md T2.3: Core API Test — webhooks.test.ts
 *
 * 6 test cases covering:
 * - Stripe valid/invalid HMAC
 * - Stripe idempotency
 * - GitHub valid/invalid signature
 * - GitHub replay protection
 */

// --- Mock setup (must come before app import) ---

const { mockStripeVerifyDual, mockRedisSet, mockRedisConfiguredRef, mockInsertReturning, mockStripeRetrieve } = vi.hoisted(() => {
  return {
    mockStripeVerifyDual: vi.fn(),
    mockRedisSet: vi.fn(() => Promise.resolve('OK')),
    mockRedisConfiguredRef: { value: false },
    mockInsertReturning: vi.fn(() => [{ id: 'delivery-1' }]),
    mockStripeRetrieve: vi.fn(),
  };
});

vi.mock('../db/index.js', () => {
  // Create a properly chainable insert mock where .returning() is thenable
  function makeInsertChain() {
    const chain: Record<string, unknown> = {};
    chain.values = vi.fn(() => chain);
    chain.onConflictDoNothing = vi.fn(() => chain);
    chain.onConflictDoUpdate = vi.fn(() => chain);
    chain.returning = vi.fn(() => {
      // Return a thenable that resolves with mockInsertReturning
      return {
        then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) => {
          try {
            resolve(mockInsertReturning());
          } catch (err) {
            reject?.(err);
          }
        },
        // Allow further chaining if needed
        onConflictDoNothing: vi.fn(() => chain),
      };
    });
    chain.then = (resolve: (value: unknown) => void) => {
      resolve(mockInsertReturning());
    };
    return chain;
  }

  const selectChain: Record<string, unknown> = {};
  selectChain.from = vi.fn(() => selectChain);
  selectChain.where = vi.fn(() => selectChain);
  selectChain.limit = vi.fn(() => selectChain);
  selectChain.leftJoin = vi.fn(() => selectChain);
  selectChain.orderBy = vi.fn(() => selectChain);
  selectChain.offset = vi.fn(() => selectChain);
  selectChain.then = (resolve: (value: unknown) => void) => resolve([]);

  const updateChain: Record<string, unknown> = {};
  updateChain.set = vi.fn(() => updateChain);
  updateChain.where = vi.fn(() => updateChain);
  updateChain.returning = vi.fn(() => updateChain);
  updateChain.then = (resolve: (value: unknown) => void) => resolve([]);

  const deleteChain: Record<string, unknown> = {};
  deleteChain.where = vi.fn(() => deleteChain);
  deleteChain.then = (resolve: (value: unknown) => void) => resolve([]);

  return {
    db: {
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => makeInsertChain()),
      update: vi.fn(() => updateChain),
      delete: vi.fn(() => deleteChain),
      execute: vi.fn(() => Promise.resolve({ rows: [] })),
      transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
        select: vi.fn(() => selectChain),
        insert: vi.fn(() => makeInsertChain()),
        update: vi.fn(() => updateChain),
        delete: vi.fn(() => deleteChain),
      })),
      query: {
        packs: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
        skills: { findFirst: vi.fn(), findMany: vi.fn(() => Promise.resolve([])) },
      },
    },
    packs: { name: 'packs', id: {}, slug: {}, gitUrl: {}, githubRepoId: {}, submissionSource: {}, status: {} },
    packVersions: { name: 'packVersions', packId: {}, version: {}, isLatest: {} },
    packFiles: { name: 'packFiles', versionId: {} },
    skills: { name: 'skills' }, skillVersions: { name: 'skillVersions' }, skillFiles: { name: 'skillFiles' },
    users: { name: 'users' }, teams: { name: 'teams' }, teamMembers: { name: 'teamMembers' },
    subscriptions: { name: 'subscriptions' }, licenses: { name: 'licenses' },
    apiKeys: { name: 'apiKeys' }, auditLogs: { name: 'auditLogs' },
    teamInvitations: { name: 'teamInvitations' },
    packSubscriptions: { name: 'packSubscriptions' }, packInstallations: { name: 'packInstallations' },
    skillUsage: { name: 'skillUsage' }, graduationRequests: { name: 'graduationRequests' },
    githubWebhookDeliveries: { name: 'githubWebhookDeliveries', id: {}, deliveryId: {} },
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
    eq: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    or: vi.fn(() => ({})),
    sql: vi.fn(() => ({})),
  };
});

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
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
    GITHUB_WEBHOOK_SECRET: 'github-test-secret-123',
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
    if (!mockRedisConfiguredRef.value) throw new Error('REDIS_URL is not configured');
    return {
      set: mockRedisSet,
      get: vi.fn(() => Promise.resolve(null)),
      del: vi.fn(() => Promise.resolve(1)),
      incr: vi.fn(() => Promise.resolve(1)),
      expire: vi.fn(() => Promise.resolve(1)),
      exists: vi.fn(() => Promise.resolve(0)),
      ping: vi.fn(() => Promise.resolve('PONG')),
    };
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

vi.mock('../services/stripe.js', () => ({
  verifyWebhookSignatureDual: mockStripeVerifyDual,
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: vi.fn() },
    subscriptions: {
      retrieve: mockStripeRetrieve,
    },
  })),
  getTierFromPriceId: vi.fn(() => 'pro'),
  isStripeConfigured: vi.fn(() => true),
  STRIPE_PRICE_IDS: {},
}));

vi.mock('../services/subscription.js', () => ({
  getEffectiveTier: vi.fn().mockResolvedValue({ tier: 'free', source: 'personal' }),
  canAccessTier: vi.fn(() => true),
  createSubscription: vi.fn(() => Promise.resolve()),
  updateSubscription: vi.fn(() => Promise.resolve()),
  getSubscriptionByStripeId: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../services/stripe-connect.js', () => ({
  updateConnectOnboardingStatus: vi.fn(),
  isConnectAccountComplete: vi.fn(() => Promise.resolve(false)),
}));

// Import app AFTER all mocks
import { app } from '../app.js';

// --- Helpers ---

const GITHUB_SECRET = 'github-test-secret-123';

function createGitHubSignature(body: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(Buffer.from(body, 'utf8')).digest('hex');
  return `sha256=${sig}`;
}

// --- Tests ---

// Set process.env vars that the webhook handler reads directly
process.env.GITHUB_WEBHOOK_SECRET = GITHUB_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  mockRedisConfiguredRef.value = false;
  mockInsertReturning.mockReturnValue([{ id: 'delivery-1' }]);
});

describe('Webhooks Routes', () => {
  describe('POST /v1/webhooks/stripe', () => {
    it('accepts valid Stripe webhook with correct HMAC', async () => {
      // Use a non-checkout event type to avoid subscription.retrieve complexity
      const fakeEvent = {
        id: 'evt_test_1',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_1',
            status: 'active',
            items: { data: [{ price: { id: 'price_pro_monthly' } }] },
            current_period_start: 1700000000,
            current_period_end: 1702600000,
            cancel_at_period_end: false,
          },
        },
      };

      // verifyWebhookSignatureDual returns the event (valid signature)
      mockStripeVerifyDual.mockReturnValue(fakeEvent);

      const res = await app.request('/v1/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'stripe-signature': 't=1234,v1=abcdef',
        },
        body: JSON.stringify(fakeEvent),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('received', true);
    });

    it('rejects invalid Stripe HMAC (400)', async () => {
      // verifyWebhookSignatureDual returns null (invalid signature)
      mockStripeVerifyDual.mockReturnValue(null);

      const res = await app.request('/v1/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'stripe-signature': 't=1234,v1=invalid',
        },
        body: '{"id":"evt_bad"}',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toContain('Invalid webhook signature');
    });

    it('skips duplicate Stripe delivery (idempotency)', async () => {
      const fakeEvent = {
        id: 'evt_duplicate',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            items: { data: [{ price: { id: 'price_1' } }] },
            current_period_start: 1700000000,
            current_period_end: 1702600000,
            cancel_at_period_end: false,
          },
        },
      };

      mockStripeVerifyDual.mockReturnValue(fakeEvent);

      // Enable Redis for idempotency check
      mockRedisConfiguredRef.value = true;
      // Redis SET returns null (key already exists — duplicate)
      mockRedisSet.mockResolvedValueOnce(null);

      const res = await app.request('/v1/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'stripe-signature': 't=1234,v1=valid',
        },
        body: JSON.stringify(fakeEvent),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('received', true);
      expect(body).toHaveProperty('duplicate', true);
    });
  });

  describe('POST /v1/webhooks/github', () => {
    it('accepts valid GitHub signature (200)', async () => {
      const payload = JSON.stringify({
        repository: { id: 12345, clone_url: 'https://github.com/test/repo.git', default_branch: 'main' },
        ref: 'refs/heads/main',
      });
      const signature = createGitHubSignature(payload, GITHUB_SECRET);

      // Mock: delivery insert succeeds (new delivery)
      mockInsertReturning.mockReturnValue([{ id: 'delivery-new' }]);

      const res = await app.request('/v1/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'delivery-123',
        },
        body: payload,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('received', true);
    });

    it('rejects invalid GitHub signature (401)', async () => {
      const payload = JSON.stringify({
        repository: { id: 12345 },
        ref: 'refs/heads/main',
      });

      const res = await app.request('/v1/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
          'x-github-event': 'push',
          'x-github-delivery': 'delivery-bad',
        },
        body: payload,
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty('error', 'Invalid signature');
    });

    it('rejects duplicate GitHub delivery (replay protection)', async () => {
      const payload = JSON.stringify({
        repository: { id: 12345, clone_url: 'https://github.com/test/repo.git', default_branch: 'main' },
        ref: 'refs/heads/main',
      });
      const signature = createGitHubSignature(payload, GITHUB_SECRET);

      // Mock: delivery insert returns empty (conflict — already processed)
      mockInsertReturning.mockReturnValue([]);

      const res = await app.request('/v1/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'delivery-replay',
        },
        body: payload,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('received', true);
      expect(body).toHaveProperty('action', 'ignored');
      expect(body).toHaveProperty('reason', 'Replay');
    });
  });
});
