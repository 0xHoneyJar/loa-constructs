# Sprint Plan — constructs-api sovereign-landing (cycle-012)

**Cycle**: cycle-012 · constructs-api libSQL migration + surface prune
**Date**: 2026-04-23
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**SEED**: `grimoires/loa-constructs-seed-2026-04-21/cycle-012-SEED-constructs-api-libsql-migration.md`
**Branch**: `feat/spiral-loa-constructs-cycle-012-api-libsql-migration` (cut at L-0 per SEED §5)
**Dispatch**: `/simstim` → Phase 7 handoff to `/run sprint-plan`
**Supersedes at this path**: prior cycle-050 SprawlOS Design System sprint (2026-03-13)

---

## Sprint 1 — constructs-api libSQL migration + surface prune

Single sprint; legs run sequentially with parallelization where SDD §2.x tables are independent.

### T1.1 · Preflight + branch setup
**Estimated effort**: 30 min · **Priority**: CERTAIN · **Dependencies**: none

**Description**: Verify cycle-010 branch state, cut cycle-012 branch from `main` (parallel, per SEED §5 gate resolution). Verify Turso CLI + auth + GitHub token. Confirm operational token (`CONSTRUCTS_ADMIN_TOKEN`) present in Railway prod.

**Acceptance criteria**:
- `git branch --show-current` returns `feat/spiral-loa-constructs-cycle-012-api-libsql-migration`
- `turso auth whoami` succeeds
- `railway variables --kv | grep -c CONSTRUCTS_ADMIN_TOKEN` equals 1 (presence-check only, NOT the value)
- `railway variables --kv | grep -c GITHUB_TOKEN` equals 1 (presence-check only)

**Verification**: text output of presence checks in PR description. **SECURITY (per Flatline SKP-005 integration)**: do NOT paste raw `railway variables` output; use `grep -c` (count only) or manual redaction. Review PR for accidental secret inclusion before merge.

---

### T1.2 · Schema slice (libSQL-flavored Drizzle)
**Estimated effort**: 2 hrs · **Priority**: CERTAIN · **Dependencies**: T1.1

**Description**: Rewrite `apps/api/src/db/schema.ts` from Postgres to libSQL per SDD §2. 5 tables: packs (+ view_count/download_count), skills, categories, discovery_runs (+ audit fields per SDD §6.1.1), plus optional stats_events escape-hatch (default: skip). Apply Postgres→SQLite type mappings per SDD §5.1.

**Acceptance criteria**:
- File compiles under `bun build apps/api`
- `bun drizzle-kit generate` succeeds and emits migration SQL
- Schema declares 5 tables (or 4 + optional stats_events)
- No `pgTable`, `pgEnum`, `jsonb`, `uuid()` (Postgres-specific) in schema.ts
- discovery_runs has triggered_by_fingerprint + triggered_by_ip + triggered_by_user_agent columns
- CHECK constraints declared for enum fields (visibility, maturity, source_type, etc.)

**Verification**: `bun drizzle-kit generate` output + diff of schema.ts

---

### T1.3 · SQL audit inventory (per PRD FR7)
**Estimated effort**: 30 min · **Priority**: CERTAIN · **Dependencies**: T1.2 (schema done)

**Description**: Grep all `sql\`...\`` call sites in `apps/api/src/services/`. Produce `apps/api/drizzle/.sql-audit.md` with: file:line, pattern type, action (rewrite/delete-with-router/keep), dialect-compat (Y/N). Scope clarification per Flatline SKP-001-codex integration.

**Acceptance criteria**:
- `.sql-audit.md` exists, lists all 229 call sites (or actual count)
- Each entry classified (ilike / date_trunc / uuid() / jsonb-op / keep-as-is / delete)
- Summary at top: N total, M breaking, K deleted-with-prune, P keep-as-is
- Cross-reference to SDD §5.1 translation rules

**Verification**: audit file committed to repo

---

### T1.4 · DB client swap (Drizzle config + driver)
**Estimated effort**: 1 hr · **Priority**: CERTAIN · **Dependencies**: T1.2

