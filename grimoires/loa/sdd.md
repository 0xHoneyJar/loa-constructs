# SDD: Gecko Network Health Dashboard

**Cycle**: cycle-043
**Created**: 2026-03-12
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Context**: `grimoires/loa/context/gecko-health-dashboard-plan.md`

---

## 1. Architecture Overview

Convex-first architecture. Health observations flow: Gecko → Convex action (write-key auth) → Convex DB → `useQuery` reactive subscription → dashboard UI. No Postgres migration. No Hono endpoints. No polling.

```
┌──────────────┐     POST healthObservations:pushFromGecko
│ Gecko Patrol │ ──────────────────────────────────────────► ┌──────────┐
│ (GH Actions) │     { writeKey, ...observation }            │  Convex  │
└──────────────┘                                             │    DB    │
                                                             └────┬─────┘
                                                                  │ reactive
                                                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  /dashboard/health                                                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                           │
│  │ Score  │ │  API   │ │ Categ  │ │ Verif  │  ← useQuery(current)      │
│  └────────┘ └────────┘ └────────┘ └────────┘                           │
│  ┌────────────────────────────────────────────┐                         │
│  │ SVG trend chart (7d/30d/90d)               │  ← useQuery(trends)    │
│  └────────────────────────────────────────────┘                         │
│  Sub-score bars ████░░░░ 75                      ← useQuery(current)    │
│  Issues panel: empty categories, stale, tiers    ← useQuery(current)    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Convex Schema Extension

**File**: `apps/explorer/convex/schema.ts`

Add `healthObservations` table alongside existing 3 tables:

```typescript
healthObservations: defineTable({
  timestamp: v.string(),
  healthScore: v.number(),
  healthDelta: v.number(),
  apiStatus: v.string(),
  apiResponseMs: v.number(),
  registeredCount: v.number(),
  namespaceCount: v.number(),
  staleConstructs: v.array(v.string()),
  emptyCategories: v.array(v.string()),
  verificationTiers: v.any(),
  subScores: v.object({
    api_liveness: v.number(),
    version_freshness: v.number(),
    category_coverage: v.number(),
    identity_drift: v.number(),
    composition_density: v.number(),
    verification_flow: v.number(),
  }),
  source: v.optional(v.string()),
}).index('by_timestamp', ['timestamp'])
```

**Design decisions**:
- `v.any()` for `verificationTiers` — shape varies as new tiers are added
- `v.object()` for `subScores` — fixed 6-signal shape, type-safe
- Single `by_timestamp` index — covers both "latest" and "range" queries
- camelCase field names — matches Convex convention

> Grounded: `apps/explorer/convex/schema.ts` — same `defineTable` + `.index()` pattern

---

## 3. Convex Functions

**New file**: `apps/explorer/convex/healthObservations.ts`

### 3.1 `insert` (internalMutation)

Writes observation to DB. Called only from `pushFromGecko` action.

### 3.2 `pushFromGecko` (action)

External write path. Validates `writeKey` against `process.env.CONVEX_WRITE_KEY`. Checks for duplicate timestamp via `findByTimestamp`. Calls `insert` mutation.

> Grounded: `apps/explorer/convex/syncStatus.ts:51-71` — identical pattern

### 3.3 `findByTimestamp` (internalQuery)

Dedup check — queries by timestamp index.

### 3.4 `current` (query)

Returns latest observation: `.withIndex('by_timestamp').order('desc').first()`

> Grounded: `apps/explorer/convex/installEvents.ts:6-14` — same `.order('desc').take()` pattern

### 3.5 `trends` (query)

Args: `{ days: v.number() }`. Filters by cutoff date, collects, groups by date in JS, returns `{ period, points }` with averaged scores.

JS aggregation is appropriate: 90 rows max at 1 obs/day.

---

## 4. Frontend Components

### 4.1 Component Tree

```
app/(dashboard)/dashboard/health/page.tsx          ← default export
  components/dashboard/health/
    health-score-card.tsx                            ← named export
    sub-score-bar.tsx                                ← named export
    health-trend-chart.tsx                           ← named export
    issues-panel.tsx                                 ← named export
```

### 4.2 Page Component

**File**: `apps/explorer/app/(dashboard)/dashboard/health/page.tsx`

- `'use client'`
- `CONVEX_AVAILABLE` guard (same pattern as `LiveInstallFeed`)
- `isAdmin` gate from `useAuthStore()`
- Two `useQuery` calls: `current` + `trends({ days })`
- `useState` for `days` (7 | 30 | 90)
- Loading: `undefined` check → skeleton
- Empty: `null` check → "No health data yet"
- Grid: `grid grid-cols-2 sm:grid-cols-4 gap-4`

> Grounded: `apps/explorer/app/(dashboard)/dashboard/page.tsx` — exact same layout pattern

### 4.3 HealthScoreCard

Props: `{ label: string; value: string | number; delta?: number; subValue?: string }`

Color function: `>= 80 → cyan-base`, `>= 50 → graduation-beta`, `< 50 → crimson-base`

Card: `border border-void-border bg-void-base p-4`
Label: `font-mono text-[9px] text-bone-muted uppercase tracking-widest`
Value: `font-mono text-xl` + threshold color

### 4.4 SubScoreBar

Props: `{ label: string; score: number }`

CSS bar: track `bg-void-raised`, fill `width: {score}%` with threshold bg color.

### 4.5 HealthTrendChart

Props: `{ data: TrendsData | undefined }`

SVG polyline sparkline. No external deps. Scales to container width, 120px height. Stroke: cyan OKLCH value.

### 4.6 IssuesPanel

Props: `{ emptyCategories: string[]; staleConstructs: string[]; verificationTiers: Record<string, number> }`

Card wrapper. Lists issues in amber, "No issues" when clean.

---

## 5. Sidebar Modification

**File**: `apps/explorer/components/dashboard/sidebar.tsx`

Import `useAuthStore`. Conditionally append `{ href: '/dashboard/health', label: 'Health' }` when `isAdmin`.

> Grounded: existing `navItems` pattern + `pathname.startsWith()` matching

---

## 6. Files Changed Summary

| File | Action | Lines (est.) |
|------|--------|-------------|
| `apps/explorer/convex/schema.ts` | Add `healthObservations` table | +15 |
| `apps/explorer/convex/healthObservations.ts` | **New** — 5 functions | ~120 |
| `apps/explorer/app/(dashboard)/dashboard/health/page.tsx` | **New** — page | ~120 |
| `apps/explorer/components/dashboard/health/health-score-card.tsx` | **New** | ~35 |
| `apps/explorer/components/dashboard/health/sub-score-bar.tsx` | **New** | ~25 |
| `apps/explorer/components/dashboard/health/health-trend-chart.tsx` | **New** — SVG | ~50 |
| `apps/explorer/components/dashboard/health/issues-panel.tsx` | **New** | ~35 |
| `apps/explorer/components/dashboard/sidebar.tsx` | Add nav + admin gate | +5 |
| **Total** | | ~405 lines |
