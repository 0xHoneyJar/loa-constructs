# Sprint Plan: SprawlOS Design System — Semantic Architecture

**Cycle**: cycle-050
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Created**: 2026-03-13

---

## Overview

| Attribute | Value |
|-----------|-------|
| Sprints | 3 |
| Total tasks | 14 |
| Scope | Token scales → Component migration → Context system |
| Deployment | Vercel auto-deploy on merge (no infra changes) |

---

## Sprint 1: Semantic Token Foundation

**Goal**: Add all token scales (semantic colors, spacing, motion, typography, elevation, icon sizes) to globals.css. Extend tailwind.config.ts with semantic utilities. Upgrade shadcn bridge to route through semantic layer. Add reduced-motion token overrides.

**Why first**: Every subsequent sprint depends on these tokens existing. Zero visual change — purely additive.

### T1.1 — Add semantic color tokens to globals.css
**File**: `apps/explorer/app/globals.css`
**Description**: Add 27 semantic color tokens (Tier 2) after existing primitives in `:root`. Tokens reference existing primitives via `var()`. Categories: backgrounds (5), text (5), accent (4), borders (3), status (4), glow (2), interactive (4).
**AC**:
- 27 new `--color-*` semantic properties in `:root`
- All reference existing primitives — no new OKLCH values
- Existing tokens unchanged
- No visual change on any page
**Effort**: Small

### T1.2 — Add spacing scale tokens
**File**: `apps/explorer/app/globals.css`
**Description**: Add 13 spacing tokens (space-0 through space-1600) to `:root` using a 4px base unit.
**AC**:
- 13 `--space-*` properties in `:root`
- Values: 0, 1px, 2px, 4px, 6px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px
**Effort**: Small

### T1.3 — Add motion, typography, elevation, icon size tokens
**File**: `apps/explorer/app/globals.css`
**Description**: Add motion scale (6 durations + 5 easings), typography scale (7 rem sizes + 3 line heights), elevation system (5 glow tokens), icon sizes (5 steps). Add `prefers-reduced-motion` overrides that zero all duration/ease tokens.
**AC**:
- 11 motion tokens (6 durations, 5 easings)
- 10 typography tokens (7 sizes in rem, 3 line heights)
- 5 elevation tokens (glow-based, no drop shadows)
- 5 icon size tokens
- `@media (prefers-reduced-motion: reduce)` block that sets all durations to 0ms and easings to linear
- Typography uses `rem` not `px`
**Effort**: Small

### T1.4 — Upgrade shadcn bridge to semantic references
**File**: `apps/explorer/app/globals.css`
**Description**: Change shadcn alias tokens (`--primary`, `--muted`, `--destructive`, etc.) from direct primitive references to semantic token references. Value-equivalent: resolved OKLCH values must be identical before and after.
**AC**:
- All 14 shadcn aliases reference semantic tokens, not primitives
- Computed values are identical (same OKLCH) — verified in browser DevTools
- No visual change on any page
- All shadcn components (Dialog, Button, Badge, Table, etc.) render correctly
**Effort**: Small

### T1.5 — Extend tailwind.config.ts with semantic utilities
**File**: `apps/explorer/tailwind.config.ts`
**Description**: Add semantic color namespace (19 utilities), spacing namespace (13 utilities `sp-*`). Keep all existing primitive utilities intact.
**AC**:
- `semantic.*` color utilities available (e.g., `bg-semantic-bg-surface`, `text-semantic-text-primary`)
- `sp-*` spacing utilities available (e.g., `p-sp-400`, `gap-sp-200`)
- Existing `void.*`, `bone.*`, `cyan.*`, `sprawl.*` utilities unchanged
- `bun run typecheck` passes
**Effort**: Small

---

## Sprint 2: Component Token Scoping + Migration

**Goal**: Add component token definitions co-located in each component file. Migrate StatCard, QuickLink, Sidebar, DashboardHeader from inline Tailwind to token-backed values. Add density tokens.

**Why second**: Components now have semantic tokens to reference. Migration is the primary value delivery.

### T2.1 — Add density tokens to globals.css
**File**: `apps/explorer/app/globals.css`
**Description**: Add 3 density tokens (row-height, cell-padding, gap) with `comfortable` as default in `:root`. Add `[data-density="compact"]` override block.
**AC**:
- 3 `--density-*` properties in `:root` (comfortable defaults)
- `[data-density="compact"]` selector overrides all 3 to tighter values
- No visual change (nothing uses data-density yet)
**Effort**: Small

### T2.2 — Migrate StatCard to component tokens
**File**: `apps/explorer/components/dashboard/stat-card.tsx`
**Description**: Add co-located `STAT_CARD_TOKENS` object defining component-level CSS custom properties that reference semantic tokens. Apply via `style` prop. Replace inline Tailwind class values with token references using arbitrary value syntax. Variant prop (cyan/green/yellow) overrides `--stat-card-value` via inline style.
**AC**:
- 8 component tokens defined in stat-card.tsx
- Inline Tailwind values replaced with token references
- Variant colors still work
- Loading state still works
- Visual output identical to before
**Effort**: Medium