**Description**: Change `drizzle.config.ts` dialect from `postgresql` to `turso`. Swap `src/db/index.ts` driver from `postgres-js` to `@libsql/client`. Install `@libsql/client`, remove `postgres` from package.json. Update `.env.example` with `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (local: `file:./local.db`).

**Acceptance criteria**:
- `apps/api/package.json` has `@libsql/client`, does not have `postgres`
- `drizzle.config.ts` dialect is `turso`
- `src/db/index.ts` imports from `@libsql/client` + uses `drizzle-orm/libsql`
- `.env.example` has libSQL env vars only (no DATABASE_URL)
- `bun install` clean; `bun build apps/api` compiles

**Verification**: package.json diff + build output

---

### T1.5 · Route port (live surface handlers)
**Estimated effort**: 2–3 hrs · **Priority**: CERTAIN · **Dependencies**: T1.2, T1.3, T1.4

**Description**: Port handlers for live surface per PRD §5 FR1-4: constructs, packs, skills, categories (if kept), admin/discover, health, health/ready. Fix Postgres-isms per SDD §5.1 and audit inventory. Add new routes per PRD FR2: view/download increment with rate-limit middleware. Split health into liveness + readiness per SDD §3.4.

**Acceptance criteria**:
- Each live endpoint returns HTTP 200 (or documented error) when exercised against dev `file:./local.db`
- Contract tests pass (JSON shape stability vs pre-migration golden files)
- Rate-limit middleware engages (rejects 11th req/min with 429)
- Readiness endpoint executes SELECT 1; 503s if DB unreachable
- Trust-IP middleware rejects client-supplied X-Real-IP (only Railway edge trusted); **negative tests (per Flatline SKP-006 integration) for spoofed X-Forwarded-For / X-Real-IP in code paths — client-supplied values from non-proxy source are discarded**
- Atomic counter increments verified via **concurrent-write test at N=100 (per Flatline SKP-004 integration)**: 100 parallel POST /view requests assert final `view_count == 100` and zero SQLITE_BUSY errors; if SQLITE_BUSY observed, add retry-with-backoff middleware (`BEGIN IMMEDIATE` + exponential retry ≤5 attempts)

**Verification**: unit tests green; curl smoke test output

---

### T1.6 · Route prune (delete outright)
**Estimated effort**: 1–2 hrs · **Priority**: CERTAIN · **Dependencies**: T1.5 (live surface working, so prune doesn't break operability)

**Description**: Delete outright per operator doctrine-clarification (git-is-code-memory, SEED §4.1). Files: routes/auth*.ts, keys.ts, users.ts (if exists), installs.ts (if exists), subscriptions.ts, webhooks.ts, teams.ts, creator.ts, creators.ts, audit.ts, analytics.ts, signals.ts, public-keys.ts, docs.ts. Services: matching orphaned services + helpers. Remove registrations from `app.ts`.

**Acceptance criteria**:
- `rg "import.*\\b(auth|users|api_keys|installs|subscriptions|webhooks|teams|creator|analytics|audit|signals)\\b" apps/api/src` → zero matches
- `bun build apps/api` → no import errors
- `curl https://api.constructs.network/v1/auth/login` (post-deploy) → 404
- All deleted files genuinely removed (not commented out); `git log --stat` shows deletion
- `bun test` passes (deleted-route tests removed)

**Verification**: grep output + build log + curl

---

### T1.7 · Turso provision + env wire
**Estimated effort**: 30 min · **Priority**: CERTAIN · **Dependencies**: T1.4

**Description**: Provision production Turso DB (`turso db create loa-constructs-prod`). Obtain URL + auth token. Set Railway env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Unset `DATABASE_URL` and `DATABASE_URL_DIRECT`. Create `apps/api/docs/deployment.md` documenting single-instance constraint (SDD §6.2.1).

