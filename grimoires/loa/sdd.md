# Software Design Document — constructs-api sovereign-landing (cycle-012)

**Cycle**: cycle-012 · constructs-api libSQL migration + surface prune
**Date**: 2026-04-23
**PRD**: `grimoires/loa/prd.md`
**SEED**: `grimoires/loa-constructs-seed-2026-04-21/cycle-012-SEED-constructs-api-libsql-migration.md`
**Supersedes at this path**: cycle-050 SprawlOS Design System SDD (2026-03-13)
**Status**: Draft for Flatline review

---

## 1. System context

### 1.1 Current architecture (pre-cycle-012)

```
  [loa-registry CLI]               [constructs.network UI]
        │                                 │
        │  HTTPS                          │  HTTPS
        └──────────────┬──────────────────┘
                       ▼
            ┌──────────────────────┐
            │  api.constructs      │
            │  .network (Railway)  │──▶ Supabase Postgres (PAUSED)
            │  Hono + Node.js      │    project ccrjfpzdgiuqqwmmgrap
            │  30 routers          │    30 tables, 14 migrations
            └──────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  GitHub API          │
            │  (discover scans     │
            │   construct-* repos) │
            └──────────────────────┘
```

### 1.2 Target architecture (post-cycle-012)

```
  [loa-registry CLI]               [constructs.network UI]
        │                                 │
        │  HTTPS                          │  HTTPS
        └──────────────┬──────────────────┘
                       ▼
            ┌──────────────────────┐
            │  api.constructs      │
            │  .network (Railway)  │──▶ Turso managed libSQL edge
            │  Hono + Node.js      │    libsql://<db>-<org>.turso.io
            │  7 routers           │    5 tables, 1 migration
            └──────────────────────┘
                       │                    │
                       │                    ▼
                       │           daily turso db dump
                       │           → apps/api/.backups/ (git)
                       ▼
            ┌──────────────────────┐
            │  GitHub API          │
            │  (discover scans     │
            │   construct-* repos) │
            └──────────────────────┘
```

**What changes**:
- DB layer: Supabase Postgres → Turso libSQL
- Router count: 20 registered → 7 (health, constructs, packs, skills, categories, admin, stats-proxies)
- Schema: 30 tables → 5 tables
- Auth surface: OAuth + Dynamic + user-scoped routes → none (anonymous reads + anonymous-increment stats + operational-token admin)
- Health: single liveness → split liveness + readiness
- DR: none → daily dumps + restore drill

**What stays**:
- Runtime: Hono + Node.js on Railway (unchanged deploy pipeline)
- Logging: pino (unchanged format)
- GitHub integration for discovery (unchanged)
- ORM: Drizzle (dialect changes to turso)

## 2. Data model (libSQL schema)

Target: ~5 tables, ~300 lines of schema. Postgres types → SQLite-native types.

### 2.1 `packs` (registry core + stats counters)

```typescript
export const packs = sqliteTable('packs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),                  // e.g., "loa", "artisan"
  name: text('name').notNull(),
  description: text('description').notNull(),
  namespace: text('namespace').notNull(),                 // e.g., "0xHoneyJar/construct-loa"
  version: text('version').notNull(),                     // semver
  visibility: text('visibility').notNull().default('public'),  // CHECK: public|internal|unlisted
  category: text('category'),                             // FK → categories.slug (soft)
  maturity: text('maturity').default('experimental'),     // CHECK: experimental|beta|stable
  featured: integer('featured', { mode: 'boolean' }).default(false),
  repo_url: text('repo_url').notNull(),
  manifest: text('manifest', { mode: 'json' }),           // parsed manifest JSON
  readme: text('readme'),
  owner_id: text('owner_id'),
  owner_type: text('owner_type'),                         // CHECK: user|org
  source_type: text('source_type').default('github'),
  construct_type: text('construct_type'),
  // Stats counters (per FR2 + FR7)
  view_count: integer('view_count').notNull().default(0),
  download_count: integer('download_count').notNull().default(0),
  // Timestamps (unix epoch integers)
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  slugIdx: index('idx_packs_slug').on(table.slug),
  categoryIdx: index('idx_packs_category').on(table.category),
  visibilityIdx: index('idx_packs_visibility').on(table.visibility),
  downloadsIdx: index('idx_packs_downloads').on(table.download_count),  // for sort
  viewsIdx: index('idx_packs_views').on(table.view_count),
  featuredIdx: index('idx_packs_featured').on(table.featured, table.maturity),
}));
```