### T2.3 — Migrate QuickLink to component tokens
**File**: `apps/explorer/components/dashboard/quick-link.tsx`
**Description**: Same pattern as T2.2 — co-located token object, token-backed Tailwind classes.
**AC**:
- 9 component tokens defined
- Hover glow effect still works
- Visual output identical
**Effort**: Small

### T2.4 — Migrate Sidebar to component tokens
**File**: `apps/explorer/components/dashboard/sidebar.tsx`
**Description**: Add co-located sidebar token object. Replace hardcoded Tailwind values for nav items, section labels, active states. Keep existing pixel icon imports and nav structure unchanged.
**AC**:
- 12 component tokens defined
- Active state glow still works
- Sector labels still render correctly
- Logout button still functional
- Visual output identical
**Effort**: Medium

### T2.5 — Migrate DashboardHeader to component tokens
**File**: `apps/explorer/components/dashboard/dashboard-header.tsx`
**Description**: Add co-located header token object. Replace hardcoded values for breadcrumb, badges, height.
**AC**:
- 7 component tokens defined
- Breadcrumb routing still works
- Admin/org badges still render
- Visual output identical
**Effort**: Small

---

## Sprint 3: Context System + Density

**Goal**: Add `data-context` attribute to all 3 layout containers. Add context override CSS blocks. Implement SSR-safe density toggle using cookies. Wire density attribute to dashboard layout.

**Why third**: Context overrides are the payoff — same components, different feel per context. Requires Sprints 1-2 complete.

### T3.1 — Add context override CSS to globals.css
**File**: `apps/explorer/app/globals.css`
**Description**: Add `[data-context="dashboard"]` and `[data-context="marketing"]` attribute selector blocks that override specific semantic tokens. Dashboard: tighter surface, standard text. Marketing: brighter text, more generous spacing.
**AC**:
- `[data-context="dashboard"]` block overrides `--color-bg-surface`, `--density-gap`
- `[data-context="marketing"]` block overrides `--color-text-primary` to bone-bright, `--density-gap` to space-400
- Blocks are additive — removing them changes nothing (`:root` defaults are the dashboard values)
**Effort**: Small

### T3.2 — Add data-context to dashboard layout
**File**: `apps/explorer/app/(dashboard)/layout.tsx`
**Description**: Add `data-context="dashboard"` attribute to the root wrapper div. Convert layout to handle density from cookie (SSR-safe). Read `sprawlos-density` cookie server-side, pass as `data-density` attribute.
**AC**:
- Root div has `data-context="dashboard"` and `data-density={density}`
- Density read from cookie server-side (no hydration mismatch)
- Default density is "comfortable" when no cookie exists
- Auth logic unchanged
- Visual output identical (dashboard context matches `:root` defaults)
**Effort**: Medium

### T3.3 — Add data-context to marketing and site layouts
**Files**: `apps/explorer/app/(marketing)/layout.tsx`, `apps/explorer/app/(site)/layout.tsx`
**Description**: Add `data-context="marketing"` and `data-context="site"` respectively. Marketing pages get brighter text and more generous spacing via the override block.
**AC**:
- Marketing layout root div has `data-context="marketing"`
- Site layout root div has `data-context="site"`
- Marketing pages have brighter text (bone-bright vs bone-base)
- No changes to site layout behavior beyond the attribute
**Effort**: Small

### T3.4 — Density toggle UI
**File**: `apps/explorer/components/dashboard/density-toggle.tsx` (NEW)
**Description**: Small toggle component that switches between compact/comfortable density. Sets `sprawlos-density` cookie and calls `router.refresh()` to re-render with new density. Renders in the dashboard header area.
**AC**:
- Toggle shows current density mode
- Clicking toggles between compact/comfortable
- Sets cookie `sprawlos-density` with value
- `router.refresh()` causes server re-read of cookie
- Layout shifts from 36px rows to 28px rows (or vice versa)
- Pixel icon or text label indicates mode
**Effort**: Medium

---

## Verification Checklist (Post-Sprint 3)

| Check | Method |
|-------|--------|
| Token count ~120-150 | Count all `--` properties in globals.css |
| Semantic tokens resolve | DevTools computed values on dashboard |
| Spacing utilities work | `p-sp-400` renders as 16px |
| shadcn bridge equivalence | Compare computed `--primary` before/after |
| Context overrides apply | Compare `/dashboard` vs `/constructs` text brightness |
| Density toggle works | Toggle compact/comfortable, verify row heights |
| No hydration flash | Load dashboard with compact cookie, no layout shift |
| Reduced motion | Enable OS reduced-motion, verify instant transitions |
| Contrast passes | Check semantic text/bg pairs meet WCAG AA |
| Typography rem scaling | Set browser font to 150%, verify proportional scaling |
| Portal theming | Open Dialog on dashboard, verify tokens in DevTools |
| `bun run typecheck` | Passes |
| Vercel build | Succeeds |
