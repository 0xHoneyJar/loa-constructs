# Sprint Plan: API Stability — Test Infrastructure & Regression Prevention

**Cycle**: cycle-042
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Team**: 1 engineer (autonomous)
**Sprint Duration**: 1 session each

---

## Sprint 1: Test Infrastructure + Stability Tests (MVP)

**Goal**: Shared helpers, vitest config, delete fake tests, stability tests for all fragile areas.

**Success Criteria**: `cd apps/api && bun run test` passes with 0 fake tests, all 7 fragile areas covered.

### T1.1: Vitest Configuration Updates
**Priority**: P0 (blocks all tests)
**Files**: `apps/api/vitest.config.ts`, `apps/api/vitest.setup.ts`

**Description**: Update vitest config with `testTimeout: 10000`, `pool: 'forks'`, coverage thresholds (40/30/35/40). Add UPSTASH env guards to setup file.

**Acceptance Criteria**:
- `vitest.config.ts` has `testTimeout: 10000` and `pool: 'forks'`
- `vitest.config.ts` has coverage thresholds: `statements: 40, branches: 30, functions: 35, lines: 40`
- `vitest.setup.ts` sets `UPSTASH_REDIS_REST_URL=''` and `UPSTASH_REDIS_REST_TOKEN=''`
- `bun run test` passes without environment secrets

**Dependencies**: None
**Effort**: Small

---

### T1.2: Shared Test Helpers — mock-db.ts
**Priority**: P0 (blocks stability tests)
**Files**: `apps/api/tests/helpers/mock-db.ts`

**Description**: Create Drizzle mock chain factory following the pattern from `tests/contract/api-snapshots.test.ts:59-133`. Returns fully-chained mock (`select→from→where→orderBy→limit→offset`, `insert→values→returning`, `update→set→where→returning`, `execute`). Includes all schema table stubs and enum/relation exports.

**Acceptance Criteria**:
- `createMockDb()` returns a mock with configurable return values via `mockResolvedValueOnce`
- `getMockDbModule()` returns full `vi.mock()` payload including 14 table stubs + enum/relation exports
- `db.execute` is mocked for raw SQL queries (health readiness)
- Pattern matches existing `api-snapshots.test.ts` mock structure

**Dependencies**: None
**Effort**: Medium

---

### T1.3: Shared Test Helpers — mock-redis.ts
**Priority**: P0
**Files**: `apps/api/tests/helpers/mock-redis.ts`

**Description**: Create Redis mock with `failMode` option. Mocks `get`, `set`, `del`, `incr`, `expire`, `exists`, `setex`, `ping`, `keys`. `failMode: true` makes all operations reject. `configured: false` makes `isRedisConfigured()` return false.

**Acceptance Criteria**:
- `createMockRedis()` returns mock with all Redis methods
- `createMockRedis({ failMode: true })` makes all operations throw
- `getMockRedisModule({ configured: false })` returns module where `isRedisConfigured()` returns false
- Re-exports `CACHE_KEYS` and `CACHE_TTL` constants

**Dependencies**: None
**Effort**: Small

---

### T1.4: Shared Test Helpers — fixtures.ts
**Priority**: P0
**Files**: `apps/api/tests/helpers/fixtures.ts`

**Description**: Create factory functions for realistic DB rows: `createMockUser`, `createMockPack`, `createMockSkill`, `createMockVersion`, `createMockSubscription`, `createMockApiKey`. Column names match Drizzle schema (camelCase). All accept optional overrides.

**Acceptance Criteria**:
- Each factory returns a complete row with realistic defaults
- Override any field via parameter: `createMockUser({ tier: 'pro' })`
- Column names match actual Drizzle schema (camelCase)
- Date fields use `new Date()` objects

**Dependencies**: None
**Effort**: Small

---

### T1.5: Shared Test Helpers — auth.ts + index.ts
**Priority**: P0
**Files**: `apps/api/tests/helpers/auth.ts`, `apps/api/tests/helpers/index.ts`

**Description**: Create JWT generator using `jose` + test `JWT_SECRET`. `createAuthHeaders(userId, email, opts)` returns `{ Authorization: 'Bearer <token>' }`. `createExpiredAuthHeaders()` returns expired JWT. Barrel export in `index.ts`.

**Acceptance Criteria**:
- `createAuthHeaders()` generates a valid HS256 JWT with `sub`, `email`, `jti`, `exp` claims
- Token is verifiable by the real `verifyAccessToken()` from `src/services/auth.ts`
- `createExpiredAuthHeaders()` generates a JWT with `exp` in the past
- `jti` parameter allows setting specific JTI for blacklist testing
- `index.ts` re-exports all helpers

**Dependencies**: None
**Effort**: Small

---

### T1.6: Delete Fake Tests
**Priority**: P0 (clean slate before adding real tests)
**Files**: 6 files deleted

**Description**: Delete the ~1,790 lines of fake tests that assert on locally-defined data:
- `apps/api/src/services/constructs.test.ts` (~290 lines)
- `apps/api/src/services/skills.test.ts` (~147 lines)
- `apps/api/src/services/submissions.test.ts` (~290 lines)
- `apps/api/tests/e2e/constructs.test.ts` (~713 lines)
- `apps/api/tests/e2e/pack-flow.test.ts` (~200 lines)
- `apps/api/tests/e2e/creator.test.ts` (~150 lines)