**Acceptance criteria**:
- `turso db list` shows `loa-constructs-prod`
- `railway variables --kv | grep -c TURSO_DATABASE_URL` equals 1 (presence-check; no secret paste)
- `railway variables --kv | grep -c DATABASE_URL` equals 0 (Postgres vars removed)
- `deployment.md` exists with single-instance constraint + escalation path + scale-ceiling threshold (suggest: alert at >50% Railway plan's CPU/memory for 5 consecutive minutes as early-warning)
- **Railway replicas=1 guard (per Flatline SKP-003 integration)**: add `.github/workflows/replicas-guard.yml` that fails CI if Railway service config has replicas > 1 (query via Railway API). If Railway API doesn't support this check, document the constraint in deployment.md as an operator-enforced invariant.

**Verification**: Railway service config screenshot (with secrets redacted) + turso db list output

---

### T1.8 · Dev-rehearsal migration (per SDD §5.2)
**Estimated effort**: 30 min · **Priority**: CERTAIN · **Dependencies**: T1.5, T1.6 complete; T1.7 optional (can rehearse against file:./local.db first)

**Description**: Run migration against dev `file:./local.db`. Seed via `POST /v1/admin/discover`. Spot-check all live endpoints. Concurrent-counter test. If any bug surfaces, fix before T1.9.

**Acceptance criteria**:
- Dev DB has ≥20 constructs after discover
- All contract tests green against dev DB
- No ilike-fall-through, no date-handling bugs, no null-semantics surprises

**Verification**: test suite output + curl smoke against local

---

### T1.9 · Prod cutover (with go/no-go gate + rollback runbook)
**Estimated effort**: 45 min (cutover) + 30 min (runbook authorship) · **Priority**: CERTAIN · **Dependencies**: T1.7, T1.8

**Description**: Against Turso prod DB: run `bun drizzle-kit push` or emit+apply migration. Deploy Railway. Call `POST /v1/admin/discover` with operational-token to populate packs. Verify `/v1/constructs` returns real data.

**Pre-cutover go/no-go gate (per Flatline SKP-001 integration — scope de-risking)**:

Before executing cutover, operator evaluates:
- [ ] T1.8 dev-rehearsal passed without surprises
- [ ] Contract tests green against dev `file:./local.db`
- [ ] Route prune complete (T1.6) — no stale imports
- [ ] Rollback runbook authored (see below) + read-through
- [ ] No unresolved Flatline or CI issues
- [ ] Operator has ~1 hour contiguous time for cutover + verification

If any box unchecked: defer cutover to next session. Do not cut over under time pressure.

**Rollback runbook (per Flatline SKP-002 integration — required artifact)**:

Author `apps/api/docs/rollback-runbook.md` BEFORE T1.9 execution. Contents:

1. **Trigger conditions**: HTTP 5xx rate >5% within 10 minutes post-deploy; OR zero constructs visible at `/v1/constructs`; OR Railway build failure post-migration
2. **Rollback procedure**:
   - `railway variables --unset TURSO_DATABASE_URL TURSO_AUTH_TOKEN`
   - `railway variables --set DATABASE_URL=<paused-supabase-url>` (from `.env.railway` local copy; note: Supabase still paused — rollback yields 5xx DB errors, but state is "known failed" rather than "unknown failed")
   - `git revert HEAD --no-edit && git push` (reverts schema + driver commits)
   - Railway auto-redeploys
   - Verify revert via `/v1/health` HTTP 200 + `/v1/constructs` returns fallback empty (existing masked-error behavior) rather than 5xx
3. **RTO target**: <15 minutes from trigger to rollback complete
4. **RPO**: N/A (no data to lose; fresh start on libSQL means there's nothing on Turso that wasn't reproducible)
5. **Post-rollback investigation**: dev-rehearse the fix against `file:./local.db`; re-attempt cutover only after fix validated

**Acceptance criteria**:
- `turso db shell loa-constructs-prod ".schema"` shows new schema
- `POST /v1/admin/discover` returns `{constructs_created: N}` where N ≥ 20
- `curl https://api.constructs.network/v1/constructs | jq '.data | length'` ≥ 20
- No PostgresError in Railway logs post-deploy
- `apps/api/docs/rollback-runbook.md` committed before cutover execution

**Verification**: Railway logs + Turso dashboard + curl output + rollback-runbook.md present

---

### T1.10 · Backup + DR setup (per NFR7)
**Estimated effort**: 1 hr · **Priority**: CERTAIN · **Dependencies**: T1.9

**Description**: Set up daily `turso db dump` cron (GitHub Action preferred). Upload to R2/S3 bucket (0xhoneyjar-backups) with encryption + retention. Create `apps/api/docs/disaster-recovery.md` with restore drill procedure. Create `apps/api/.backups/MANIFEST.md` (git-tracked; backup metadata only, no dumps). Create `apps/api/docs/admin-token-rotation.md`.

**Acceptance criteria**:
- `.github/workflows/backup.yml` exists and runs on schedule
- First backup appears in R2 bucket
- DR doc exists with step-by-step restore procedure
- MANIFEST.md references R2 path (no dumps committed)
- Token rotation doc exists

**Verification**: GitHub Action run log + R2 bucket listing

---

### T1.11 · UI smoke (builder-touch per AC9)
**Estimated effort**: 30 min · **Priority**: CERTAIN · **Dependencies**: T1.9

**Description**: Operator loads `https://constructs.network` in real browser. Validates: catalog renders ≥20 constructs, detail pages load, sort-by-popularity works. Flags any auth-related 404 breaks (expected pre-launch). [[builder-touch-imperative]].

**Acceptance criteria**:
- Home page shows constructs list with real data
- At least one detail page loads successfully
- Sort by downloads query parameter reflects in UI (if wired)
- Operator confirms no blocking UI regressions

**Verification**: operator screenshot / confirmation comment

---

### T1.12 · Doctrine canon amendment
**Estimated effort**: 15 min · **Priority**: CERTAIN · **Dependencies**: T1.11 (completion implied)

**Description**: Amend `~/hivemind/wiki/concepts/saas-exit-vectors.md` — instance-1 updated to "executed." Append completion note to `~/hivemind/sessions/2026-04-23-supabase-billing-hold-recovery.md`. File new doctrine-delta candidate `~/hivemind/wiki/concepts/git-is-code-memory.md` per SEED §4.1.

**Acceptance criteria**:
- saas-exit-vectors.md has executed-instance-1 note
- session file has completion appendix
- git-is-code-memory.md exists with operator quote + table of artifact-type vs deletion-semantics

**Verification**: git diff of hivemind/ files

---

### T1.13 · L-close: findings, KANSEI, cycle-013 handoff
**Estimated effort**: 1 hr · **Priority**: CERTAIN · **Dependencies**: T1.12

**Description**: Write cycle-012 findings doc at `grimoires/loa-constructs-seed-2026-04-21/cycle-012-findings.md` (F-numbers continue from F49 cycle-010 last). Ask KANSEI questions (SEED §7). Queue cycle-013 items per SEED §6 handoff.

**Acceptance criteria**:
- findings.md exists with F50+ entries
- KANSEI questions asked (SEED Q1-Q6 covered)
- Cycle-013 queue in findings handoff section

**Verification**: findings doc committed

---

## Cross-sprint acceptance (tied to PRD AC1-AC9)

- **AC1** (registry visibility): verified in T1.9 + T1.11
- **AC2** (stats surface): verified in T1.5 (rate-limit + atomic counters) + T1.11 (sort)
- **AC3** (contract stability): verified in T1.5 contract tests
- **AC4** (dormant routes 404): verified in T1.6 post-deploy curl
- **AC5** (zero Supabase dep): verified in T1.7 env state + T1.9 log check
- **AC6** (test suite green): verified in T1.5, T1.6, T1.8
- **AC7** (deploy verified): verified in T1.9
- **AC8** (doctrine amendments): verified in T1.12
- **AC9** (builder-touch): verified in T1.11

## Dependency graph

```
T1.1 (preflight)
  │
  ├──► T1.2 (schema) ──► T1.3 (audit) ──┐
  │     │                                │
  │     └──► T1.4 (client swap)         │
  │           │                          │
  │           └──► T1.5 (route port) ◄──┘
  │                 │
  │                 └──► T1.6 (prune) ──► T1.8 (rehearsal) ──► T1.9 (cutover)
  │                                                              │
  │                                                              ├──► T1.10 (backup)
  │                                                              ├──► T1.11 (ui smoke) ──► T1.12 (canon) ──► T1.13 (close)
  │                                                              │
  └──► T1.7 (turso provision) ─────────────────────────────────┘
```

Critical path: T1.1 → T1.2 → T1.4 → T1.5 → T1.6 → T1.8 → T1.9 → T1.11 → T1.12 → T1.13 (≈10 hrs total).
Parallelizable: T1.3 (audit) + T1.7 (Turso provision) can run off main critical path.

## Estimated sprint total

**~12 hrs focused work** (revised up from 10 hrs per Flatline SKP-001 integration — 20% buffer for dialect-migration complexity + rollback-runbook authorship + concurrent-counter load test + Railway replicas-guard setup).

Buffer rationale:
- Real dialect-migration work (T1.2 + T1.3 + T1.5) has known unknowns (libSQL quirks, SQLite transaction semantics per SDD §5.1 translation table)
- T1.9 gained 45 min for rollback runbook authorship
- T1.5 gained 15 min for N=100 concurrent counter test + retry middleware
- T1.7 gained 15 min for Railway replicas-guard CI workflow

Failure of go/no-go gate at T1.9 defers the cutover without scope creep on the pre-cutover legs. The sprint re-opens with T1.9 only.

**Not re-baselined into multiple sprints**: scope is narrowed sufficiently (post-auth-drop, 5 tables, ~12 endpoints) that one sprint remains appropriate. The go/no-go gate is the safety valve.

## Verification criteria per sprint

Sprint 1 is verified when all AC1-AC9 pass AND all T1.x tasks' acceptance criteria met. Failure of any AC triggers re-open + bug-file.

---

**Flatline SPRINT review (Phase 6, 2026-04-23)**:
- 6 blockers integrated:
  - SKP-001 CRITICAL 930 (scope estimate): +20% buffer (10h → 12h), go/no-go gate at T1.9
  - SKP-002 CRITICAL 885 (rollback runbook): T1.9 requires rollback-runbook.md before cutover
  - SKP-003 HIGH 750 (single-instance monitoring): T1.7 Railway replicas-guard CI workflow + scale-ceiling alert
  - SKP-004 HIGH 720 (libSQL transaction semantics): T1.5 N=100 concurrent counter test + SQLITE_BUSY retry
  - SKP-005 HIGH 740 (secret leakage): T1.1 + T1.7 presence-checks only, no raw railway variables paste
  - SKP-006 HIGH 705 (trust-IP): T1.5 negative tests for spoofed X-Forwarded-For
- 0 findings rejected

Sprint ready for Phase 7 (Implementation via /run sprint-plan).
