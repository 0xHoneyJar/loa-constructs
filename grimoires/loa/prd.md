# PRD: Ruggy Structural Alignment — Documentation, Reliability, Consolidation

**Cycle**: cycle-047
**Created**: 2026-03-13
**Status**: Draft
**Foundation**: cycle-044 (signal infrastructure), cycle-045 (Ruggy build), cycle-046 (deployment closeout)
**Context**:
- `grimoires/loa/context/ruggy-structural-alignment.md` (structural alignment plan)
- `grimoires/loa/context/ruggy-signal-architecture.md` (architecture reference)
- `grimoires/loa/context/prd-cycle-044-signals.md` (original signal PRD)

---

## 1. Problem Statement

Ruggy's signal pipeline is deployed and verified (LAB-915 in Linear, all 6 fan-out PRs merged). But three categories of structural debt surfaced during deployment closeout:

1. **Documentation fiction**: `ruggy-ecosystem-intelligence.md` describes a "Dixie fork" with Hono/PostgreSQL/Redis/incur/cheval — none of which were built. The actual implementation is a Convex-native pipeline. The Convex README is generic boilerplate. New contributors or future sessions will build on false assumptions.

2. **Missing visibility**: The signals dashboard exists at `/dashboard/signals` with 7 fully-built components, but there's no link to it from the dashboard overview. Admin users have no way to discover it without a direct URL.

3. **Reliability gaps**: 14 architectural findings from the deployment audit — 4 HIGH severity affecting signal lifecycle (infinite retry loops, silently swallowed escalation failures, silent no-op on missing Linear env vars, missing database indexes).

The pipeline works end-to-end today, but these gaps mean: (a) a failed classification retries forever with no terminal state, (b) a failed Linear escalation looks identical to a successful one, (c) removing `LINEAR_API_KEY` silently drops all escalations with no alert, and (d) sovereignty recalculation will degrade to full table scans as volume grows.

> Sources: `ruggy-structural-alignment.md`, deployment audit findings (this session)

---

## 2. Goals & Success Metrics

### Primary Goal

Align documentation with reality, surface the signals dashboard to admin users, and close the 4 highest-severity reliability gaps in the signal pipeline.

### Success Criteria

| Metric | Target | Verification |
|--------|--------|--------------|
| Documentation accuracy | Zero Dixie references in `ruggy-ecosystem-intelligence.md` | Manual read |
| Dashboard discoverability | "Signals" QuickLink visible on `/dashboard` for admin users | Visual check |
| Convex README relevance | Describes actual signal pipeline, not generic tutorial | Manual read |
| Classification terminal state | Signals fail after 3 attempts → `classification_failed` status | Send malformed signal, check Convex DB after 3 cron cycles |
| Escalation failure visibility | Failed Linear calls → `escalationStatus: "failed"` | Simulate Linear API failure |
| Missing env var detection | Missing `LINEAR_API_KEY` throws error (not silent return) | Remove env var, send HIGH signal |
| Override query performance | `by_appSlug_createdAt` index used in sovereignty recalculation | Check Convex query plan |

### Non-Goals (Deferred)

- construct-ruggy Railway deployment (blocked on `FINN_URL` / loa-finn)
- Historical feedback migration from Supabase (~155 rows)
- Discord slash command bot
- Shared auth helper extraction (Phase 3 — lower priority)
- Circuit breaker persistence (Phase 3)

---

## 3. User & Stakeholder Context

### Primary Persona: Ecosystem Operator (@janitooor)

- Maintains all 6 product repos + constructs network infrastructure
- Needs: signals dashboard discoverable from main dashboard, accurate documentation for context in future sessions, confidence that pipeline failures surface visibly
- Current pain: dashboard exists but requires direct URL, documentation describes architecture that was never built, no way to know if Linear escalation silently failed

> Sources: user interview (this session), cycle-046 deployment observations

---

## 4. Functional Requirements

### Phase 1: Documentation & Visibility (No code behavior changes)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| P1-1 | Add Signals QuickLink to dashboard overview | `<QuickLink href="/dashboard/signals" label="Signals" />` visible in admin grid at `/dashboard` |
| P1-2 | Rewrite `ruggy-ecosystem-intelligence.md` | Zero Dixie references. Describes Convex-native pipeline with 6 repos, correct API path (`constructs.network/api/signals`), correct stack (Convex + Haiku 4.5 direct). Preserves: metrics, sovereignty model, identity, phase 2 roadmap. |
| P1-3 | Replace Convex README boilerplate | Describes actual signal pipeline functions, cron jobs, schema tables, env vars. Not generic Convex tutorial. |

