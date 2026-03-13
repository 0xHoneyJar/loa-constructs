# SDD: Ruggy Structural Alignment

**Cycle**: cycle-047
**PRD**: grimoires/loa/prd.md
**Created**: 2026-03-13
**Status**: Draft

---

## 1. Architecture Overview

No new systems or services. All changes are within the existing Convex signal pipeline (`apps/explorer/convex/`) and the explorer Next.js app. The architecture remains:

```
Product repos → POST /api/signals (Vercel) → Convex ingest → Haiku classify → sovereignty gate → Linear/Discord
```

This cycle addresses structural debt: documentation accuracy, dashboard visibility, and reliability gaps in error handling and failure recovery paths.

---

## 2. Phase 1: Documentation & Visibility

### 2.1 Dashboard QuickLink

**File**: `apps/explorer/app/(dashboard)/dashboard/page.tsx`

Add `Signals` QuickLink inside the existing admin grid (lines 54-59, `isAdmin && (...)` block). Follows the existing `QuickLink` component pattern already used for API Keys, Graph, and Metrics.

```tsx
// Inside the admin grid, after existing StatCards
<QuickLink href="/dashboard/signals" label="Signals" />
```

No new components. No new routes. The `/dashboard/signals` page already exists with 7 components.

### 2.2 Rewrite `ruggy-ecosystem-intelligence.md`

**File**: `grimoires/loa/context/ruggy-ecosystem-intelligence.md`

Full rewrite. Current doc claims Dixie fork with Hono/PostgreSQL/Redis/incur/cheval — none built. Replace with:
- Actual stack: Convex-native pipeline, Claude Haiku 4.5 direct, 6 repos
- Correct API path: `constructs.network/api/signals` (not `api.constructs.network/v1/signals`)
- Preserve: metrics table, sovereignty model, identity section, phase 2 roadmap
- Reference: `ruggy-signal-architecture.md` for Mermaid diagrams (already accurate)

### 2.3 Replace Convex README

**File**: `apps/explorer/convex/README.md`

Replace 91-line generic Convex tutorial with project-specific reference covering:
- Signal pipeline functions (ingest, classify, escalate, alertDiscord)
- Cron jobs (8 total: presence cleanup, retry-classification, reconcile-linear, purge-expired, heartbeat, heartbeat-check, recalculate-sovereignty, check-linear-failures)
- Schema tables (signals, signalKeys, signalRateLimits, sovereigntyState, dashboardPresence)
- Required env vars (ANTHROPIC_API_KEY, CONVEX_WRITE_KEY, LINEAR_API_KEY, LINEAR_TEAM_PRODUCT, LINEAR_TEAM_INFRASTRUCTURE, DISCORD_SIGNALS_WEBHOOK_URL)

---

## 3. Phase 2: HIGH Reliability Fixes

### 3.1 Classification Terminal State (P2-1)

**File**: `apps/explorer/convex/signals.ts`

**Current behavior** (lines 322-434): `classify` action already increments `classificationAttempts` and guards at `>= 3`. But signals reaching 3 attempts stay at `status: "new"` forever — the `retryFailedClassifications` cron (lines 953-977) silently excludes them. No terminal status, no alerting, no manual re-queue path.

**Change**: After incrementing `classificationAttempts` to 3 in the catch block, also set `status: "classification_failed"`.

```typescript
// In classify action catch block, after incrementing classificationAttempts:
const newAttempts = (signal.classificationAttempts ?? 0) + 1;
await ctx.runMutation(internal.signals.patchClassificationAttempt, {
  signalId: args.signalId,
  attempts: newAttempts,
  // NEW: set terminal status when max retries reached
  ...(newAttempts >= 3 ? { status: 'classification_failed' } : {}),
});
```

**Also**: Same treatment for the missing-API-key early return path (currently increments attempts silently).

**Schema note**: `classificationAttempts` already exists as a required number field. `status` is a plain string — no enum constraint. Adding `"classification_failed"` as a value requires no schema change.

**Affected functions**: `patchClassificationAttempt` mutation needs a `status` parameter (currently only patches `classificationAttempts`).

### 3.2 Escalation Failure Visibility (P2-2)