### 2.2 `skills` (sub-units of packs)

```typescript
export const skills = sqliteTable('skills', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  pack_id: text('pack_id').notNull().references(() => packs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull(),
  path: text('path'),                                    // path within construct repo
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  packIdx: index('idx_skills_pack_id').on(table.pack_id),
  slugIdx: index('idx_skills_slug').on(table.slug),
  uniquePackSlug: uniqueIndex('uniq_skills_pack_slug').on(table.pack_id, table.slug),
}));
```

### 2.3 `categories` (navigation)

```typescript
export const categories = sqliteTable('categories', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sort_order: integer('sort_order').default(0),
});
```

### 2.4 `discovery_runs` (observability for admin/discover)

```typescript
export const discovery_runs = sqliteTable('discovery_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  owner: text('owner').notNull(),                        // e.g., "0xHoneyJar"
  started_at: integer('started_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  completed_at: integer('completed_at', { mode: 'timestamp' }),
  dry_run: integer('dry_run', { mode: 'boolean' }).default(false),
  constructs_found: integer('constructs_found').default(0),
  constructs_updated: integer('constructs_updated').default(0),
  constructs_created: integer('constructs_created').default(0),
  errors: text('errors', { mode: 'json' }),
  // Audit columns (per Flatline SKP-002 integration)
  triggered_by: text('triggered_by').default('operational-token'),
  triggered_by_fingerprint: text('triggered_by_fingerprint'),  // first 8 chars of SHA-256(token)
  triggered_by_ip: text('triggered_by_ip'),                    // per §3.2 trust policy
  triggered_by_user_agent: text('triggered_by_user_agent'),
}, (table) => ({
  startedAtIdx: index('idx_discovery_runs_started').on(table.started_at),
  fingerprintIdx: index('idx_discovery_runs_fingerprint').on(table.triggered_by_fingerprint),
}));
```

### 2.5 `stats_events` (optional — only if per-IP cooldown stateful tracking needed beyond in-memory)

```typescript
// Defer to L-route-port; if in-memory leaky-bucket sufficient for rate-limit, skip this table.
// If kept: ring-buffer of recent stat-increment events for per-IP state.
export const stats_events = sqliteTable('stats_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull(),
  event: text('event').notNull(),                        // CHECK: view|download
  ip_hash: text('ip_hash'),                              // hashed IP for privacy
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  slugCreatedIdx: index('idx_stats_slug_created').on(table.slug, table.created_at),
  ipCreatedIdx: index('idx_stats_ip_created').on(table.ip_hash, table.created_at),
}));
```

### 2.6 Tables DELETED (per L-route-prune)

`users`, `api_keys`, `installs`, `sessions`, `subscriptions`, `subscription_events`, `webhooks`, `webhook_deliveries`, `teams`, `team_members`, `team_subscriptions`, `creators`, `creator_payouts`, `showcases`, `submissions`, `submission_reviews`, `pack_submissions`, `pack_reviews`, `signal_keys`, `signal_events`, `audit_log`, `public_keys`, `oauth_accounts`, `dynamic_sessions`, `verifications`, `revenue_sharing`, `analytics_events`, `downloads` (legacy), `pack_permissions`, `category_permissions`.

Total deletion: 25 tables. Retention: 5 tables. Net schema: 83% reduction.

