# Product Requirements Document — constructs-api sovereign-landing (cycle-012)

**Derived from**: `grimoires/loa-constructs-seed-2026-04-21/cycle-012-SEED-constructs-api-libsql-migration.md`
**Date**: 2026-04-23
**Cycle**: cycle-012 · constructs-api libSQL migration + surface prune
**Dispatch mode**: `/simstim` HITL
**Status**: Draft for Flatline review
**Supersedes at this path**: cycle-051 analytics+GEO PRD (2026-03-15) — that cycle is closed; this path is the active-cycle PRD per simstim convention.

---

## 1. Overview

Migrate the `constructs-api` service (Hono + Node.js, currently deployed on Railway with Supabase Postgres) to libSQL (Turso managed edge), concurrently pruning ~65% of the API surface that is registered but unused in production. The migration is forced by an unrecoverable Supabase billing hold on project `ccrjfpzdgiuqqwmmgrap`; the surface reduction is opportunistic — aligning the API code with the product's current state rather than faithfully porting legacy tables.

This cycle executes doctrine [[saas-exit-vectors]] instance-1, promoting it from candidate to executed.

## 2. Problem statement

**Operator-facing problem**: constructs.network renders "No constructs available" across all pages because `api.constructs.network/v1/constructs` returns `{"data":[],"total":0}`. Diagnosis revealed the API silently swallows `PostgresError XX000 FATAL` (Supabase pooler cannot reach paused compute) and returns empty responses. The DB has been dead; the API has been lying about it.

**Structural problem**: THJ's Supabase organization has outstanding invoices. Project restore is blocked with *"Failed to restore project: This organization has unpaid invoices."* Multiple projects affected. The data-access gate is financial, not temporal; self-service recovery is unavailable.

**Secondary problem discovered during diagnosis**: The API's schema (30 tables, 1,401 lines, 14 migrations) vastly exceeds its actual product surface. The registered routers include analytics, creator(s), teams, subscriptions, webhooks, audit, signals, public-keys, docs — all receive zero production traffic. CLI (`loa-registry`) uses 6 endpoints; UI (`constructs.network`) uses 8. Total live endpoints: ~12. Migrating the schema faithfully preserves dead weight.

## 3. Goals

| # | Goal | Success metric |
|---|------|---|
| G1 | Sever Supabase dependency | Railway env has no `DATABASE_URL`; API logs show zero `PostgresError` post-deploy |
| G2 | Restore registry visibility on `constructs.network` | `GET /v1/constructs` returns ≥20 real constructs; UI explore page renders them |
| G3 | Align API surface with product reality | Live routes port cleanly to libSQL; dormant routes deleted outright |
| G4 | Maintain contract stability for remaining surface | CLI + UI's existing calls return unchanged JSON shapes |
| G5 | Ship basic observability over constructs | View/download counters per pack; sort-by-popularity surface |
| G6 | Execute [[saas-exit-vectors]] doctrine | Promote from candidate to executed instance-1; log doctrine-delta (git-is-code-memory) candidate |

## 4. Users and stakeholders

**Primary user persona**: AI-agent-using developer browsing `constructs.network` to discover and install expert-domain packs into a Loa-based project.

**Secondary user persona**: pack maintainer hosting a `construct-*` repo in `0xHoneyJar` org; the API indexes their work via `/v1/admin/discover`.

**Current user reality**: **pre-launch, no external users.** Fresh start on libSQL costs nothing experientially. No user-communication plan required. Captured as operator-confirmed answer during /simstim clarification.

**Stakeholders**: operator (@zksoju, solo), Jani (async observer; no Jani-pairing required for cycle-012); cycle-011 pre-SEED (Vercel-for-Freeside) remains queued and does not block this cycle.

## 5. Functional requirements

