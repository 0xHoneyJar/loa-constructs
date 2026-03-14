# SDD: SprawlOS Design System — Semantic Architecture

**Cycle**: cycle-050
**Created**: 2026-03-13
**PRD**: `grimoires/loa/prd.md`
**Architecture Research**: `grimoires/loa/context/design-system-architecture.md`

---

## 1. Executive Summary

Add a semantic token layer between the existing OKLCH primitives and component usage. Formalize spacing, motion, typography, elevation, and icon size as token scales. Scope 6 dashboard components to their own token namespaces. Introduce `data-context` and `data-density` attributes on layout containers for per-context overrides. Upgrade shadcn aliases to route through the semantic layer.

**Constraint**: All changes are additive. Existing primitive token references continue working. No component behavior changes. No visual regressions on pages that don't opt into the new system.

---

## 2. System Architecture

```
globals.css
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: PRIMITIVES (existing — unchanged)                   │
│  --color-void-base, --color-bone-bright, --color-cyan-base   │
│  --color-grid-line, --color-glow-cyan, etc.                  │
│  ~34 color tokens + 1 quantum + 5 tracking                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ var() references
┌───────────────────────────▼─────────────────────────────────┐
│  TIER 2: SEMANTIC (new)                                      │
│  --color-bg-void, --color-text-primary, --color-accent-*     │
│  --space-100..1600, --duration-*, --ease-*, --text-*         │
│  --elevation-*, --icon-*                                     │
│  ~80 tokens                                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ var() references
┌───────────────────────────▼─────────────────────────────────┐
│  TIER 3: COMPONENT (new)                                     │
│  --stat-card-*, --quick-link-*, --sidebar-*                  │
│  --dashboard-header-*, --table-*, --badge-*                  │
│  ~30 tokens                                                  │
└─────────────────────────────────────────────────────────────┘

Context Layer (overrides semantic tokens via attribute selectors)
┌─────────────────────────────────────────────────────────────┐
│  [data-context="dashboard"] { --color-bg-surface: ...; }     │
│  [data-context="marketing"] { --color-bg-surface: ...; }     │
│  [data-density="compact"]   { --density-gap: ...; }          │
│  [data-density="comfortable"] { --density-gap: ...; }        │
└─────────────────────────────────────────────────────────────┘

shadcn Bridge (aliases point to semantic, not primitive)
┌─────────────────────────────────────────────────────────────┐
│  --primary: var(--color-accent-primary)                       │
│  --muted: var(--color-bg-surface)                            │
│  --destructive: var(--color-status-danger)                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User loads /dashboard
  → (dashboard)/layout.tsx sets data-context="dashboard" on wrapper div
  → globals.css [data-context="dashboard"] overrides activate
  → Semantic tokens resolve to dashboard-tuned values
  → Component tokens reference semantic tokens
  → Components render using component tokens
  → Visual output: compact, terminal-chrome dashboard

User loads /constructs
  → (marketing)/layout.tsx sets data-context="marketing" on wrapper div
  → globals.css [data-context="marketing"] overrides activate
  → Same semantic token names, different values
  → Components render with more generous spacing, brighter text
```

---

## 3. Token Definitions

### 3.1 Semantic Color Tokens (Tier 2)

Added to `globals.css` `:root` block, after existing primitives:

```css
/* === TIER 2: SEMANTIC TOKENS === */

/* Backgrounds */
--color-bg-void: var(--color-void-base);
--color-bg-surface: var(--color-void-raised);
--color-bg-panel: var(--color-surface-panel);
--color-bg-elevated: var(--color-void-surface);
--color-bg-overlay: oklch(0.06 0.003 250 / 0.8);

/* Text */
--color-text-primary: var(--color-bone-base);
--color-text-secondary: var(--color-bone-dim);
--color-text-tertiary: var(--color-bone-muted);
--color-text-ghost: var(--color-bone-ghost);
--color-text-bright: var(--color-bone-bright);

/* Accent */
--color-accent-primary: var(--color-cyan-base);
--color-accent-primary-dim: var(--color-cyan-dim);
--color-accent-warm: var(--color-crimson-base);
--color-accent-warm-dim: var(--color-crimson-dim);

/* Borders */
--color-border-default: var(--color-void-border);
--color-border-subtle: var(--color-grid-line);
--color-border-active: var(--color-glow-cyan);

/* Status */
--color-status-success: var(--color-node-green);
--color-status-warning: var(--color-token-yellow);
--color-status-danger: var(--color-crimson-base);
--color-status-info: var(--color-cyan-dim);

/* Glow */
--color-glow-primary: var(--color-glow-cyan);
--color-glow-danger: var(--color-glow-crimson);

/* Interactive */
--color-interactive-default: var(--color-bone-dim);
--color-interactive-hover: var(--color-bone-base);
--color-interactive-active: var(--color-cyan-base);
--color-interactive-disabled: var(--color-bone-ghost);
```

