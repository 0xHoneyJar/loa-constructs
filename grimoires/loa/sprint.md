# Sprint Plan: Gecko Network Health Dashboard

**Cycle**: cycle-043
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Team**: 1 engineer (autonomous)
**Sprint Duration**: 1 session

---

## Sprint 1: Full Implementation

**Goal**: Convex schema + functions + dashboard page + sidebar nav.

**Success Criteria**: Admin at `/dashboard/health` sees stat cards, trend chart, sub-score bars, and issues panel from Convex data. Non-admin sees access denied. Gecko can push via Convex action.

---

### T1.1: Convex Schema — Add healthObservations Table
**Priority**: P0 (blocks all functions)
**Files**: `apps/explorer/convex/schema.ts`

**Description**: Add `healthObservations` table with all observation fields and `by_timestamp` index.

**Acceptance Criteria**:
- Table added alongside existing 3 tables
- Fields match observation JSONL shape (camelCase)
- `by_timestamp` index on `['timestamp']`

**Dependencies**: None
**Effort**: Small

---

### T1.2: Convex Functions — healthObservations.ts
**Priority**: P0 (blocks frontend)
**Files**: `apps/explorer/convex/healthObservations.ts`

**Description**: 5 Convex functions: `insert` (internalMutation), `findByTimestamp` (internalQuery), `pushFromGecko` (action with write-key auth), `current` (query — latest), `trends` (query — date-bucketed averages).

**Acceptance Criteria**:
- `pushFromGecko` rejects invalid `writeKey`
- `pushFromGecko` rejects duplicate timestamps
- `current` returns latest observation or `null`
- `trends({ days: 30 })` returns date-bucketed `{ period, points }`
- Follows `syncStatus.ts` action → internalMutation pattern

**Dependencies**: T1.1
**Effort**: Medium

---

### T1.3: Components — health-score-card, sub-score-bar, issues-panel
**Priority**: P0
**Files**:
- `apps/explorer/components/dashboard/health/health-score-card.tsx`
- `apps/explorer/components/dashboard/health/sub-score-bar.tsx`
- `apps/explorer/components/dashboard/health/issues-panel.tsx`

**Description**: Three presentational components. Score card with threshold coloring (cyan/amber/crimson). Sub-score horizontal CSS bar. Issues panel listing empty categories, stale constructs, verification tiers.

**Acceptance Criteria**:
- Score card: `border border-void-border bg-void-base p-4`, threshold colors at 80/50 breakpoints
- Sub-score bar: label + CSS width bar + score number
- Issues panel: amber for warnings, "No issues" when clean
- All named exports, no default exports

**Dependencies**: None (presentational, no data)
**Effort**: Small

---

### T1.4: Component — health-trend-chart.tsx
**Priority**: P1
**Files**: `apps/explorer/components/dashboard/health/health-trend-chart.tsx`

**Description**: SVG polyline sparkline. Converts `points[].avgScore` to SVG coordinates. Fixed 120px height, scales to container width. Cyan stroke.

**Acceptance Criteria**:
- Renders SVG polyline from trend data
- Loading: skeleton div
- Empty: "No trend data" message
- Single data point: renders dot
- No external dependencies

**Dependencies**: None
**Effort**: Medium

---

### T1.5: Dashboard Page — /dashboard/health
**Priority**: P0
**Files**: `apps/explorer/app/(dashboard)/dashboard/health/page.tsx`

**Description**: Client component with `useQuery` subscriptions. Admin-gated. 4 sections: stat cards, trend chart with period switcher, sub-score bars, issues panel.

**Acceptance Criteria**:
- `CONVEX_AVAILABLE` guard
- `isAdmin` gate
- `useQuery(api.healthObservations.current)` + `useQuery(api.healthObservations.trends, { days })`
- Period switcher: 7d/30d/90d buttons
- Loading skeleton, empty state, full data state all handled
- Grid: `grid grid-cols-2 sm:grid-cols-4 gap-4`

**Dependencies**: T1.2, T1.3, T1.4
**Effort**: Large

---

### T1.6: Sidebar — Admin-Gated Health Link
**Priority**: P0
**Files**: `apps/explorer/components/dashboard/sidebar.tsx`

**Description**: Import `useAuthStore`, conditionally add Health nav item for admins.

**Acceptance Criteria**:
- "Health" link at `/dashboard/health` only visible to admins
- Active state works with existing `startsWith` logic

**Dependencies**: None
**Effort**: Small

---

## Task Dependency Graph

```
T1.1 (schema) → T1.2 (functions) ─┐
T1.3 (presentational components)  ─┼→ T1.5 (page)
T1.4 (trend chart)               ─┘
T1.6 (sidebar) ── independent
```

---

## Summary

| Sprint | Tasks | New Files | Modified Files | Lines (est.) |
|--------|-------|-----------|---------------|-------------|
| Sprint 1 | 6 tasks | 6 new | 2 modified | ~405 |