### Phase 2: HIGH Reliability Fixes (4 items)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| P2-1 | Classification retry cap | `classificationAttempts` counter increments per try. After 3 failures → `status: "classification_failed"`. `retry-classification` cron filters `classificationAttempts < 3`. Schema: add `classificationAttempts` optional number field. |
| P2-2 | Escalation failure visibility | Failed Linear call in `sovereigntyGatedEscalate` → `escalationStatus: "failed"` (not `"escalated"`). `check-linear-failures` cron (15m) picks up for retry. |
| P2-3 | Linear env var missing detection | Missing `LINEAR_API_KEY` in `createLinearIssue` throws descriptive error (not silent return). Surfaces in Convex function logs. |
| P2-4 | Override query index | Add `by_appSlug_createdAt` index on override table in `schema.ts`. Sovereignty recalculation queries use `.withIndex()`. |

### Phase 3: MEDIUM/LOW Consolidation (6 items)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| P3-1 | Extract shared auth helper | Key cache + SHA256 validation extracted to `apps/explorer/lib/signals/auth.ts` |
| P3-2 | Shared Zod validator | Single canonical schema between route (Zod) and Convex (validators). No duplication. |
| P3-3 | Circuit breaker persistence | `circuitBreakerState` field on sovereignty table. Survives Convex cold starts. |
| P3-4 | Heartbeat cron offset | `heartbeat` and `heartbeat-check` staggered by 30m. No simultaneous execution. |
| P3-5 | statusCounts safety bound | Dashboard `statusCounts` query adds `.take(10000)` safety cap. |
| P3-6 | Sovereignty initialization upsert | First signal from new app creates sovereignty tier with upsert logic. No race condition on simultaneous signals. |

> Sources: `ruggy-structural-alignment.md` (14 findings)

---

## 5. Technical & Non-Functional Requirements

### Architecture Constraints

| Constraint | Rationale |
|-----------|-----------|
| Schema changes require `npx convex deploy` to both dev and prod | Convex schema is server-side; changes must be pushed |
| `classificationAttempts` must be optional (backward compatible) | Existing signals in DB have no field; optional with default 0 |
| Override index must match existing query pattern | Index field order must match `.withIndex()` call |
| No breaking changes to `/api/signals` contract | 6 product repos already sending signals; route interface is frozen |

### Files Modified

| File | Changes | Risk |
|------|---------|------|
| `apps/explorer/app/(dashboard)/dashboard/page.tsx` | Add QuickLink | Low — additive UI |
| `grimoires/loa/context/ruggy-ecosystem-intelligence.md` | Full rewrite | None — documentation only |
| `apps/explorer/convex/README.md` | Full rewrite | None — documentation only |
| `apps/explorer/convex/signals.ts` | Classify retry cap, escalation error handling, statusCounts bound, sovereignty race | Medium — core pipeline logic |
| `apps/explorer/convex/linear.ts` | Throw on missing env var | Medium — changes failure mode |
| `apps/explorer/convex/schema.ts` | New field + new index | Medium — schema migration |
| `apps/explorer/convex/crons.ts` | Heartbeat offset | Low — timing only |

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Schema push fails (classificationAttempts) | New field not available | Field is optional; existing signals unaffected. Retry push. |
| Linear env var throw breaks existing flow | Escalation pipeline errors instead of silent skip | `check-linear-failures` cron (15m) retries. Better than silent data loss. |
| Index migration on large table | Slow Convex schema push | Override table is small (<100 rows); negligible. |

---

## 6. Scope & Prioritization

### In Scope (this cycle)

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1 | Documentation + dashboard visibility | Small (3 files, no behavior changes) |
| Phase 2 | 4 HIGH reliability fixes | Medium (core pipeline logic + schema) |
| Phase 3 | 6 MEDIUM/LOW consolidation items | Medium (refactoring + schema) |

### Explicitly Out of Scope

| Item | Reason |
|------|--------|
| construct-ruggy Railway deployment | Blocked on FINN_URL (loa-finn doesn't exist) |
| Historical feedback migration | Separate micro-cycle (~155 Supabase rows) |
| New fan-out integrations | All 6 repos already wired |
| Discord slash command bot | Phase 2 roadmap (not blocking triage) |
| Sentry integration | Separate infrastructure decision |

### MVP Definition

**Phase 1 + Phase 2 is the MVP.** Documentation accuracy and the 4 HIGH reliability fixes are the minimum viable delivery. Phase 3 consolidation is valuable but not blocking.

---

## 7. Risks & Dependencies

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Convex schema push fails | Low | Schema changes not applied | Retry; fields are optional/additive |
| `createLinearIssue` throw cascades | Medium | Escalation pipeline surfaces errors | Existing `check-linear-failures` cron retries at 15m intervals |
| Classification retry counter race | Low | Counter incremented twice for same attempt | Convex mutations are serialized per document |

### External Dependencies

| Dependency | Type | Risk Level |
|-----------|------|------------|
| Convex dashboard (schema push) | Deployment | Low — well-understood flow |
| Convex prod deployment (`quaint-anaconda-866`) | Deployment | Low — deployed multiple times in cycle-046 |
| Vercel redeploy (explorer) | Deployment | Low — automatic on merge to main |
