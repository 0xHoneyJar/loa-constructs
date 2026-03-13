# Sprint Plan: Ruggy Structural Alignment

**Cycle**: cycle-047
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Created**: 2026-03-13

---

## Sprint 1: Documentation & Dashboard Visibility

**Goal**: Align all documentation with reality and make signals dashboard discoverable.

| Task | File | Description | Est |
|------|------|-------------|-----|
| T1.1 | `apps/explorer/app/(dashboard)/dashboard/page.tsx` | Add `<QuickLink href="/dashboard/signals" label="Signals" />` to admin grid | 5m |
| T1.2 | `grimoires/loa/context/ruggy-ecosystem-intelligence.md` | Full rewrite — remove Dixie fiction, describe actual Convex pipeline | 20m |
| T1.3 | `apps/explorer/convex/README.md` | Replace boilerplate with signal pipeline reference | 15m |

**Acceptance**: `/dashboard` shows Signals link for admin. `ruggy-ecosystem-intelligence.md` has zero Dixie references. `convex/README.md` describes actual functions.

**Gate**: No code behavior changes. Commit and deploy.

---

## Sprint 2: HIGH Reliability Fixes

**Goal**: Close the 4 highest-severity gaps — classification terminal state, escalation failure visibility, Linear env var detection, override query verification.

| Task | File | Description | Est |
|------|------|-------------|-----|
| T2.1 | `apps/explorer/convex/signals.ts` | Classification terminal state: set `status: "classification_failed"` when `classificationAttempts >= 3`. Update `patchClassificationAttempt` mutation to accept optional `status` param. Apply in both catch block and missing-API-key path. | 30m |
| T2.2 | `apps/explorer/convex/linear.ts` | Throw on missing `LINEAR_API_KEY` and `LINEAR_TEAM_*` instead of silent return. `console.error` with descriptive message before throw. | 15m |
| T2.3 | `apps/explorer/convex/signals.ts` | Verify `recalculateSovereignty` uses `.withIndex("by_app")` for override rate calculation. Fix if using filter/collect instead. | 15m |
| T2.4 | `apps/explorer/convex/signals.ts` | Verify escalation status flow — ensure signal is not marked `escalated` before Linear call confirms success. Fix if status is set prematurely. | 20m |

**Acceptance**: Signal at 3 failed classifications → `classification_failed` status. Missing `LINEAR_API_KEY` → error in Convex logs (not silent). Override query uses index.

**Gate**: Deploy Convex functions to prod. E2E test with curl.

---

## Sprint 3: Consolidation

**Goal**: Close MEDIUM/LOW findings — circuit breaker persistence, cron timing, safety bounds, race conditions.

| Task | File | Description | Est |
|------|------|-------------|-----|
| T3.1 | `apps/explorer/convex/signals.ts` | `statusCounts` — add `.take(10000)` safety bound on each status query. Fix dead `resolved`/`dismissed` counts. | 15m |
| T3.2 | `apps/explorer/convex/signals.ts` | Sovereignty initialization — add upsert pattern for first-signal-from-new-app tier creation. | 15m |
| T3.3 | `apps/explorer/convex/crons.ts` | Change `heartbeat-check` interval from 1 hour to 2 hours to avoid collision with `heartbeat`. | 5m |
| T3.4 | `apps/explorer/convex/schema.ts` + `signals.ts` | Add typed circuit breaker fields (`circuitBreakerTripped`, `consecutiveFailures`) to `sovereigntyState`. Update `isCircuitBroken`/`tripCircuitBreaker` to use typed fields. | 30m |
| T3.5 | `apps/explorer/lib/signals/auth.ts` + `route.ts` | Extract auth helper — move key cache + SHA256 validation from route handler to shared module. | 20m |
| T3.6 | `apps/explorer/lib/signals/validation.ts` + `convex/signals.ts` | Add cross-reference comments between Zod and Convex validators. | 5m |

**Acceptance**: statusCounts has safety bound. New app sovereignty tier creation is idempotent. Circuit breaker uses typed fields. Auth helper extracted and route handler simplified.

**Gate**: Deploy Convex schema + functions to prod. Verify heartbeat crons show different intervals.

---

## Sprint Summary

| Sprint | Tasks | Focus | Risk |
|--------|-------|-------|------|
| 1 | 3 | Documentation + visibility | Low |
| 2 | 4 | HIGH reliability fixes | Medium |
| 3 | 6 | MEDIUM/LOW consolidation | Medium |

**Total estimated**: ~3.5 hours of implementation across 13 tasks.

**MVP gate**: Sprint 1 + Sprint 2. Sprint 3 is valuable but can be deferred.