**Total**: 27 semantic color tokens.

### 3.2 Spacing Scale

```css
/* === SPACING === */
--space-0: 0;
--space-025: 1px;
--space-050: 2px;
--space-100: 4px;
--space-150: 6px;
--space-200: 8px;
--space-300: 12px;
--space-400: 16px;
--space-500: 20px;
--space-600: 24px;
--space-800: 32px;
--space-1200: 48px;
--space-1600: 64px;
```

**Total**: 13 spacing tokens.

### 3.3 Motion Scale

```css
/* === MOTION: DURATIONS === */
--duration-instant: 0ms;
--duration-quantum: 83ms;
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 400ms;
--duration-deliberate: 800ms;

/* === MOTION: EASINGS === */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-quantum: steps(4);
```

**Total**: 11 motion tokens.

### 3.4 Typography Scale

Uses `rem` units so the scale responds to user browser font-size preferences (WCAG 1.4.4 Resize Text compliance). Base: `1rem = 16px` at default browser settings.

```css
/* === TYPOGRAPHY (rem for accessibility) === */
--text-2xs: 0.5rem;       /* 8px — decorative labels only, never for interactive content */
--text-xs: 0.5625rem;     /* 9px — terminal chrome, tracking labels */
--text-sm: 0.6875rem;     /* 11px — navigation, buttons, badges */
--text-base: 0.8125rem;   /* 13px — body text, data values */
--text-lg: 1rem;           /* 16px — headings, emphasis */
--text-xl: 1.25rem;        /* 20px — page titles */
--text-2xl: 1.5rem;        /* 24px — hero metrics, display numbers */

--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

**Accessibility constraint**: `--text-2xs` (0.5rem) and `--text-xs` (0.5625rem) are permitted ONLY for decorative/non-essential labels (aria-hidden content, sector markers). All interactive or informational content MUST use `--text-sm` (0.6875rem) or larger.

**Total**: 10 typography tokens.

### 3.5 Elevation System

```css
/* === ELEVATION (glow, not shadow) === */
--elevation-0: none;
--elevation-1: 0 0 0 1px var(--color-border-subtle);
--elevation-2: 0 0 8px var(--color-glow-primary);
--elevation-3: 0 0 16px var(--color-glow-primary);
--elevation-danger: 0 0 8px var(--color-glow-danger);
```

**Total**: 5 elevation tokens.

### 3.6 Icon Size Tokens

```css
/* === ICON SIZES === */
--icon-xs: 12px;
--icon-sm: 14px;
--icon-md: 16px;
--icon-lg: 20px;
--icon-xl: 24px;
```

**Total**: 5 icon size tokens.

### 3.7 Density Tokens

```css
/* === DENSITY (default: comfortable) === */
--density-row-height: 36px;
--density-cell-padding: var(--space-300);
--density-gap: var(--space-200);
```

Overridden by `[data-density="compact"]`:

```css
[data-density="compact"] {
  --density-row-height: 28px;
  --density-cell-padding: var(--space-150);
  --density-gap: var(--space-100);
}
```

**Total**: 3 density tokens (× 2 modes).

---

## 4. Component Token Scoping

### 4.1 StatCard

**File**: `apps/explorer/components/dashboard/stat-card.tsx`

```css
/* Component tokens */
--stat-card-bg: var(--color-bg-panel);
--stat-card-border: var(--color-border-subtle);
--stat-card-border-hover: var(--color-border-active);
--stat-card-label: var(--color-text-tertiary);
--stat-card-value: var(--color-text-primary);
--stat-card-padding: var(--space-400);
--stat-card-gap: var(--space-150);
--stat-card-hover-glow: var(--elevation-2);
```

**Migration**: Replace inline Tailwind classes with token-backed values. The `variant` prop (cyan/green/yellow) overrides `--stat-card-value` via CVA or inline style.

Current:
```tsx
<div className="border border-sprawl-grid-line bg-sprawl-surface-panel p-4 hover:border-sprawl-glow-cyan">
```

After:
```tsx
<div className="stat-card">
```

With CSS:
```css
.stat-card {
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  padding: var(--stat-card-padding);
}
.stat-card:hover {
  border-color: var(--stat-card-border-hover);
  box-shadow: var(--stat-card-hover-glow);
}
```

**Decision**: Component tokens are **co-located** with their components, not centralized in globals.css. Each component defines its own CSS custom properties in a `<style>` JSX block or via a co-located CSS module. This prevents globals.css from becoming a monolith and keeps token definitions next to the code that uses them.

**Chosen approach**: Inline token defaults at the component level, referencing semantic tokens:

```tsx
// stat-card.tsx
const STAT_CARD_TOKENS = {
  '--stat-card-bg': 'var(--color-bg-panel)',
  '--stat-card-border': 'var(--color-border-subtle)',
  '--stat-card-border-hover': 'var(--color-border-active)',
  '--stat-card-hover-glow': 'var(--elevation-2)',
  '--stat-card-padding': 'var(--space-400)',
  '--stat-card-gap': 'var(--space-150)',
  '--stat-card-label': 'var(--color-text-tertiary)',
  '--stat-card-value': 'var(--color-text-primary)',
} as React.CSSProperties;

