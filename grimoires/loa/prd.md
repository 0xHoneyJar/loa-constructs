# PRD: API Stability — Test Infrastructure & Regression Prevention

**Cycle**: cycle-042
**Created**: 2026-03-11
**Status**: Draft
**Context**: `grimoires/loa/context/api-test-stability-baseline.md`
**Grounded in**:
- `apps/api/vitest.config.ts` (existing Vitest v2.1 config)
- `apps/api/vitest.setup.ts` (minimal — only JWT_SECRET + NODE_ENV)
- `apps/api/src/middleware/auth.ts:63-95` (getUserById on every request, no caching)
- `apps/api/src/middleware/rate-limiter.ts:134-218` (fail-open/fail-closed split, dead code at 193)
- `apps/api/src/services/blacklist.ts:57-75` (fail-secure returns true on Redis error)
- `apps/api/src/services/redis.ts` (env var mismatch: REDIS_URL vs UPSTASH_REDIS_REST_URL)
- `apps/api/src/db/index.ts` (prepare: false, max: 10, dummy fallback URL)
- `apps/api/src/routes/health.ts` (readiness probe: DB + Redis)
- `apps/api/src/config/env.ts` (JWT_SECRET optional in Zod schema, runtime crash)
- `tests/e2e/constructs.test.ts` (~713 lines testing inline objects, zero HTTP calls)
- `src/services/constructs.test.ts` (~290 lines testing local constants)

---

## 1. Problem Statement

The constructs.network API has experienced repeated downtime. The root cause is not bad architecture — the middleware stack, auth flow, and rate limiting are well-designed. The root cause is that the critical failure modes are untested.

The API has 40+ endpoints, ~20 test files, and ~1,800 lines of tests that exercise nothing. The "e2e" tests in `tests/e2e/` construct mock JSON objects inline and assert on those objects — they never make an HTTP request through the Hono app. Service tests like `constructs.test.ts` and `skills.test.ts` define local constants and assert `['free','pro','team','enterprise'].toHaveLength(4)`. These tests pass when the API is completely broken.

Meanwhile, the paths that actually cause downtime — Redis outages blocking all token refresh, missing env vars causing runtime 500s, auth middleware hitting the DB on every request without caching — have zero test coverage.

> Sources: `api-test-stability-baseline.md`, diagnostic session 2026-03-11

---

## 2. Goals & Success Metrics

### Primary Goal
Prevent API downtime by testing the code paths that cause it.

### Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Fake test lines | ~1,800 | 0 | grep for test files that don't import from `src/` |
| Real test count | ~45 | 160+ | `bun run test --reporter=verbose \| grep '✓' \| wc -l` |
| Critical path coverage | 0% | 100% | All 11 fragile areas have dedicated tests |
| Test suite speed | N/A | < 30s | `time bun run test` |
| Coverage (statements) | Unknown | > 40% | `bun run test:coverage` |
| Production incidents from untested paths | Recurring | 0 | Incident log |

### Non-Goals
- Full 100% code coverage (diminishing returns past ~60%)
- Integration tests against live Supabase/Redis (mock-based is fine for regression detection)
- Performance/load testing (separate initiative)
- Frontend/explorer testing (separate scope)

---

## 3. Users & Stakeholders

| Role | Need |
|------|------|
| @janitooor (maintainer) | Confidence that merges won't cause downtime |
| API consumers (Loa CLI, explorer, constructs) | Stable endpoints that don't return 500s |
| CI pipeline | Fast, deterministic test suite that catches regressions |

---

## 4. Functional Requirements

### FR-1: Shared Test Infrastructure
**Priority**: P0 (blocks all other work)

Create `apps/api/tests/helpers/` with:

| Helper | Purpose |
|--------|---------|
| `mock-db.ts` | Drizzle query builder mock factory with chained methods |
| `mock-redis.ts` | Redis mock with `failMode` option for error testing |
| `fixtures.ts` | Realistic DB row factories (user, pack, skill, version, subscription) |
| `auth.ts` | JWT generator using test secret for auth header creation |

**Acceptance**: Any new test file requires < 10 lines of setup.

> Source: `api-test-stability-baseline.md` Phase 0

### FR-2: Stability Tests (Tier 1)
**Priority**: P0

Test every known fragile area:

| ID | Fragile Area | Test File | What Breaks Without It |
|----|-------------|-----------|----------------------|
| F-1 | Redis env mismatch | `redis.test.ts` | First Redis call throws, rate limiter 503s |
| F-2 | JWT_SECRET missing | `auth.test.ts` (route) | First auth request 500s |
| F-3 | Blacklist fail-secure | `blacklist.test.ts` | Redis outage blocks all token refresh |
| F-4 | Rate limiter fail modes | `rate-limiter.test.ts` | Auth endpoints 503 vs non-auth pass-through |
| F-5 | Auth middleware | `auth.test.ts` (middleware) | Every auth variant: JWT, API key, optional |
| F-6 | Error handler | `error-handler.test.ts` | AppError vs unknown error response shapes |
| F-7 | Health readiness | `health.test.ts` (enhance) | DB/Redis probe behavior |

**Acceptance**: Breaking any of these 7 areas causes at least one test to fail.