## 3. API contracts (live surface)

### 3.1 Public registry reads

**`GET /v1/constructs`** — paginated catalog
- Query: `per_page` (default 20, max 100), `page` (1-indexed), `q` (search on name + description, COLLATE NOCASE), `category` (slug match), `sort` (`downloads` | `views` | `updated` — default `updated`), `order` (`asc` | `desc` — default `desc`)
- Response: `{ data: Pack[], pagination: { page, per_page, total, total_pages }, request_id: string }`
- Auth: none

**`GET /v1/constructs/:slug`** — pack detail
- Response: `{ data: Pack & { skills: Skill[] }, request_id: string }`
- 404 if slug not found. Embedded skills ordered by name.

**`GET /v1/constructs/summary`** — trending / popularity view
- Response: `{ data: { top_downloads: Pack[], top_views: Pack[], recent: Pack[] }, request_id: string }`
- Top 10 each; may be cacheable via etag.

**`GET /v1/categories`** — list categories for navigation
- Response: `{ data: Category[], request_id: string }`
- Only included if UI uses; may be deleted at L-ui-smoke if orphan.

**`GET /v1/packs`** — pack-only list (CLI compat alias of `/v1/constructs` filtered to packs)
- Response: same shape as `/v1/constructs`

**`GET /v1/skills`** — skill-only list (CLI compat)
- Response: `{ data: Skill[], pagination: ..., request_id: string }`

### 3.2 Stats / observability writes (per FR2)

**`POST /v1/constructs/:slug/view`**
- Body: none. Trusted IP source: **only** `X-Real-IP` or `X-Forwarded-For` set by Railway edge proxy (per SKP-005 Flatline integration). Client-supplied IP headers are ignored; fall back to `req.ip` if edge header missing. Exact extraction precedence documented in `src/middleware/trust-ip.ts`.
- Response: 204 No Content on success; 429 if rate-limited; 404 if slug missing.
- Rate-limit: in-memory leaky bucket, 10 req/min per IP per slug. Bucket key: `view:${ip}:${slug}`.

**`POST /v1/constructs/:slug/download`**
- Body: none. Same IP-trust policy.
- Response: 204 / 429 / 404.
- Rate-limit: 5 req/min per IP per slug (downloads rarer than views).

### 3.3 Admin / operational

**`POST /v1/admin/discover`**
- Query: `owner` (default `0xHoneyJar`), `dry_run` (default `false`)
- Auth: `Authorization: Bearer cto_<hex>` via `middleware/operational-token.ts`
- Body: none. Service: `runDiscovery({ owner, dryRun, githubToken })`.
- Response: `{ constructs_found, constructs_updated, constructs_created, errors, run_id, duration_ms }`
- Writes to `packs` (upsert) + `discovery_runs` (log row).

### 3.4 Health (per FR4, split)

**`GET /v1/health`** — liveness
- Response: `{ status: "ok", uptime_seconds: number }`
- No DB touch. 200 as long as process is responsive.

**`GET /v1/health/ready`** — readiness
- Response: `{ status: "ok" | "db_unreachable", db: { latency_ms?: number, error?: string } }`
- Executes `SELECT 1 FROM packs LIMIT 1` (or similar minimum).
- 200 if DB reachable. 503 if DB query fails.
- Load balancers / deploy health-checks use this endpoint for routing decisions.

### 3.5 Routes DELETED (404 post-cycle)

`/v1/auth/*` (login, logout, refresh), `/v1/auth/oauth/*`, `/v1/auth/dynamic/*`, `/v1/users/me`, `/v1/keys/*`, `/v1/installs`, `/v1/subscriptions/*`, `/v1/webhooks/*`, `/v1/teams/*`, `/v1/creator/*`, `/v1/creators`, `/v1/audit/*`, `/v1/signals/*`, `/v1/public-keys/*`, `/v1/docs/*`, analytics endpoints at v1 root.