// Applied via style prop on the root element
<div style={STAT_CARD_TOKENS} className="...">
```

This keeps component tokens discoverable next to the component while still allowing parent overrides via CSS specificity (a parent `[data-context]` rule can still override `--stat-card-bg`).

**Global override point**: Only the `[data-context]` and `[data-density]` overrides live in globals.css. Component token *defaults* live in their component files.

### 4.2 QuickLink

```css
--quick-link-bg: var(--color-bg-panel);
--quick-link-border: var(--color-border-subtle);
--quick-link-border-hover: var(--color-border-active);
--quick-link-text: var(--color-text-secondary);
--quick-link-text-hover: var(--color-text-primary);
--quick-link-icon: var(--color-text-ghost);
--quick-link-icon-hover: var(--color-accent-primary-dim);
--quick-link-padding: var(--space-400);
--quick-link-hover-glow: var(--elevation-2);
```

### 4.3 Sidebar

```css
--sidebar-bg: var(--color-bg-void);
--sidebar-width: 200px;
--sidebar-border: var(--color-border-subtle);
--sidebar-item-text: var(--color-text-tertiary);
--sidebar-item-text-hover: var(--color-text-primary);
--sidebar-item-text-active: var(--color-accent-primary);
--sidebar-item-bg-active: oklch(0.65 0.12 195 / 0.1);
--sidebar-item-glow-active: inset 0 0 12px var(--color-glow-primary);
--sidebar-item-padding-x: var(--space-300);
--sidebar-item-padding-y: var(--space-200);
--sidebar-item-gap: var(--space-050);
--sidebar-section-label: var(--color-text-ghost);
```

### 4.4 DashboardHeader

```css
--dashboard-header-height: 48px;
--dashboard-header-bg: var(--color-bg-void);
--dashboard-header-border: var(--color-border-subtle);
--dashboard-header-breadcrumb: var(--color-text-tertiary);
--dashboard-header-page-label: var(--color-text-primary);
--dashboard-header-separator: var(--color-border-subtle);
--dashboard-header-padding-x: var(--space-600);
```

### 4.5 Table (Dashboard Variant)

```css
--table-header-bg: var(--color-bg-panel);
--table-header-text: var(--color-text-tertiary);
--table-row-border: var(--color-border-subtle);
--table-row-hover-bg: var(--color-bg-surface);
--table-cell-padding: var(--density-cell-padding);
--table-row-height: var(--density-row-height);
```

### 4.6 Badge (Dashboard Variant)

```css
--badge-padding-x: var(--space-150);
--badge-padding-y: var(--space-050);
--badge-text-size: var(--text-2xs);
--badge-border-width: 1px;
```

**Total component tokens**: ~30 across 6 components.

---

## 5. Context Override System

### 5.1 Layout Changes

**Dashboard layout** (`apps/explorer/app/(dashboard)/layout.tsx`):

Add `data-context="dashboard"` to the root wrapper:

```tsx
// Before
<div className="flex h-screen bg-void-base">