> Source: `api-test-stability-baseline.md` Phase 1, diagnostic session fragile areas 1-11

### FR-3: Core API Tests (Tier 2)
**Priority**: P1

| Test File | Endpoints Covered |
|-----------|------------------|
| `constructs.test.ts` (route) | GET list, filters, pagination, detail, HEAD, summary, visibility |
| `categories.test.ts` (enhance) | Response shape contract, sort order |
| `webhooks.test.ts` | Stripe HMAC, GitHub HMAC, idempotency, replay protection |

**Acceptance**: All public endpoints have at least one test via `app.request()`.

> Source: `api-test-stability-baseline.md` Phase 2

### FR-4: Contract & Snapshot Tests (Tier 3)
**Priority**: P1

| Test File | Purpose |
|-----------|---------|
| `api-snapshots.test.ts` (expand) | Snapshot every public endpoint response shape |
| `response-schemas.test.ts` (new) | Zod schema validation of production fixtures |

**Acceptance**: Changing any response field causes a snapshot mismatch or schema failure.

> Source: `api-test-stability-baseline.md` Phase 3

### FR-5: Cleanup Fake Tests
**Priority**: P1

Delete these files (~1,800 lines):

| File | Lines | Why Fake |
|------|-------|----------|
| `src/services/constructs.test.ts` | ~290 | Tests local variables |
| `src/services/skills.test.ts` | ~147 | Tests local constants |
| `src/services/submissions.test.ts` | ~290 | Tests local objects |
| `tests/e2e/constructs.test.ts` | ~713 | Inline JSON, no HTTP |
| `tests/e2e/pack-flow.test.ts` | ~200 | Mock object assertions |
| `tests/e2e/creator.test.ts` | ~150 | Mock object assertions |

**Acceptance**: Zero test files that only assert on locally-defined data.

### FR-6: Vitest Configuration
**Priority**: P0

Update `apps/api/vitest.config.ts`:
- `testTimeout: 10000` (bcrypt operations are slow)
- `pool: 'forks'` (isolate test files to prevent mock pollution)
- Coverage thresholds: `statements: 40, branches: 30, functions: 35, lines: 40`

Update `apps/api/vitest.setup.ts`:
- Set `UPSTASH_REDIS_REST_URL=''` and `UPSTASH_REDIS_REST_TOKEN=''`

**Acceptance**: `bun run test` passes in CI without environment secrets.

---

## 5. Technical & Non-Functional Requirements

### NFR-1: Speed
Full test suite completes in < 30 seconds. No network calls, no external service dependencies.

### NFR-2: Determinism
Tests produce identical results on every run. No time-dependent assertions, no random data without seeds, no shared mutable state between test files.

### NFR-3: CI Compatibility
Tests run in GitHub Actions without Supabase, Redis, or any secret env vars. All external dependencies are mocked.

### NFR-4: Maintainability
Shared helpers eliminate boilerplate. Adding a new route test requires < 10 lines of setup beyond the test logic itself.

---

## 6. Scope & Prioritization

### MVP (Sprint 1)
- FR-1: Shared test helpers
- FR-2: Stability tests (all 7 fragile areas)
- FR-6: Vitest config changes
- FR-5: Delete fake tests (clean slate)

### Sprint 2
- FR-3: Core API tests
- FR-4: Contract & snapshot tests

### Out of Scope
- Integration tests against live databases
- Performance/load testing
- Frontend (explorer) test coverage
- E2E tests with real HTTP server (Hono's `app.request()` is sufficient)
- Fixing the 11 fragile areas (test them first, fix in future cycle)

---

## 7. Risks & Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mock fidelity drift | Tests pass but real behavior differs | Use `app.request()` for route tests (exercises real middleware chain). Use real crypto in auth tests. |
| Drizzle mock chain complexity | Hard to maintain as schema evolves | Centralized `createMockDb()` factory — single place to update |
| bcrypt slows tests | Suite exceeds 30s target | Use `testTimeout: 10000`, consider lower cost factor in test env |
| Snapshot brittleness | Minor changes cause spurious failures | Use `expect.any()` for dynamic fields (timestamps, IDs, request_id) |

### Dependencies
- Vitest v2.1 (already installed)
- `@hono/node-server` test utilities — `app.request()` (already available)
- `jose` for JWT generation in test helpers (already installed)
- No new dependencies required

---

## 8. Known Fragile Areas (Reference)

These 11 areas were identified during the diagnostic session. The test suite must cover all of them:

1. **Redis env var mismatch** — `env.ts` validates `REDIS_URL` but `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL`
2. **JWT_SECRET missing = runtime 500** — not validated at startup
3. **Every auth request hits DB** — `getUserById()` on every JWT validation
4. **bcrypt on every API key auth** — up to 10 candidates, ~300ms each
5. **Redis outage = token refresh blocked** — `isBlacklisted()` fail-secure
6. **Rate limiter dead code** — re-throw check at `rate-limiter.ts:193`
7. **No circuit breakers** — GitHub API calls in OAuth have no timeout
8. **Sentry is a stub** — `captureException()` only logs
9. **OAuth tokens in URL query params** — tokens in browser history
10. **AppError duck-typing** — `'code' in err` instead of `instanceof`
11. **Bare catch blocks** — DB errors return as "invalid token"
