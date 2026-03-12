# SDD: API Stability — Test Infrastructure & Regression Prevention

**Cycle**: cycle-042
**Created**: 2026-03-11
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Context**: `grimoires/loa/context/api-test-stability-baseline.md`

---

## 1. Executive Summary

This SDD defines the test infrastructure architecture for the constructs.network API. The design is grounded in the existing codebase patterns — specifically the `app.request()` contract test pattern in `tests/contract/api-snapshots.test.ts`, the Drizzle mock chain pattern at that file's lines 59–133, and the Vitest v2.1 + v8 coverage setup already in `vitest.config.ts`.

The architecture introduces four components:
1. **Shared test helpers** — reusable factories that reduce per-test boilerplate to <10 lines
2. **Stability tests** — tests targeting the 11 fragile areas that cause actual downtime
3. **Core API route tests** — `app.request()` tests for public endpoints
4. **Contract/snapshot tests** — response shape regression guards

No new dependencies. Everything uses Vitest, Hono's `app.request()`, and `jose` (already installed).

---

## 2. System Architecture

### 2.1 Test File Organization

```
apps/api/
├── vitest.config.ts          # MODIFY: add testTimeout, pool, coverage thresholds
├── vitest.setup.ts            # MODIFY: add UPSTASH env guards
├── src/
│   ├── middleware/
│   │   ├── auth.test.ts       # NEW: requireAuth, optionalAuth, requireTier, requireOrgMember
│   │   ├── error-handler.test.ts  # NEW: AppError vs unknown error shapes
│   │   └── rate-limiter.test.ts   # NEW: fail-open/fail-closed, 429, headers
│   ├── services/
│   │   ├── blacklist.test.ts  # NEW: fail-secure, graceful degradation
│   │   ├── auth.test.ts       # KEEP: real bcrypt + JWT crypto
│   │   ├── category.test.ts   # KEEP: real normalizeCategory()
│   │   ├── license.test.ts    # KEEP: real RSA
│   │   ├── namespace-validation.test.ts  # KEEP
│   │   ├── public-keys.test.ts           # KEEP
│   │   ├── storage.test.ts              # KEEP
│   │   ├── subscription.test.ts         # KEEP
│   │   ├── constructs.test.ts  # DELETE: tests local variables
│   │   ├── skills.test.ts      # DELETE: tests local constants
│   │   └── submissions.test.ts # DELETE: tests local objects
│   ├── routes/
│   │   ├── health.test.ts     # ENHANCE: readiness probe, metrics shape
│   │   ├── auth.test.ts       # NEW: login, refresh, logout, me, validate flows
│   │   ├── constructs.test.ts # NEW: list, filters, pagination, detail, HEAD, summary
│   │   ├── categories.test.ts # KEEP + ENHANCE: response shape contract
│   │   ├── public-keys.test.ts # KEEP
│   │   └── webhooks.test.ts   # NEW: Stripe HMAC, GitHub HMAC, idempotency
│   └── lib/
│       └── manifest-validator.test.ts  # KEEP
├── tests/
│   ├── helpers/
│   │   ├── mock-db.ts         # NEW: Drizzle mock chain factory
│   │   ├── mock-redis.ts      # NEW: Redis mock with failMode
│   │   ├── fixtures.ts        # NEW: DB row factories
│   │   ├── auth.ts            # NEW: JWT generator for test auth headers
│   │   └── index.ts           # NEW: barrel export
│   ├── contract/
│   │   ├── api-snapshots.test.ts      # ENHANCE: all public endpoints
│   │   └── response-schemas.test.ts   # NEW: Zod schema validation
│   ├── e2e/
│   │   ├── constructs.test.ts  # DELETE: inline JSON, no HTTP
│   │   ├── pack-flow.test.ts   # DELETE: mock object assertions
│   │   └── creator.test.ts     # DELETE: mock object assertions
│   └── fixtures/
│       └── production/         # KEEP: existing production fixture JSONs
└── package.json
```

### 2.2 Mock Initialization Order

Every test file that imports `app` must follow this mock order established in `api-snapshots.test.ts`. Vitest hoists `vi.mock()` calls, but declaration order matters for dependencies between mocked modules.