// After
<div className="flex h-screen bg-void-base" data-context="dashboard">
```

**Marketing layout** (`apps/explorer/app/(marketing)/layout.tsx`):

Add `data-context="marketing"` to the root wrapper:

```tsx
// Before
<div className="min-h-screen flex flex-col">

// After
<div className="min-h-screen flex flex-col" data-context="marketing">
```

**Site layout** (`apps/explorer/app/(site)/layout.tsx`):

Add `data-context="site"` to the root wrapper:

```tsx
// Before
<div className="flex min-h-screen flex-col">

// After
<div className="flex min-h-screen flex-col" data-context="site">
```

### 5.2 Context Token Overrides

```css
/* Dashboard: tighter, more terminal */
[data-context="dashboard"] {
  --color-bg-surface: var(--color-surface-panel);
  --color-text-primary: var(--color-bone-base);
}

/* Marketing: more generous, brighter */
[data-context="marketing"] {
  --color-bg-surface: var(--color-void-raised);
  --color-text-primary: var(--color-bone-bright);
  --density-gap: var(--space-400);
}
```

### 5.3 Density Toggle

Dashboard layout includes a density toggle mechanism. Default: `comfortable`.

```tsx
// In dashboard layout or a settings store
<div data-context="dashboard" data-density={density}>
```

The density value can be stored in `localStorage` and read on mount. Implementation: a small `useDensity()` hook that reads/writes `localStorage` and provides the current density string.

---

## 6. shadcn Bridge Upgrade

### Current (direct primitive references)

```css
--primary: var(--color-cyan-base);
--muted: var(--color-void-raised);
--destructive: var(--color-crimson-base);
```

### After (through semantic layer)

```css
--primary: var(--color-accent-primary);
--primary-foreground: var(--color-bg-void);
--secondary: var(--color-bg-surface);
--secondary-foreground: var(--color-text-primary);
--muted: var(--color-bg-surface);
--muted-foreground: var(--color-text-tertiary);
--accent: var(--color-bg-elevated);
--accent-foreground: var(--color-text-primary);
--destructive: var(--color-status-danger);
--destructive-foreground: var(--color-text-bright);
--card: var(--color-bg-void);
--card-foreground: var(--color-text-primary);
--popover: var(--color-bg-surface);
--popover-foreground: var(--color-text-primary);
--input: var(--color-border-default);
--ring: var(--color-accent-primary-dim);
```

**Effect**: When `[data-context="marketing"]` overrides `--color-text-primary` to `var(--color-bone-bright)`, all shadcn components in that context automatically get brighter foreground text. No component code changes.

---

## 7. Tailwind Configuration Changes

### 7.1 Semantic Color Utilities

Add to `tailwind.config.ts` `colors` extend:

```ts
semantic: {
  'bg-void': 'var(--color-bg-void)',
  'bg-surface': 'var(--color-bg-surface)',
  'bg-panel': 'var(--color-bg-panel)',
  'bg-elevated': 'var(--color-bg-elevated)',
  'text-primary': 'var(--color-text-primary)',
  'text-secondary': 'var(--color-text-secondary)',
  'text-tertiary': 'var(--color-text-tertiary)',
  'text-ghost': 'var(--color-text-ghost)',
  'accent-primary': 'var(--color-accent-primary)',
  'accent-warm': 'var(--color-accent-warm)',
  'border-default': 'var(--color-border-default)',
  'border-subtle': 'var(--color-border-subtle)',
  'border-active': 'var(--color-border-active)',
  'status-success': 'var(--color-status-success)',
  'status-warning': 'var(--color-status-warning)',
  'status-danger': 'var(--color-status-danger)',
  'interactive-default': 'var(--color-interactive-default)',
  'interactive-hover': 'var(--color-interactive-hover)',
  'interactive-active': 'var(--color-interactive-active)',
},
```

### 7.2 Spacing Utilities

Add to `tailwind.config.ts` `spacing` extend:

```ts
spacing: {
  'sp-0': 'var(--space-0)',
  'sp-025': 'var(--space-025)',
  'sp-050': 'var(--space-050)',
  'sp-100': 'var(--space-100)',
  'sp-150': 'var(--space-150)',
  'sp-200': 'var(--space-200)',
  'sp-300': 'var(--space-300)',
  'sp-400': 'var(--space-400)',
  'sp-500': 'var(--space-500)',
  'sp-600': 'var(--space-600)',
  'sp-800': 'var(--space-800)',
  'sp-1200': 'var(--space-1200)',
  'sp-1600': 'var(--space-1600)',
},
```

Enables: `p-sp-400` (16px), `gap-sp-200` (8px), `m-sp-600` (24px).

### 7.3 Component Token Approach

Component tokens are **co-located** with their component files (see §4.1), not registered as a Tailwind plugin. This avoids globals.css/tailwind.config.ts becoming monolithic and keeps styles discoverable.

Components use Tailwind's arbitrary value syntax to reference their tokens:
```tsx
<div className="bg-[var(--stat-card-bg)] border border-[var(--stat-card-border)] p-[var(--stat-card-padding)]">
```

Or use the `cn()` utility to compose token-backed classes with variant overrides.

---

## 8. File Manifest

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/explorer/app/globals.css` | Edit | Add semantic tokens (Tier 2), spacing scale, motion scale, typography scale, elevation, icon sizes, density tokens, context overrides, upgraded shadcn bridge, accessibility overrides |
| `apps/explorer/tailwind.config.ts` | Edit | Add semantic color utilities, spacing utilities, component token plugin |
| `apps/explorer/components/dashboard/stat-card.tsx` | Edit | Migrate to component tokens, use `stat-card` base class |
| `apps/explorer/components/dashboard/quick-link.tsx` | Edit | Migrate to component tokens |
| `apps/explorer/components/dashboard/sidebar.tsx` | Edit | Migrate to component tokens |
| `apps/explorer/components/dashboard/dashboard-header.tsx` | Edit | Migrate to component tokens |
| `apps/explorer/app/(dashboard)/layout.tsx` | Edit | Add `data-context="dashboard"`, density support |
| `apps/explorer/app/(marketing)/layout.tsx` | Edit | Add `data-context="marketing"` |
| `apps/explorer/app/(site)/layout.tsx` | Edit | Add `data-context="site"` |