**Acceptance Criteria**:
- All 6 files deleted
- `bun run test` still passes (remaining good tests unaffected)
- Zero test files that only assert on locally-defined constants

**Dependencies**: None
**Effort**: Small

---

### T1.7: Stability Test — blacklist.test.ts
**Priority**: P0
**Files**: `apps/api/src/services/blacklist.test.ts`

**Description**: Test `blacklistService` fail-secure/fail-open behavior. 8 test cases covering: Redis not configured, expired token skip, correct TTL, graceful degradation on error, fail-secure on Redis error (returns `true`).

**Acceptance Criteria**:
- `isBlacklisted()` returns `false` when Redis not configured
- `isBlacklisted()` returns `true` on Redis error (fail-secure — **critical**)
- `add()` does not throw on Redis error (graceful degradation)
- `add()` skips tokens with `expiresInSeconds <= 0`
- All 8 test cases pass

**Dependencies**: T1.3 (mock-redis)
**Effort**: Medium

---

### T1.8: Stability Test — rate-limiter.test.ts
**Priority**: P0
**Files**: `apps/api/src/middleware/rate-limiter.test.ts`

**Description**: Test rate limiter middleware fail modes. 6 test cases covering: Redis bypass, 429 response, rate limit headers, auth fail-closed (503), non-auth fail-open, skip function.

**Acceptance Criteria**:
- Passes through when Redis not configured (no rate limit headers)
- Returns 429 with `Retry-After` header when limit exceeded
- Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on responses
- Auth endpoints return 503 on Redis error (fail-closed — **critical**)
- Non-auth endpoints pass through with `X-RateLimit-Degraded: true` on Redis error
- All 6 test cases pass

**Dependencies**: T1.2, T1.3
**Effort**: Medium

---

### T1.9: Stability Test — auth.test.ts (middleware)
**Priority**: P0
**Files**: `apps/api/src/middleware/auth.test.ts`

**Description**: Test auth middleware: `requireAuth()`, `optionalAuth()`, `requireTier()`, `requireOrgMember()`, `requireVerifiedEmail()`. 12 test cases using minimal Hono apps with each middleware.

**Acceptance Criteria**:
- `requireAuth()` returns 401 with no header, invalid JWT, expired JWT
- `requireAuth()` sets context vars with valid JWT + existing user
- `requireAuth()` returns 401 when JWT valid but user deleted from DB
- `requireAuth()` handles API key path (`sk_*` prefix)
- `optionalAuth()` passes through without auth, attaches user when present
- `requireTier('pro')` returns 402 for free user, passes for pro
- `requireOrgMember()` returns 403 for non-member
- `requireVerifiedEmail()` returns 403 for unverified
- All 12 test cases pass

**Dependencies**: T1.2, T1.4, T1.5
**Effort**: Large

---

### T1.10: Stability Test — error-handler.test.ts
**Priority**: P0
**Files**: `apps/api/src/middleware/error-handler.test.ts`

**Description**: Test error handler middleware. 4 test cases covering: AppError structured response, unknown error 500 without leaking internals, duck-typing compatibility, request_id inclusion.

**Acceptance Criteria**:
- `AppError` returns `{ error: { code, message, details }, request_id }` with correct HTTP status
- Unknown `Error` returns 500 with `{ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }` — no stack trace leaked
- Duck-typing check (`'code' in err && err.name === 'AppError'`) works
- `request_id` is UUID format
- All 4 test cases pass

**Dependencies**: T1.2
**Effort**: Small

---

### T1.11: Stability Test — health.test.ts (Enhance)
**Priority**: P0
**Files**: `apps/api/src/routes/health.test.ts`

**Description**: Enhance existing health test file with readiness probe and metrics tests. 6 new test cases covering: DB up/down readiness, Redis down/not-configured readiness, metrics shape, live shape.

**Acceptance Criteria**:
- `/v1/health/ready` returns 200 with `database: 'pass'` when DB up
- `/v1/health/ready` returns 503 with `database: 'fail'` when DB down
- `/v1/health/ready` returns 200 (degraded) with `cache: 'warn'` when Redis down
- `/v1/health/metrics` includes `memory.rss_mb` and `process.pid`
- `/v1/health/live` includes `status: 'alive'` and `uptime_seconds`
- All new test cases pass alongside existing tests

**Dependencies**: T1.2, T1.3
**Effort**: Medium

---

### T1.12: Stability Test — auth.test.ts (routes)
**Priority**: P0
**Files**: `apps/api/src/routes/auth.test.ts`

**Description**: Full auth flow tests via `app.request()`. 8 test cases covering: login success/failure, refresh success/blacklisted, logout blacklisting, me endpoint, validate endpoint.