```
1. vi.mock('../../src/db/index.js')        — Drizzle mock chain
2. vi.mock('../../src/config/env.js')       — env vars
3. vi.mock('../../src/lib/logger.js')       — silent logger
4. vi.mock('../../src/lib/monitoring.js')   — stub Sentry
5. vi.mock('../../src/services/redis.js')   — Redis mock
6. import { app } from '../../src/app.js'   — AFTER all mocks
```

The shared helpers centralize steps 1–5 so individual test files only call setup functions.

---

## 3. Component Design

### 3.1 `tests/helpers/mock-db.ts`

Factory for creating the Drizzle mock chain. Follows the exact pattern from `api-snapshots.test.ts:59–133` but makes return values configurable.

```typescript
// Interface
export function createMockDb(overrides?: {
  selectResult?: unknown[];
  queryOverrides?: Record<string, unknown>;
}): MockDb;

export function getMockDbModule(): object;  // Full vi.mock return value
```

**Design decisions:**

- **Chained methods return `this`**: `select().from().where().orderBy().limit().offset()` — every intermediate method returns the chain, only terminal methods (`Promise.resolve()`) return data.
- **`mockResolvedValueOnce` at terminals**: Tests configure return data by calling `.mockResolvedValueOnce()` on the terminal mock (typically `offset`, `limit`, or `returning`).
- **Schema table stubs**: All 14 table exports (`packs`, `users`, `skills`, etc.) exported as `{ name: 'tableName' }` stubs plus all enum and relation exports — matching `api-snapshots.test.ts:89–132`.
- **`db.execute`**: Mocked separately for raw SQL (used by health readiness check: `db.execute(sql\`SELECT 1\`)`).

### 3.2 `tests/helpers/mock-redis.ts`

```typescript
export function createMockRedis(opts?: { failMode?: boolean }): MockRedis;
export function getMockRedisModule(opts?: { configured?: boolean; failMode?: boolean }): object;
```

**Design decisions:**