**No new files created.** All changes are edits to existing files.

---

## 9. Migration Approach

### Phase Order

1. **Add all tokens to globals.css** — purely additive, zero visual change
2. **Add Tailwind utilities** — purely additive, zero visual change
3. **Upgrade shadcn bridge** — change `var()` targets, test all 18 shadcn components
4. **Add `data-context` attributes** — on 3 layouts, with context override CSS
5. **Add component tokens** — in globals.css
6. **Migrate components** — replace inline Tailwind with component tokens, one at a time
7. **Add density tokens and toggle** — in globals.css + dashboard layout

### Rollback Safety

Every step is independently revertable:
- Step 1-2: Remove added CSS/config blocks
- Step 3: Revert shadcn aliases to direct primitive references
- Step 4: Remove `data-context` attributes and override CSS blocks
- Step 5-6: Revert component files
- Step 7: Remove density CSS and layout attributes

---

## 10. Accessibility & Contrast Requirements

### 10.1 Contrast Constraints

Context overrides MUST maintain WCAG AA contrast ratios:

| Token Pair | Minimum Contrast | Verification |
|-----------|-----------------|-------------|
| `--color-text-primary` on `--color-bg-void` | 7:1 (AAA) | Computed value check |
| `--color-text-secondary` on `--color-bg-surface` | 4.5:1 (AA) | Computed value check |
| `--color-text-tertiary` on `--color-bg-panel` | 4.5:1 (AA) | Computed value check |
| `--color-accent-primary` on `--color-bg-void` | 4.5:1 (AA) | Computed value check |
| `--color-status-*` on `--color-bg-panel` | 4.5:1 (AA) | Computed value check |

When adding context overrides, both the background AND foreground tokens in that context MUST be checked as a pair. Changing `--color-bg-surface` without verifying text contrast on it is a defect.

### 10.2 Reduced Motion Behavior

Under `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-quantum: 0ms;
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
    --duration-deliberate: 0ms;
    --ease-quantum: linear;
    --ease-spring: linear;
  }
}
```

All motion tokens resolve to zero/linear. Components using these tokens automatically become instant. The existing `animation-duration: 0.01ms !important` rule in globals.css remains as a fallback for non-tokenized animations.

### 10.3 Minimum Text Size

Interactive elements (buttons, links, form labels, table headers) MUST use `--text-sm` (0.6875rem / 11px) or larger. Sizes below `--text-sm` are restricted to `aria-hidden="true"` decorative labels.

---

## 11. Token Governance

### 11.1 Naming Convention

All tokens follow: `--[category]-[role][-variant][-state]`