## 4. Technology stack

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20+ + Hono | Unchanged from current API |
| ORM | Drizzle | Unchanged; dialect changes from `postgresql` to `turso` |
| DB driver | `@libsql/client` | Replaces `postgres-js` |
| DB host (prod) | Turso managed edge | Matches sprawl-world dashboard precedent |
| DB host (dev) | libSQL `file:./local.db` | Matches sprawl-world dashboard precedent; zero auth |
| Migration tool | `drizzle-kit` (turso dialect) | Existing tool, new dialect |
| Host | Railway | Unchanged deploy pipeline |
| Backups | `turso db dump` via daily cron / workflow | NFR7 per Flatline integration |
| Logger | pino | Unchanged |
| Sentry | Not configured in prod env | Unchanged (deferred tech debt) |
| Rate-limiter | In-memory leaky-bucket (Hono middleware) | No Redis dep; per-IP per-slug buckets in process memory |

**Explicitly NOT in stack**: Postgres, Supabase, Dynamic Labs SDK, OAuth providers, Redis, Convex (for API's DB — Convex remains for webhook integration if still used).

## 5. Migration strategy (Postgres → libSQL)

### 5.1 Schema translation rules

| Postgres | libSQL (SQLite) | Application |
|---|---|---|
| `pgTable` | `sqliteTable` | All table declarations |
| `uuid('id').defaultRandom()` | `text('id').$defaultFn(() => crypto.randomUUID())` | 84 usages |
| `pgEnum('x', [...])` | `text('x').$type<Union>()` + CHECK constraint in migration SQL | 17 enums → CHECK constraints |
| `jsonb('x')` | `text('x', { mode: 'json' })` | 13 columns |
| `timestamp('x')` | `integer('x', { mode: 'timestamp' })` | All timestamps |
| `ilike(col, pattern)` | `like(lower(col), lower(pattern))` OR `sql\`${col} COLLATE NOCASE LIKE ${pattern}\`` | Case-insensitive search in services |
| `date_trunc('day', x)::date::text` | `sql\`strftime('%Y-%m-%d', ${x}, 'unixepoch')\`` | Analytics (DELETED this cycle; not a migration concern) |
| `sql\`gen_random_uuid()\`` | `crypto.randomUUID()` (JS-side) | Rare in this codebase |

### 5.2 Migration execution

**Dev rehearsal first (per Flatline SKP-004 integration)**:

0. Run migration against `file:./local.db` first. Spot-check:
   - Table creation successful
   - `POST /v1/admin/discover` populates packs
   - `GET /v1/constructs` returns rows
   - `POST /v1/constructs/<slug>/view` increments counter
   - All live-surface endpoint shapes match pre-migration contract tests
   - If any dialect-specific bug surfaces (ilike fall-through, date handling, null semantics), fix in schema + service code before prod cutover

**Prod cutover (after rehearsal)**:

1. Delete `apps/api/drizzle/*.sql` (Postgres migrations)
2. Delete `apps/api/drizzle/meta/`
3. Write new schema at `apps/api/src/db/schema.ts` (5 tables)
4. Run `bun drizzle-kit generate` → emits new SQLite migration
5. Against Turso prod: `bun drizzle-kit push` (applies schema directly) OR `bun drizzle-kit migrate` (via emitted SQL)
6. Verify table creation via Turso dashboard or `turso db shell <db> ".schema"`
7. Seed via `POST /v1/admin/discover`
8. Post-cutover spot-check: AC1 (≥20 constructs), AC3 (contract stability), AC5 (zero Supabase traces in logs)

### 5.2.1 Data-loss policy (per Flatline SKP-003-CRITICAL rejection)

**Explicit decision**: cycle-012 does NOT migrate data from the paused Supabase instance. All user accounts, API keys, install history, showcases, submissions, analytics events, signal telemetry are **abandoned by design**.

Rationale (operator-confirmed 2026-04-23 /simstim Phase 1):
- **Pre-launch state**: no external users whose experience is disrupted
- **Doctrine alignment**: [[saas-exit-vectors]] option 4 — accept loss, rebuild from source-of-truth where reproducible (registry content rebuilds via discover)
- **Scope discipline**: including data-migration work in cycle-012 would bloat scope; defer to follow-up cycle if Supabase support email yields pg_dump

Cross-reference: PRD §4 ("Current user reality: pre-launch, no external users"), SEED §1.5 (data-loss decision). Flatline finding SKP-003-CRITICAL (820) raised this concern; rejected because operator pre-decided before cycle-012 dispatch.

### 5.3 Rollback strategy

If migration fails mid-execution:
- Supabase DB stays untouched (it's paused, not modified — rollback is "do nothing, restore Railway DATABASE_URL")
- Turso DB: `turso db destroy <db>` and re-provision
- Railway env: restore prior env vars from `railway variables` history

No user-visible rollback window required (pre-launch).

## 6. Security design

### 6.1 Authentication

- **Public endpoints**: no auth. Read + anonymous increment.
- **Admin endpoints (`/v1/admin/*`)**: operational-token (shared secret `cto_<hex>`) via `middleware/operational-token.ts`. Existing implementation; reused.
- **User-session endpoints**: none in this cycle.

#### 6.1.1 Admin-action audit (per Flatline SKP-002 integration)

Every admin endpoint invocation writes an audit row to `discovery_runs` (extended for this purpose). Fields added:
- `triggered_by_fingerprint`: first 8 chars of SHA-256(token) — identifies which token was used without storing the secret
- `triggered_by_ip`: client IP (via §3.2 trust policy)
- `triggered_by_user_agent`: caller UA

This enables:
- Accountability for registry mutations (who triggered discovery, from where)
- Revocation forensics (if token suspected compromised, fingerprint identifies which admin calls used it)
- Rotation correlation (post-rotation, old fingerprint disappears from new rows)

#### 6.1.2 Token rotation cadence (per Flatline SKP-002 integration)

**Operational policy**: rotate `CONSTRUCTS_ADMIN_TOKEN` monthly. Procedure:

```bash
NEW_TOKEN="cto_$(openssl rand -hex 32)"
railway variables --set "CONSTRUCTS_ADMIN_TOKEN=$NEW_TOKEN"
# Redeploy triggers automatically
# Update any out-of-band consumers (CI scripts, cron jobs) with new token
```

Rotation cadence documented in `apps/api/docs/admin-token-rotation.md` (created in L-backup-setup alongside DR docs). Calendar reminder set up by operator; no automated enforcement this cycle.

### 6.2 Rate-limiting (per FR2)

Stats endpoints (view, download):
- Implementation: Hono middleware with in-memory leaky-bucket per `{ip, slug}` key.
- Budget: 10 view/min, 5 download/min. Configurable via env.
- Overflow: 429 Too Many Requests with Retry-After header.
- Storage: process-local Map; cleared on restart (acceptable — rate-limit is a best-effort abuse deterrent, not a hard quota).

#### 6.2.1 Single-instance constraint (per Flatline SKP-001 integration)

**Explicit operational constraint**: the Railway `loa-constructs-api` service MUST run as a single instance. Horizontal scaling would break in-memory rate-limiting (per-process Maps don't synchronize across instances; attacker hitting different instances gets N× budget).

Enforcement: Railway default is single-instance. Document in `apps/api/docs/deployment.md` (create in L-env-wire) with explicit "do not scale horizontally" warning.

**Escalation path** (if traffic ever justifies scaling):
- Option A: move rate-limit to SQLite-backed `stats_events` table (SDD §2.5 optional table, kept as escape hatch). Per-row INSERT with cleanup + bucket-count aggregation. ~2 hrs work.
- Option B: move rate-limit to Cloudflare edge layer or similar. Requires Cloudflare Workers config. Defers entirely off the API.
- Option C: accept degradation (ranking signals become somewhat gameable at scale).

Escalation trigger: sustained traffic >100 req/sec OR evidence of rank-poisoning attempts. Not expected pre-launch.

### 6.3 Input validation

Zod schemas on all route handlers (Hono zValidator). Query params validated against ranges. Slug format restricted to `[a-z0-9-]+` max 100 chars.

### 6.4 CORS

Existing configuration preserved. `Access-Control-Allow-Origin: https://constructs.network`; credentials-allowed true.

### 6.5 Secrets management

- Railway env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CONSTRUCTS_ADMIN_TOKEN`, `GITHUB_TOKEN`
- No in-repo secrets. `.env.example` documents required vars.
- Rotation: token rotation via `turso db tokens create <db>`; env update via `railway variables --set`.

## 7. Observability

- **Logging**: pino structured JSON to stdout; Railway captures + forwards to Fastly edge logs.
- **Metrics**: view/download counters at application level (packs.view_count, packs.download_count).
- **Aggregation**: `GET /v1/constructs/summary` reads aggregate state; no separate metrics service required.
- **Error tracking**: Sentry DSN not configured; tech debt, not this cycle's scope.
- **Readiness**: `GET /v1/health/ready` endpoint forces DB-path check; deploy orchestrator uses for routing.

## 8. Backup + Disaster Recovery (per NFR7)

### 8.1 Backup (per Flatline SKP-003-HIGH integration)

- **Frequency**: daily via GitHub Action cron
- **Command**: `turso db dump <db-name> | aws s3 cp - s3://0xhoneyjar-backups/loa-constructs-api/$(date +%Y-%m-%d).sql.gz --sse AES256`
  (or equivalent for Cloudflare R2)
- **Retention**: 30 days in S3 with lifecycle policy auto-delete; last 7 days hot, prior 23 days cold-tier
- **Storage**: **R2 / S3 only, NOT git.** Rationale: backups may contain operational metadata (manifests with private keys, internal categories, etc.); committing to git creates permanent exposure + repo bloat. Encrypted at rest via R2 default encryption or S3 SSE-AES256.
- **Access**: read via `aws s3 cp s3://.../file.sql.gz - | gunzip | sqlite3 <restore-db>`
- **Credentials**: GitHub Actions uses OIDC federation to R2 (preferred) or AWS role; operator retains read-only access key in 1Password
- **Manifest file**: `apps/api/.backups/MANIFEST.md` (git-tracked) documents the backup location + retention policy + recent timestamps, BUT contains no actual backup content

### 8.2 Disaster recovery drill (documented procedure)

File: `apps/api/docs/disaster-recovery.md` (created in L-backup-setup)

Scenarios:
1. **Turso compute unreachable**: API readiness endpoint 503s → load balancer removes from pool. Operator runs break-glass fallback (see §8.3).
2. **Turso project locked** (billing / account issue): restore most recent backup to a fresh Turso DB (or self-host sqld on Railway for fallback). `railway variables --set TURSO_DATABASE_URL=<new>`. Redeploy.
3. **Accidental data loss** (bad `POST /v1/admin/discover` wipes data): restore from last-night's dump via `turso db shell`.

### 8.3 Break-glass read-only fallback

If Turso is unreachable and recovery takes >1 hour:
- Copy most recent `.backups/YYYY-MM-DD.sql` to a `better-sqlite3` local file.
- Run a read-only variant of the API (feature flag in env: `READONLY_FALLBACK=1`) that loads from local file.
- Serves `GET /v1/constructs*` reads; write endpoints (stats, discover) return 503.
- Rollback when Turso restored: unset `READONLY_FALLBACK`, redeploy.

## 9. Testing strategy

- **Unit tests**: existing tests for ported handlers; updated for SQLite semantics (date arithmetic, case-insensitive search).
- **Contract tests**: golden-file JSON responses for each of 12 live endpoints; compare pre/post migration for shape stability.
- **Integration tests**: `bun test` against dev `file:./local.db`; CI provisions ephemeral Turso DB per PR (deferred — env var injection + cleanup; file tech debt).
- **Manual smoke**: AC9 builder-touch; operator loads constructs.network post-deploy.

Test suite structure unchanged: tests live next to code (`*.test.ts`). Deleted routers' tests deleted along with their code (per git-is-code-memory doctrine).

## 10. Non-functional cross-cutting

- **Performance**: libSQL edge is fast (<10ms latency for simple queries from Railway); stats increments are atomic (SQLite UPDATE with counter). Expected throughput is low (tens of reqs/sec at most pre-launch).
- **Scalability**: Turso free tier handles expected load. Migration to self-host sqld on Freeside ECS is zero schema work.
- **Availability**: 99%+ expected (Turso edge + Railway are both highly available). Single-region acceptable pre-launch.
- **Cost**: Turso free tier ($0). Railway existing plan (no change). Backup storage negligible.

## 11.1 Atomic counter semantics (per Flatline IMP-005 auto-integration)

Stats increments (`view_count`, `download_count`) must be atomic under concurrency. SQLite `UPDATE ... SET view_count = view_count + 1 WHERE slug = ?` is atomic at the row level; libSQL inherits this guarantee.

Implementation in `src/services/stats.ts`:

```typescript
await db
  .update(packs)
  .set({ view_count: sql`${packs.view_count} + 1` })
  .where(eq(packs.slug, slug));
```

**Not** fetch-then-update (read-modify-write under concurrency). The SQL expression `view_count + 1` is evaluated at the SQLite level inside the transaction — safe for concurrent clients.

Verification at L-route-port: write a test that issues N concurrent POST /view and asserts counter increments by exactly N.

## 11.2 Schema governance (per Flatline IMP-006 auto-integration)

Drift prevention between `apps/api/src/db/schema.ts` (declarative) and actual DB state:

- **Source of truth**: the Drizzle schema file. Never modify prod DB directly.
- **Migration authoring**: `bun drizzle-kit generate` from schema changes; review the emitted SQL before applying.
- **Migration application**: `bun drizzle-kit migrate` (vs `push`) keeps a migration history; `push` is for rapid iteration in dev only.
- **CI check**: add `bun drizzle-kit check` to CI pipeline to detect drift between schema and migrations.
- **Prod drift audit**: periodic (quarterly) `turso db shell <db> ".schema"` comparison against declarative schema to catch manual changes.

Documented in `apps/api/docs/schema-governance.md` (create in L-db-client).

## 12. Open questions for SDD review

- Should `categories` table be kept or deleted? (Decide at L-ui-smoke: if UI uses it, keep; else delete with other dormants.)
- In-memory rate-limit sufficient, or do we want a minimal persistent bucket (e.g., in SQLite `stats_events` table)? SDD defaults to in-memory + single-instance-constraint-documented; decision can flip at L-route-port if single-instance feels fragile.
- `stats_events` table: include or skip? (Default: skip; counters on packs are enough. Include only if per-IP anomaly detection is a future requirement OR if rate-limit needs DB-backing.)

---

**Flatline SDD review summary (Phase 4, 2026-04-23)**:
- 2 HIGH_CONSENSUS auto-integrated (IMP-005 atomic counters, IMP-006 schema governance)
- 6 blockers integrated: SKP-001 single-instance constraint, SKP-002 admin audit + rotation, SKP-003-HIGH R2 backups, SKP-004 dev-rehearsal, SKP-005 IP trust
- 1 blocker rejected: SKP-003-CRITICAL (data migration) — already operator-decided, documented as rejection in §5.2.1
- Logged via simstim-orchestrator blocker-override

---

*SDD derived 2026-04-23 from PRD v1 + SEED. Flatline-integrated 2026-04-23. Ready for Phase 5 (Sprint planning).*