**FR1 · Public registry reads (read-only, anonymous)**
- `GET /v1/constructs` — paginated catalog; query params: `per_page`, `page`, `q` (search), `category`, `sort` (`downloads` | `views` | `updated`), `order`
- `GET /v1/constructs/:slug` — pack detail + embedded skills
- `GET /v1/constructs/summary` — aggregate popularity / trending (top N by view/download count)
- `GET /v1/categories` — list categories for navigation (if UI consumes)
- `GET /v1/packs` — pack-only list (CLI compatibility; may alias `/v1/constructs`)
- `GET /v1/skills` — skill-only list (CLI compatibility)

**FR2 · Observability / stats (anonymous writes)**
- `POST /v1/constructs/:slug/view` — increment `packs.view_count` (204 No Content)
- `POST /v1/constructs/:slug/download` — increment `packs.download_count` (204 No Content)
- **Rate-limiting (per Flatline SKP-004 integration)**: in-memory leaky-bucket per-IP cooldown, no Redis dependency. Default: 10 req/min per IP per slug. Configurable via env. Blocks trivial rank-poisoning + cost-spike vectors without infra burden.

**FR3 · Admin discovery (operational)**
- `POST /v1/admin/discover?owner=<org>&dry_run=<bool>` — triggers `runDiscovery()` which scans `construct-*` repos in the specified GitHub org (default `0xHoneyJar`), upserts into `packs` table
- Auth: operational-token bypass (`Authorization: Bearer cto_<32+ hex>`) via existing `middleware/operational-token.ts`

**FR4 · Health (split per Flatline SKP-003 integration)**
- `GET /v1/health` — **liveness only**; returns 200 if server process is responsive. No DB query.
- `GET /v1/health/ready` — **readiness**; executes a minimal DB query (`SELECT 1` or `SELECT COUNT(*) FROM packs LIMIT 1`). Returns 200 only if DB path is usable. Returns 503 on DB failure.
- **Why**: the root incident (cycle-012 diagnosis, 2026-04-23) was a silent-DB-death + deceptive-200 failure mode. Liveness-only would recreate it. Readiness endpoint forces the DB-path check, catches Supabase-style pauses, Turso token expiry, and network partitions. Load balancers / deploy orchestrators should use readiness for routing decisions; monitors watch both.

**FR7 · SQL-audit inventory (per Flatline SKP-001-codex integration)**
- L-schema-slice produces an artifact at `apps/api/drizzle/.sql-audit.md` enumerating every Postgres-flavored SQL call site that needs rewriting for SQLite/libSQL.
- Columns: `file:line`, `pattern` (ilike / date_trunc / uuid() / jsonb-op / other), `action` (rewrite / delete-with-router / keep-as-is), `dialect-compat` (Y/N).
- Scope transparency: the 229 `sql\`...\`` call sites include many that are portable as-is (basic CTEs, pagination). Inventory surfaces which actually break.
- Inventory is a **review gate**, not a compliance checkbox: reviewer verifies the audit was done before approving L-schema-slice.

**Explicitly NOT in scope (deleted from this cycle)**:
- All auth routes (`/v1/auth/*`, OAuth, Dynamic Labs integration)
- All user-scoped routes (`/v1/users/me`, `/v1/keys`, `/v1/installs`)
- All dormant routers (subscriptions, webhooks, teams, creator, creators, audit, analytics, signals, public-keys, docs)

## 6. Non-functional requirements