- Category: `color`, `space`, `duration`, `ease`, `text`, `leading`, `elevation`, `icon`, `density`
- Role: semantic intent (`bg-surface`, `text-primary`, `border-active`)
- Variant: optional refinement (`primary-dim`, `warm`)
- State: optional interaction state (`hover`, `active`, `disabled`)

### 11.2 Deprecation Path

Primitive tokens (Tier 1) are NOT deprecated — they remain as the source of truth for color values. However, **component code** should progressively migrate from primitive references to semantic references:

- **New components**: MUST use semantic tokens (Tier 2 or Tier 3)
- **Existing components**: Migrate when touched (boy scout rule)
- **Lint enforcement**: Add ESLint rule (future sprint) that warns on direct primitive token usage in component files

### 11.3 Nested Context Behavior

When `data-context` attributes nest (e.g., a marketing page embedding a dashboard widget), the **innermost attribute wins** due to CSS specificity. This is intentional — a dashboard component rendered inside a marketing page should look like a dashboard component.

If a component needs to explicitly inherit from its ancestor context, it should NOT set its own `data-context` attribute.

### 11.4 CI Token Guardrails (Future Sprint)

- **Lint**: Validate all `var()` references in globals.css resolve to defined properties
- **Lint**: Flag px units in typography tokens (must be rem)
- **Lint**: Flag direct primitive token usage in new component files
- **Contrast check**: Automated WCAG contrast validation for all semantic color pairs

---

## 12. Portal Theming Strategy

shadcn components that render via React portals (Dialog, Popover, Tooltip, DropdownMenu) mount under `<body>`, outside the `data-context` layout wrapper.

**Solution**: The semantic tokens are defined at `:root` level with sensible defaults. Context overrides enhance but don't break the base system. Portal-rendered components will use `:root` defaults (which match the dashboard context, since that's our primary use case).

For the marketing context, where portals are less common (no admin dialogs), this is acceptable. If a marketing-context portal needs different theming in the future, the `data-context` attribute can be propagated to the portal container via Radix's `container` prop.

**Current impact**: Minimal. Dashboard is the primary portal user (Dialog for API key creation). Marketing pages rarely trigger portals.

---

## 13. Density: SSR-Safe Implementation

Instead of `localStorage` (which causes hydration mismatch), density preference uses a **cookie**:

1. Default: `comfortable` (no cookie = comfortable)
2. User toggles density → sets `sprawlos-density` cookie via `document.cookie`
3. Server reads cookie in layout RSC → sets `data-density` on initial render
4. No hydration flash — attribute is present in the initial HTML

```tsx
// In (dashboard)/layout.tsx (Server Component portion)
import { cookies } from 'next/headers';

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const density = cookieStore.get('sprawlos-density')?.value || 'comfortable';

  return (
    <div data-context="dashboard" data-density={density}>
      {/* ... */}
    </div>
  );
}
```

The toggle UI calls a client action that sets the cookie and triggers a router refresh.

---

## 14. Verification

| Check | Method |
|-------|--------|
| Semantic tokens resolve correctly | Browser DevTools: inspect computed values on dashboard elements |
| Spacing tokens work as Tailwind utilities | Add `p-sp-400` to a test element, verify 16px padding |
| Context overrides apply | Navigate `/dashboard` vs `/constructs`, compare computed `--color-text-primary` |
| Density toggle works | Toggle `data-density` attribute, verify row heights change. No hydration flash. |
| shadcn components still render | Navigate to all pages using shadcn Dialog, Button, Badge, Table |
| shadcn bridge value equality | Verify computed OKLCH values of `--primary` etc. are identical before/after bridge swap |
| No visual regression on marketing pages | Screenshot before/after comparison on `/`, `/constructs`, `/about` |
| Component tokens cascade | Override `--stat-card-bg` on a parent, verify StatCard responds |
| `prefers-reduced-motion` respects motion tokens | Enable reduced motion in OS, verify all durations → 0ms |
| Contrast check | All semantic text/bg pairs meet WCAG AA (4.5:1) |
| Typography rem scaling | Set browser font-size to 150%, verify text scales proportionally |
| Portal theming | Open Dialog on dashboard, verify correct token values in DevTools |
| Zero border-radius maintained | Audit all rendered elements for any non-zero border-radius |
| OKLCH-only | Search globals.css for hex/rgb/hsl — should find zero matches (except existing `::selection`) |
| No broken var() chains | Manually inspect 10 representative tokens across all 3 tiers |