- **`failMode: true`**: Every operation (`get`, `set`, `del`, `incr`, `expire`, `exists`, `setex`, `ping`, `keys`) rejects with `new Error('Redis connection error')`. This tests the fail-secure paths in blacklist (`blacklist.ts:69-74`) and fail-closed paths in rate limiter (`rate-limiter.ts:202-214`).
- **`configured: false`**: `isRedisConfigured()` returns `false`, `getRedis()` throws. Tests the bypass paths where Redis is not available (`blacklist.ts:58-62`, `rate-limiter.ts:134-137`, `health.ts:165-171`).
- **Re-exports**: `CACHE_KEYS` and `CACHE_TTL` from `src/services/redis.ts` are re-exported for test assertions (not mocked — they're just constants).

### 3.3 `tests/helpers/fixtures.ts`

Realistic DB row factories matching Drizzle schema column names (camelCase).

```typescript
export function createMockUser(overrides?: Partial<UserRow>): UserRow;
export function createMockPack(overrides?: Partial<PackRow>): PackRow;
export function createMockSkill(overrides?: Partial<SkillRow>): SkillRow;
export function createMockVersion(overrides?: Partial<VersionRow>): VersionRow;
export function createMockSubscription(overrides?: Partial<SubscriptionRow>): SubscriptionRow;
export function createMockApiKey(overrides?: Partial<ApiKeyRow>): ApiKeyRow;
```

**Default values:**

| Factory | Key Defaults |
|---------|-------------|
| `createMockUser` | `id: 'user-test-1'`, `email: 'test@constructs.network'`, `emailVerified: true`, `isAdmin: false`, `githubOrgMember: false`, `walletAddress: null` |
| `createMockPack` | `id: 'pack-test-1'`, `slug: 'test-pack'`, `status: 'published'`, `visibility: 'public'`, `maturity: 'stable'` |
| `createMockSubscription` | `tier: 'free'`, `status: 'active'` |
| `createMockApiKey` | `keyPrefix: 'sk_test_1234'`, `revoked: false`, `expiresAt: null` |

### 3.4 `tests/helpers/auth.ts`

```typescript
export async function createAuthHeaders(
  userId?: string,
  email?: string,
  opts?: { expiresIn?: string; jti?: string; isOrgMember?: boolean }
): Promise<{ Authorization: string }>;

export async function createExpiredAuthHeaders(userId?: string): Promise<{ Authorization: string }>;
```

**Design decisions:**

- **Real JWT signing**: Uses `jose` library (already installed) with `HS256` and the test `JWT_SECRET` from `vitest.setup.ts`. This means auth middleware tests exercise the real `verifyAccessToken()` code path — no middleware mocking needed.
- **`jti` parameter**: Allows tests to set a known JTI for blacklist testing (e.g., `POST /v1/auth/logout` should blacklist the exact JTI).
- **`createExpiredAuthHeaders`**: Generates a JWT with `exp` in the past for testing 401 on expired tokens.

### 3.5 `tests/helpers/index.ts`

Barrel export:

```typescript
export { createMockDb, getMockDbModule } from './mock-db.js';
export { createMockRedis, getMockRedisModule } from './mock-redis.js';
export { createMockUser, createMockPack, createMockSkill, ... } from './fixtures.js';
export { createAuthHeaders, createExpiredAuthHeaders } from './auth.js';
```

---

## 4. Stability Tests (Tier 1) — Detailed Design

### 4.1 `src/services/blacklist.test.ts`

Tests `blacklistService` from `src/services/blacklist.ts`.

| Test Case | Target Code | What It Verifies |
|-----------|-------------|-----------------|
| `add()` skips when Redis not configured | `blacklist.ts:29-32` | No throw, logs warning |
| `add()` skips expired tokens (TTL <= 0) | `blacklist.ts:39-42` | Early return, no Redis call |
| `add()` sets key with correct TTL | `blacklist.ts:44` | `redis.setex(key, ttl, '1')` called |
| `add()` degrades gracefully on Redis error | `blacklist.ts:46-49` | No throw, logs error |
| `isBlacklisted()` returns false when Redis not configured | `blacklist.ts:58-62` | Returns `false` (pass-through) |
| `isBlacklisted()` returns false when token not found | `blacklist.ts:67-68` | `redis.exists()` returns 0 |
| `isBlacklisted()` returns true when token found | `blacklist.ts:67-68` | `redis.exists()` returns 1 |
| `isBlacklisted()` returns true on Redis error (fail-secure) | `blacklist.ts:69-74` | **Critical**: Redis outage blocks token use |

**Mock strategy**: Mock `src/services/redis.js` with `getMockRedisModule()`. Each test configures `configured` and `failMode` independently.

### 4.2 `src/middleware/rate-limiter.test.ts`

Tests the rate limiter middleware from `src/middleware/rate-limiter.ts`.

| Test Case | Target Code | What It Verifies |
|-----------|-------------|-----------------|
| Passes through when Redis not configured | `rate-limiter.ts:134-137` | Request proceeds, no rate limit headers |
| Sets `X-RateLimit-*` headers on response | `rate-limiter.ts:167-169` | `Limit`, `Remaining`, `Reset` headers present |
| Returns 429 with `Retry-After` when limit exceeded | `rate-limiter.ts:172-188` | Status 429, correct error shape |
| Auth endpoints fail closed (503) on Redis error | `rate-limiter.ts:202-214` | **Critical**: Auth rate limit failures block requests |
| Non-auth endpoints fail open with `X-RateLimit-Degraded: true` | `rate-limiter.ts:216-218` | Request proceeds with degraded header |
| `skip` function bypasses limiting | `rate-limiter.ts:129-131` | Skipped IPs/paths not rate limited |

**Mock strategy**: Create a minimal Hono app with the rate limiter middleware applied, then use `app.request()`. Mock Redis to control rate limit counters.

### 4.3 `src/middleware/auth.test.ts`

Tests auth middleware functions from `src/middleware/auth.ts`.

| Test Case | Target Code | What It Verifies |
|-----------|-------------|-----------------|
| `requireAuth()` — 401 with no Authorization header | `auth.ts:151-153` | `Errors.Unauthorized` thrown |
| `requireAuth()` — 401 with invalid JWT | `auth.ts:164-172` | `Errors.InvalidToken` thrown |
| `requireAuth()` — 401 with expired JWT | `auth.ts:164-172` | `Errors.InvalidToken` thrown |
| `requireAuth()` — sets context vars with valid JWT + user | `auth.ts:179-184` | `user`, `userId`, `authMethod`, `isOrgMember` set |
| `requireAuth()` — 401 when JWT valid but user deleted | `auth.ts:175-177` | `getUserById` returns null |
| `requireAuth()` — API key path (`sk_*` prefix) | `auth.ts:159-161` | `validateApiKeyAuth` called, bcrypt verified |
| `optionalAuth()` — passes with no header, no error | `auth.ts:194-196` | `next()` called, no user set |
| `optionalAuth()` — attaches user with valid JWT | `auth.ts:217-222` | User set silently, request continues |
| `requireTier('pro')` — 402 for free user | `auth.ts:262-263` | `Errors.TierUpgradeRequired` thrown |
| `requireTier('pro')` — passes for pro user | `auth.ts:262-263` | `next()` called |
| `requireOrgMember()` — 403 for non-member | `auth.ts:283-284` | `Errors.Forbidden` thrown |
| `requireVerifiedEmail()` — 403 for unverified | `auth.ts:241-242` | `Errors.Forbidden` thrown |

**Mock strategy**: Create minimal Hono apps with each middleware applied. Mock `db` to control `getUserById` results. Use `createAuthHeaders()` for real JWT tokens that exercise `verifyAccessToken()`.

### 4.4 `src/middleware/error-handler.test.ts`

Tests the error handler middleware from `src/middleware/error-handler.ts`.

| Test Case | Target Code | What It Verifies |
|-----------|-------------|-----------------|
| `AppError` returns structured `{ error: { code, message, details }, request_id }` | `error-handler.ts:23-43` | Correct shape, correct status code |
| Unknown `Error` returns 500 without leaking internals | `error-handler.ts:46-89` | Message is generic, no stack trace |
| Duck-typing check works for `AppError` instances | `error-handler.ts:20-21` | Both `instanceof` and duck-type paths work |
| `request_id` is included from context | `error-handler.ts:16` | UUID format, matches `requestId` middleware |

**Mock strategy**: Create a Hono app with `errorHandler()` middleware and routes that throw different error types. Mock `logger` and `monitoring` to silence output.

### 4.5 `src/routes/health.test.ts` (Enhance)

Existing file has basic health check. Add readiness probe tests.

| Test Case | Target Code | What It Verifies |
|-----------|-------------|-----------------|
| `/v1/health/ready` with DB up | `health.ts:42-78` | Status 200, `database: 'pass'` |
| `/v1/health/ready` with DB down | `health.ts:144-155` | Status 503, `database: 'fail'` |
| `/v1/health/ready` with Redis down | `health.ts:183-194` | Status 200 (degraded), `cache: 'warn'` |
| `/v1/health/ready` with Redis not configured | `health.ts:165-171` | Status 200, `cache: 'warn'` |
| `/v1/health/metrics` response shape | `health.ts:98-118` | `memory.rss_mb`, `process.pid` present |
| `/v1/health/live` response shape | `health.ts:85-92` | `status: 'alive'`, `uptime_seconds` |

**Mock strategy**: Mock `db.execute` to succeed or throw for database checks. Mock Redis module for cache checks.

### 4.6 `src/routes/auth.test.ts`

Full auth flow tests via `app.request()`.

| Test Case | What It Verifies |
|-----------|-----------------|
| POST `/v1/auth/login` — success with valid credentials | Returns access + refresh token pair |
| POST `/v1/auth/login` — 401 on wrong password | Error shape, not 500 |
| POST `/v1/auth/login` — 401 on non-existent email | Same error shape (anti-enumeration) |
| POST `/v1/auth/refresh` — success with valid refresh token | New token pair returned |
| POST `/v1/auth/refresh` — 401 when token is blacklisted | Blacklist service consulted |
| POST `/v1/auth/logout` — blacklists with correct JTI | `blacklistService.add()` called with JTI |
| GET `/v1/auth/me` — returns user shape | `is_org_member`, `tier`, `wallet_address` present |
| GET `/v1/auth/validate` — returns validation result | `{ valid: true, auth_method: 'jwt' }` |

**Mock strategy**: Mock `db` for user lookups and `bcrypt` results. Use `createAuthHeaders()` for authenticated requests. Mock `blacklistService` to verify calls.

---

## 5. Core API Tests (Tier 2) — Detailed Design

### 5.1 `src/routes/constructs.test.ts`

All tests via `app.request()`. Replaces fake `tests/e2e/constructs.test.ts`.

| Test Case | What It Verifies |
|-----------|-----------------|
| GET `/v1/constructs` — returns `{ data, pagination, request_id }` | Response shape contract |
| `?type=pack` filter | Only packs returned |
| `?category=development` filter | Category filter applied |
| `?featured=true` filter | Featured filter applied |
| `?q=observer` search | Search query applied |
| `?page=2&per_page=5` pagination | Correct offset/limit, pagination metadata |
| `?per_page=101` validation error | Rejected by Zod (max 100) |
| GET `/v1/constructs/:slug` — detail | Manifest, identity, owner fields present |
| GET `/v1/constructs/:slug` — 404 | Non-existent slug returns 404 with error shape |
| HEAD `/v1/constructs/:slug` — 200 | Empty body, correct status |
| HEAD `/v1/constructs/:slug` — 404 | Empty body, 404 status |
| GET `/v1/constructs/summary` | Agent-optimized minimal format |
| Visibility: anonymous sees only `public` | `optionalAuth` with no header |
| Visibility: org member sees `public + internal` | `optionalAuth` with org member JWT |

**Mock strategy**: Mock `db` to return `createMockPack()` fixtures. Configure mock chain to return different results for different query patterns.

### 5.2 `src/routes/categories.test.ts` (Enhance)

| Test Case | What It Verifies |
|-----------|-----------------|
| Response shape: each category has required fields | `id`, `slug`, `label`, `color`, `description`, `construct_count` |
| Sort order preserved | Categories returned in consistent order |

### 5.3 `src/routes/webhooks.test.ts`

| Test Case | What It Verifies |
|-----------|-----------------|
| Stripe webhook: valid HMAC accepted | 200, event processed |
| Stripe webhook: invalid HMAC rejected | 400 |
| Stripe webhook: duplicate delivery skipped | Idempotency check |
| GitHub webhook: valid `X-Hub-Signature-256` accepted | 200 |
| GitHub webhook: invalid signature rejected | 400 |
| GitHub webhook: replay protection | Duplicate delivery ID rejected |

**Mock strategy**: Generate real HMAC signatures using the test webhook secret for valid cases. Use wrong secrets for rejection cases.

---

## 6. Contract & Snapshot Tests (Tier 3) — Detailed Design

### 6.1 `tests/contract/api-snapshots.test.ts` (Expand)

Extend current snapshots (health + 404) to all public endpoints:

| Endpoint | Snapshot Fields |
|----------|----------------|
| GET `/v1/categories` | List shape |
| GET `/v1/categories/:slug` | Detail shape |
| GET `/v1/constructs` | List with `data`, `pagination`, `request_id` |
| GET `/v1/constructs/:slug` | Detail with manifest, identity |
| GET `/v1/health/live` | `status`, `uptime_seconds` |
| GET `/v1/health/metrics` | `memory`, `process` objects |
| GET `/v1/health/ready` | `status`, `checks` array |

Use `expect.any(String)` for timestamps, UUIDs, and `request_id`. Use `expect.any(Number)` for `uptime`, `pid`, memory values.

### 6.2 `tests/contract/response-schemas.test.ts`

Zod schema validation of production fixtures — stronger than snapshots because it validates structural constraints, not just shape equality.

```typescript
const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  checks: z.array(z.object({
    name: z.string(),
    status: z.enum(['pass', 'fail', 'warn']),
    duration_ms: z.number().optional(),
    message: z.string().optional(),
  })),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
  request_id: z.string().uuid(),
});

const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
  }),
  request_id: z.string(),
});
```

---

## 7. Vitest Configuration Changes

### 7.1 `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 10000,  // ADD: bcrypt operations are slow
    pool: 'forks',       // ADD: isolate test files, prevent mock pollution
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {      // ADD: start low, increase as coverage grows
        statements: 40,
        branches: 30,
        functions: 35,
        lines: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
```

**Rationale:**

- `testTimeout: 10000` — bcrypt `compare()` in API key auth tests takes ~300ms per candidate, up to 10 candidates = 3s. Buffer for CI variability.
- `pool: 'forks'` — each test file runs in a separate process. Prevents `vi.mock()` pollution between files (current default `threads` shares module registry).
- Coverage thresholds at 40/30/35/40 — the baseline after deleting ~1,800 lines of fake tests and adding ~160 real tests. Will increase as coverage grows.

### 7.2 `vitest.setup.ts`

Add Upstash env guards to prevent `Redis.fromEnv()` from reading stale shell env vars:

```typescript
// Existing
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only-32chars!';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// ADD: Prevent Redis.fromEnv() from reading real credentials
// Redis.fromEnv() reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// Setting to empty ensures tests never hit real Redis
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';
```

---

## 8. Cleanup: Fake Test Deletion

| File | Lines | Reason for Deletion |
|------|-------|-------------------|
| `src/services/constructs.test.ts` | ~290 | Defines local variables, asserts on them — never imports from `src/` |
| `src/services/skills.test.ts` | ~147 | Defines `['free','pro','team','enterprise']`, asserts `.toHaveLength(4)` |
| `src/services/submissions.test.ts` | ~290 | Constructs local objects, asserts on properties — no real code exercised |
| `tests/e2e/constructs.test.ts` | ~713 | Builds inline JSON, asserts on that JSON — zero HTTP calls |
| `tests/e2e/pack-flow.test.ts` | ~200 | Mock object assertions, no `app.request()` |
| `tests/e2e/creator.test.ts` | ~150 | Mock object assertions, no `app.request()` |

**Total**: ~1,790 lines deleted. Replaced by ~160 real tests across 10 new/enhanced test files.

---

## 9. CI Integration

### 9.1 Test Execution

Tests run in GitHub Actions without any secrets or external services:

```yaml
# Existing CI step (no changes needed to workflow file)
- name: Test API
  working-directory: apps/api
  run: bun run test
```

All external dependencies (DB, Redis, Stripe, GitHub) are mocked. The `vitest.setup.ts` env guards ensure no accidental connections.

### 9.2 Coverage Reporting

```yaml
# Optional: add coverage step
- name: Test API with Coverage
  working-directory: apps/api
  run: bun run test:coverage
```

Coverage thresholds in `vitest.config.ts` will fail the build if coverage drops below minimums.

---

## 10. Test Count Projections

| Category | Test Files | Test Count |
|----------|-----------|------------|
| Stability (Tier 1) | 6 files | ~65 tests |
| Core API (Tier 2) | 3 files | ~45 tests |
| Contract (Tier 3) | 2 files | ~20 tests |
| Existing (kept) | 9 files | ~45 tests |
| **Total** | **20 files** | **~175 tests** |

Target: full suite completes in < 30 seconds.

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drizzle mock chain doesn't match real query builder | Tests pass but miss real bugs | `createMockDb()` mirrors exact chain from `api-snapshots.test.ts` — one central place to update |
| `pool: 'forks'` slower than default `threads` | Suite time > 30s | Benchmark after implementation; revert to `threads` if <30s target missed |
| bcrypt slows API key auth tests | Individual test >10s | Use lower cost factor in test env; `testTimeout: 10000` provides buffer |
| Snapshot brittleness on minor changes | Spurious CI failures | Use `expect.any()` for all dynamic fields; keep snapshots minimal |
| Mock fidelity drift over time | Tests diverge from reality | `app.request()` exercises real middleware chain (CORS, error handler, request ID) — only DB/Redis are mocked |