**Acceptance Criteria**:
- POST `/v1/auth/login` returns token pair on success
- POST `/v1/auth/login` returns 401 on wrong password (not 500)
- POST `/v1/auth/login` returns 401 on non-existent email (anti-enumeration)
- POST `/v1/auth/refresh` returns new tokens with valid refresh token
- POST `/v1/auth/refresh` returns 401 when token is blacklisted
- POST `/v1/auth/logout` calls `blacklistService.add()` with correct JTI
- GET `/v1/auth/me` returns user with `is_org_member`, `tier`, `wallet_address`
- GET `/v1/auth/validate` returns `{ valid: true, auth_method: 'jwt' }`
- All 8 test cases pass

**Dependencies**: T1.2, T1.3, T1.4, T1.5
**Effort**: Large

---

## Sprint 2: Core API Tests + Contract Tests

**Goal**: Route tests for public endpoints, contract/snapshot test expansion, Zod schema validation.

**Success Criteria**: All public endpoints have at least one test via `app.request()`. Response shape changes cause test failures.

### T2.1: Core API Test — constructs.test.ts (routes)
**Priority**: P1
**Files**: `apps/api/src/routes/constructs.test.ts`

**Description**: Route-level tests replacing fake `tests/e2e/constructs.test.ts`. 14 test cases via `app.request()` covering: list, filters, pagination, validation, detail, 404, HEAD, summary, visibility.

**Acceptance Criteria**:
- GET `/v1/constructs` returns `{ data, pagination, request_id }`
- Filters (`type`, `category`, `featured`, `q`) applied correctly
- `?per_page=101` rejected by Zod
- GET `/v1/constructs/:slug` returns detail or 404
- HEAD `/v1/constructs/:slug` returns correct status with empty body
- GET `/v1/constructs/summary` returns minimal format
- Anonymous sees only `public`, org member sees `public + internal`
- All 14 test cases pass

**Dependencies**: Sprint 1 complete
**Effort**: Large

---

### T2.2: Core API Test — categories.test.ts (Enhance)
**Priority**: P1
**Files**: `apps/api/src/routes/categories.test.ts`

**Description**: Enhance existing categories test. Add response shape contract tests: each category has `id`, `slug`, `label`, `color`, `description`, `construct_count`. Verify sort order.

**Acceptance Criteria**:
- Each category in response has all required fields
- Sort order is consistent
- All new test cases pass alongside existing tests

**Dependencies**: Sprint 1 complete
**Effort**: Small

---

### T2.3: Core API Test — webhooks.test.ts
**Priority**: P1
**Files**: `apps/api/src/routes/webhooks.test.ts`

**Description**: Webhook HMAC verification tests. 6 test cases covering: Stripe valid/invalid HMAC, Stripe idempotency, GitHub valid/invalid signature, GitHub replay protection.

**Acceptance Criteria**:
- Valid Stripe HMAC signature accepted (200)
- Invalid Stripe HMAC rejected (400)
- Duplicate Stripe delivery skipped
- Valid GitHub `X-Hub-Signature-256` accepted (200)
- Invalid GitHub signature rejected (400)
- Duplicate GitHub delivery rejected (replay protection)
- All 6 test cases pass

**Dependencies**: Sprint 1 complete
**Effort**: Medium

---

### T2.4: Contract Test — api-snapshots.test.ts (Expand)
**Priority**: P1
**Files**: `apps/api/tests/contract/api-snapshots.test.ts`

**Description**: Expand snapshot tests to all public endpoints. Add snapshots for: categories list/detail, constructs list/detail, health live/metrics/ready. Use `expect.any()` for dynamic fields.

**Acceptance Criteria**:
- Snapshots for all 7 public endpoint groups
- Dynamic fields (timestamps, UUIDs, PIDs) use `expect.any()`
- Snapshot update (`vitest -u`) works cleanly
- All snapshot tests pass

**Dependencies**: Sprint 1 complete
**Effort**: Medium

---

### T2.5: Contract Test — response-schemas.test.ts
**Priority**: P1
**Files**: `apps/api/tests/contract/response-schemas.test.ts`

**Description**: Zod schema validation of API responses. Define schemas for: health response, error response, paginated response, category response. Validate production fixtures and live responses against schemas.

**Acceptance Criteria**:
- `HealthResponseSchema` validates health endpoint responses
- `ErrorResponseSchema` validates error responses (code, message, request_id)
- `PaginatedResponseSchema` validates list responses (data, pagination invariants)
- Changing any response field causes Zod validation failure
- All schema validation tests pass

**Dependencies**: Sprint 1 complete
**Effort**: Medium

---

## Summary

| Sprint | Tasks | Test Files | Projected Tests |
|--------|-------|-----------|----------------|
| Sprint 1 | 12 tasks | 5 helpers + 6 test files + 6 deleted | ~65 stability tests |
| Sprint 2 | 5 tasks | 5 test files | ~45 route + contract tests |
| **Total** | **17 tasks** | **20 active test files** | **~175 tests** |

## Risk Mitigations

- **Mock chain complexity**: Centralized in `mock-db.ts` — single place to update
- **bcrypt slowness**: `testTimeout: 10000` provides buffer
- **Snapshot brittleness**: `expect.any()` for all dynamic fields
- **Suite speed**: Target < 30s; `pool: 'forks'` may slow — benchmark and adjust