**File**: `apps/explorer/convex/signals.ts` (lines 1139-1180)

**Current behavior**: `sovereigntyGatedEscalate` schedules `internal.linear.createLinearIssue` via `ctx.scheduler.runAfter(0, ...)`. This is fire-and-forget — if `createLinearIssue` fails, the caller never knows.

**Problem refinement**: The issue isn't in `sovereigntyGatedEscalate` itself (it just schedules) — it's in `createLinearIssue` (linear.ts lines 37-88). On failure, it increments `linearCreationAttempts` but does NOT update the signal's status. The signal may have been set to `escalated` before the Linear call actually succeeded.

**Change in `linear.ts`**: On catch, set `escalationStatus` or equivalent field to indicate failure. Since the schema doesn't have an `escalationStatus` field, use the existing `status` field:
- On successful Linear issue creation: status stays as-is (set by caller)
- On failed Linear creation: leave status unchanged (don't mark as escalated). The `checkLinearFailures` cron (every 15m) already detects signals with `linearCreationAttempts > 0` and no `linearIssueId`.

**Actual fix**: In `sovereigntyGatedEscalate`, do NOT update signal status to `escalated` before scheduling `createLinearIssue`. Instead, let `createLinearIssue` update status to `escalated` only on success. Current flow unclear — need to verify whether status is set before or after the schedule call.

### 3.3 Linear Env Var Detection (P2-3)

**File**: `apps/explorer/convex/linear.ts` (line ~45)

**Current behavior**: `if (!apiKey) return;` — silent no-op. All signals that should escalate silently vanish. Same for missing `LINEAR_TEAM_*` env vars.

**Change**:
```typescript
const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error('[linear] LINEAR_API_KEY is not set — cannot create issues. Signal will be retried by check-linear-failures cron.');
  throw new Error('LINEAR_API_KEY not configured');
}
```

This surfaces in Convex function logs and causes the `checkLinearFailures` cron to detect the signal (it checks `linearCreationAttempts > 0` with no `linearIssueId`). After 3 failures, Discord alert fires.

**Same treatment for `LINEAR_TEAM_PRODUCT` / `LINEAR_TEAM_INFRASTRUCTURE`** — throw with descriptive error instead of silent return.

### 3.4 Override Query Index (P2-4)

**File**: `apps/explorer/convex/signals.ts` (recalculateSovereignty function) + `apps/explorer/convex/schema.ts`

**Current behavior**: Sovereignty recalculation needs override rate data. The sovereignty state table has index `by_scope ([scope])` which is used for lookups. The override rate calculation reads from signals directly using `by_app` index (which already exists as `[appSlug, timestamp]`).

**Assessment**: The `by_app` index on signals table already covers `[appSlug, timestamp]` — this is exactly what override rate calculation needs. If `recalculateSovereignty` is not using this index (doing a filter instead of `.withIndex()`), update the query to use it. If it already uses the index, this finding is resolved.

**Action**: Verify the actual query in `recalculateSovereignty` and ensure it uses `.withIndex("by_app")` with appropriate range bounds rather than collecting and filtering in-memory.

---

## 4. Phase 3: MEDIUM/LOW Consolidation

### 4.1 Extract Auth Helper (P3-1)

**Files**: `apps/explorer/app/api/signals/route.ts` → new `apps/explorer/lib/signals/auth.ts`

Extract the in-memory key cache (SHA256, 60s TTL, 5K max) and validation logic into a shared module. The route handler currently inlines ~40 lines of cache management.

### 4.2 Shared Validator (P3-2)

**Files**: `apps/explorer/lib/signals/validation.ts`, `apps/explorer/convex/signals.ts`

Signal schema is defined twice: Zod in the route handler (validation.ts) and Convex validators in signals.ts. For cycle-047, document the discrepancy rather than extract — the Convex validator is authoritative at storage time, and Zod catches malformed input at the edge. Dual validation is defense-in-depth, not a bug.

**Downgrade to documentation task**: Add a comment in both files cross-referencing each other.

### 4.3 Circuit Breaker Persistence (P3-3)

**File**: `apps/explorer/convex/schema.ts`

Currently piggybacked onto `sovereigntyState.manualOverride` (when `setBy === 'circuit_breaker'`) and failure counts encoded as parseable strings in `lastTransition.trigger`. This works but is fragile.

**Change**: Add dedicated fields to `sovereigntyState`:
```typescript
circuitBreakerTripped: v.optional(v.boolean()),
circuitBreakerTrippedAt: v.optional(v.string()),
consecutiveFailures: v.optional(v.number()),
```

Update `isCircuitBroken` and `tripCircuitBreaker` functions to use typed fields instead of string parsing.

### 4.4 Heartbeat Cron Offset (P3-4)

**File**: `apps/explorer/convex/crons.ts`

Both `signals/heartbeat` and `signals/heartbeat-check` run at 1-hour intervals. Convex crons don't support offset configuration, but we can change `heartbeat-check` to run every 90 minutes instead of 60, creating natural drift that prevents same-tick collision. Alternatively, change `heartbeat-check` to 2 hours (less frequent but guaranteed separation).

### 4.5 statusCounts Safety Bound (P3-5)

**File**: `apps/explorer/convex/signals.ts` (lines 197-239)

Currently does `.collect()` on `by_status` index for `new`, `triaged`, `escalated` — no limit. Add `.take(10000)` as safety bound. Also fix the dead `resolved`/`dismissed` counts (initialized but never populated from DB queries).

### 4.6 Sovereignty Initialization Upsert (P3-6)

**File**: `apps/explorer/convex/signals.ts`

First signal from a new app triggers sovereignty tier creation. Convex mutations are serialized per document, but two signals from a new app could each check "does tier exist?" before either creates one, resulting in duplicates. Use Convex's `db.query().withIndex("by_scope").unique()` + conditional insert pattern (idempotent upsert).

---

## 5. Testing Strategy

| Change | Test Method |
|--------|-------------|
| Dashboard QuickLink | Visual — navigate to `/dashboard` as admin |
| Documentation rewrites | Manual read — no Dixie references, correct API paths |
| Classification terminal state | Send signal with invalid data that fails classification 3 times → verify `status: "classification_failed"` in Convex DB |
| Escalation failure visibility | Temporarily remove `LINEAR_API_KEY` → send HIGH signal → verify `linearCreationAttempts` increments, `checkLinearFailures` fires Discord alert |
| Linear env var detection | Remove env var → send signal → verify error in Convex function logs |
| Override query index | Check `recalculateSovereignty` uses `.withIndex()` in code review |
| Circuit breaker fields | Trigger circuit breaker → verify typed fields populated (not string-encoded) |
| Heartbeat offset | Check crons.ts shows different intervals |
| statusCounts bound | Code review — `.take(10000)` present |
| Sovereignty upsert | Send 2 signals from new appSlug simultaneously → verify single sovereignty row |

## 6. Deployment

1. **Phase 1** (docs + dashboard): Commit to main → auto-deploy on Vercel. No Convex changes.
2. **Phase 2** (reliability fixes): Commit to main → auto-deploy on Vercel. Push Convex functions: `CONVEX_DEPLOYMENT=prod:quaint-anaconda-866 npx convex deploy`. No schema migration needed (no new fields in Phase 2).
3. **Phase 3** (consolidation): Same as Phase 2, but schema change needed for circuit breaker fields. Run `npx convex deploy` — Convex handles additive optional fields automatically.

---

## 7. Files Modified

| File | Phase | Changes |
|------|-------|---------|
| `apps/explorer/app/(dashboard)/dashboard/page.tsx` | 1 | Add QuickLink |
| `grimoires/loa/context/ruggy-ecosystem-intelligence.md` | 1 | Full rewrite |
| `apps/explorer/convex/README.md` | 1 | Full rewrite |
| `apps/explorer/convex/signals.ts` | 2, 3 | Terminal status, statusCounts bound, sovereignty upsert |
| `apps/explorer/convex/linear.ts` | 2 | Throw on missing env vars |
| `apps/explorer/convex/schema.ts` | 3 | Circuit breaker typed fields |
| `apps/explorer/convex/crons.ts` | 3 | Heartbeat interval change |
| `apps/explorer/lib/signals/auth.ts` | 3 | New: extracted auth helper |