| # | Requirement |
|---|---|
| NFR1 | Build + deploy on Railway (existing pipeline); no infra changes required beyond env var swap |
| NFR2 | Zero-downtime migration not required (pre-launch state); brief redeploy flicker acceptable |
| NFR3 | libSQL connection via `@libsql/client` + Drizzle ORM (dialect: turso); matches sprawl-world dashboard precedent |
| NFR4 | Secrets: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` in Railway env (replaces `DATABASE_URL` + `DATABASE_URL_DIRECT`) |
| NFR5 | Observability: existing logger + pino keep format; Sentry unchanged (not configured per env) |
| NFR6 | Testing: unit tests updated; `bun test` green; contract tests for 12 live endpoints maintained |
| NFR7 | **Backup + DR (per Flatline SKP-002 integration)**: scheduled `turso db dump` on a daily cadence, output to git-tracked `apps/api/.backups/` (or S3 if size exceeds reasonable git commit budget). Retention: 7 days rolling. Restore drill documented in `apps/api/docs/disaster-recovery.md` with a break-glass read-only fallback procedure (direct SQLite file open + read path serve). Rationale: doctrine [[saas-exit-vectors]] is explicitly "don't-repeat-the-same-lockout." A new managed dependency without a backup path would invite the same failure mode that motivated this cycle. |

## 7. Dependencies

**External**:
- Turso account + CLI installed (`turso auth login` resolved at L-0 preflight)
- GitHub token for `runDiscovery()` to hit GitHub API (already set in Railway prod)
- `CONSTRUCTS_ADMIN_TOKEN` (already set in Railway prod from 2026-04-23 diagnostic work)

**Internal**:
- `apps/api/src/services/discovery.ts` — existing service, reused post-migration
- `apps/api/src/middleware/operational-token.ts` — existing, reused
- `apps/api/drizzle/` — migrations reset (delete Postgres migrations, generate fresh SQLite)

**Not dependencies** (explicitly):
- Supabase recovery thread (operator handles separately via support email; cycle-012 does not block on it)
- cycle-011 Vercel-for-Freeside (queued separately)
- Jani pairing (none required)

## 8. Risks

| # | Risk | Mitigation |
|---|------|---|
| R1 | Postgres-specific SQL (`ilike`, `date_trunc`, `::date::text`, jsonb operators) breaks on SQLite | Audit `src/services/*.ts`; rewrite 229 sql call sites as needed. Delete analytics.ts (primary date_trunc consumer). |
| R2 | UI has latent calls to dropped endpoints that now 404 | Expected; acceptable pre-launch. Flag breaks during L-ui-smoke; fix in follow-up cycle |
| R3 | Turso free-tier limits exceeded (500 DBs / 9GB) | Far from limits; 1 DB, <100MB expected |
| R4 | Stats endpoints abused without rate-limiting | Defer Redis wiring; log concern. Pre-launch state means abuse cost is near-zero |
| R5 | Orphaned imports after aggressive router delete | `rg` grep verification step in L-route-prune; `bun build` catches breaks |
| R6 | libSQL schema-generation quirks with Drizzle (newer dialect) | Reference sprawl-world dashboard's working setup; fall back to `bun drizzle-kit push` if migration generation errors |

## 9. Non-goals (explicitly out of scope)

- Self-hosted libSQL / `sqld` deployment (deferred to cycle-N+k when Freeside control-plane lands)
- Historical data recovery or import from paused Supabase
- Other THJ Supabase-paused projects
- Auth flow overhaul (Dynamic Labs / SIwTHJ / better-auth)
- Frontend redesign / compositions form factor
- Analytics / metering / billing infra

## 10. Acceptance criteria

(Mirrors SEED §3; abbreviated here. See SEED for full rationale per AC.)

- **AC1**: `GET /v1/constructs` returns ≥20 constructs from libSQL
- **AC2**: Stats surface functional (view/download increments; sort-by-popularity)
- **AC3**: Live-surface endpoint contracts stable (JSON shapes match pre-migration)
- **AC4**: Dormant + auth routes return 404 (not 500)
- **AC5**: Zero Supabase dependency in Railway env or API logs
- **AC6**: Test suite green
- **AC7**: Deploy verified (Railway + Turso dashboard confirmation)
- **AC8**: Doctrine amendments filed to `~/hivemind/wiki/concepts/saas-exit-vectors.md`
- **AC9**: Builder-touch verified — operator loads `constructs.network` in browser, confirms catalog renders

## 11. Doctrine composition (per SEED)

Load-bearing doctrines this cycle executes / affects:
- [[saas-exit-vectors]] — **instance-1 executed** (promotes candidate → executed)
- [[sovereign-stack]] — partial landing (Turso managed, not self-host; full sovereignty deferred)
- [[tool-absence-as-enforcement]] — **instance-2 candidate** (dormant-router deletion)
- [[naming-is-diagnostic]] — schema prune clarifies product shape
- [[constructs-as-packages]] — namespace-IS-registry justifies dropping submission flow
- [[builder-touch-imperative]] — AC9 structurally enforces
- **git-is-code-memory** — **new doctrine-delta candidate** (operator-coined; refines [[resilience-is-remembering]] to distinguish lore-memory from code-memory)
- [[half-done-infrastructure-migration]] — antipattern to avoid; AC1 + AC5 together enforce completion

## 13. Phased delivery (per Flatline SKP-007 integration) — Legs summary

Full leg table lives in SEED §2. Condensed here for PRD-level scope transparency:

| # | Leg | Approx effort | Purpose |
|---|---|---|---|
| L-0 | Preflight | done in dispatch | State verification, branch-cut, sprawl-world pattern check |
| L-schema-slice | Write libSQL schema (~5 tables: packs + counters, skills, categories, discovery_runs) | 2 hrs | New schema, smaller surface |
| L-db-client | Swap Drizzle dialect + driver | 1 hr | `postgres-js` → `@libsql/client` |
| L-route-port | Port live handlers + add stats endpoints (with FR2 rate-limit) + health-split (FR4) | 2-3 hrs | Live surface up on libSQL |
| L-route-prune | Delete outright: auth, keys, subscriptions, webhooks, teams, creator(s), audit, analytics, signals, public-keys, docs | 1-2 hrs | Code deletes per operator git-is-code-memory doctrine |
| L-sql-audit | Produce `.sql-audit.md` inventory (FR7) | 30 min | Review gate for schema leg |
| L-env-wire | Turso provision + Railway env var swap | 30 min | `DATABASE_URL` out, `TURSO_DATABASE_URL/TOKEN` in |
| L-backup-setup | Automated `turso db dump` + DR drill doc (NFR7) | 1 hr | Break-glass read-only fallback verified |
| L-migrate-run | `bun drizzle-kit push` + `POST /v1/admin/discover` | 30 min | libSQL populated |
| L-ui-smoke | Browser check per AC9 | 30 min | Builder-touch |
| L-canon-amend | Doctrine amendments to hivemind | 15 min | saas-exit-vectors instance-1 executed + git-is-code-memory candidate |
| L-close | Findings + KANSEI | 1 hr | Cycle-013 handoff |

**Total estimated**: 10-12 hours focused work. L-schema-slice + L-route-port are sequential-critical; other legs parallelizable.

**Rejected Flatline finding** (logged for transparency): SKP-001-gemini CRITICAL 910 *"template-artifact corruption in API contract"* — hallucinated by tertiary model; grep for `{{DOCUMENT_CONTENT}}` returns zero matches. Rejected with rationale; not integrated.

## 12. Out-of-scope signals for future cycles

Captured from SEED §6 handoff queue:
- When cycle-011 Vercel-for-Freeside lands managed-apply, provision libSQL as an ECS service (zero schema work)
- If Supabase email thread yields `pg_dump`, schedule historical-import sub-cycle
- If builder-touch reveals UX gaps on live registry, seed a FEEL cycle for compositions form factor
- If `[[tool-absence-as-enforcement]]` earns second-instance promotion at cycle-012 close, amend the wiki page
- If `git-is-code-memory` doctrine-delta earns second-instance, promote to [[resilience-is-remembering]] amendment

---

*PRD derived 2026-04-23 from pre-SEED research + operator Q&A via `/simstim` Phase 1. Ready for Flatline Phase 2 review.*
