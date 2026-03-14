# PRD: SprawlOS Design System — Semantic Architecture

**Cycle**: cycle-050
**Created**: 2026-03-13
**Status**: Draft
**Foundation**: cycle-049 (SprawlOS Dashboard — Design System Foundation)
**Architecture Doc**: `grimoires/loa/context/design-system-architecture.md` (933 lines, 57+ sources)

---

## 1. Problem Statement

Cycle-049 established the SprawlOS visual foundation: 54 OKLCH tokens, pixel icons, extracted dashboard components, shell retheme, and a Gemini embedding moodboard tool. The dashboard now *looks* like SprawlOS. But the token system remains flat — every component references primitive tokens directly (`var(--color-bone-base)`), spacing is ad-hoc Tailwind classes (`p-4`, `gap-2`), and there's no way to vary the feel per-context (dashboard vs marketing vs construct detail) without touching every component file.

The architecture research across Linear's Orbiter, Riot's Hextech/Play, Vercel's Geist, Adobe Spectrum, Shopify Polaris, Dub.co, Cal.com, and Resend confirms a universal pattern: **every design system that scales past 50 components adopts a three-tier token hierarchy** (primitive → semantic → component). We have 54 tokens and ~18 shadcn components. We're at the inflection point.

**The gap**: We have the right primitives. We're missing the semantic layer that makes them composable, the spacing/motion scales that eliminate ad-hoc values, and the context-scoping mechanism that lets the same component feel different in different contexts.

> Sources: `design-system-architecture.md` §1 (Where We Are), §2 (Elite Patterns), §12 (Synthesis)

---

## 2. Goals & Success Metrics

### Primary Goal

Build the semantic architecture layer on top of cycle-049's visual foundation: three-tier tokens, formalized spacing/motion/typography scales, component token scoping, and `data-context` attribute system for per-context overrides.

### Success Criteria

| Metric | Target | Verification |
|--------|--------|--------------|
| Semantic token layer | ~35 semantic tokens aliasing existing primitives | `globals.css` audit — semantic tokens reference primitives via `var()` |
| Spacing scale | 12-step numeric scale (space-0 through space-1600) | `globals.css` audit — no magic px values in new components |
| Motion token scale | 6 durations + 5 easings formalized | `globals.css` audit — motion tokens match material-feel research |
| Typography token scale | 7 text sizes + 3 line heights | `globals.css` audit — strict scale, monospace-first |
| Elevation system | 5 glow-based elevation tokens | `globals.css` audit — no `box-shadow` outside token system |
| Icon size tokens | 5-step scale (xs through xl) | `globals.css` audit |
| Component token scoping | StatCard, QuickLink, Sidebar declare own token scopes | Component CSS uses `--stat-card-*`, `--sidebar-*`, not primitives |
| Context overrides | `data-context` attribute on dashboard + marketing layouts | Token values change when context attribute changes |
| Density modes | Compact/comfortable via `data-density` attribute | Dashboard supports toggle between two density modes |
| shadcn bridge upgrade | shadcn aliases route through semantic layer | `--primary` → semantic → primitive (two hops, not one) |
| Tailwind v4 bridge | `@theme inline` directives for custom tokens | Custom tokens available as native Tailwind utilities |
| Token count | ~120-150 (from ~54) | Comparable to Cal.com / early Linear |
| Zero breaking changes | Existing pages render identically | Visual regression — before/after screenshots |

### Non-Goals (Deferred)

- Per-construct identity theming (`data-construct` attributes) — Phase 5 of architecture roadmap
- Moodboard synthesis pipeline (cluster analysis, gap detection) — Phase 6
- DTCG JSON token source format / Style Dictionary build pipeline — premature at <200 tokens
- Storybook / Ladle component documentation
- Visual regression testing infrastructure (Playwright/Lost Pixel)
- Multi-platform token output (iOS, Android, Figma)
- Publishing SprawlOS as an npm design system package

---

## 3. User & Stakeholder Context

### Primary Persona: Ecosystem Operator (@janitooor)

- Built the 54-token OKLCH system and moodboard pipeline in cycle-049
- Maintains 6 product repos — consistent design language across them is a multiplier
- Aesthetic: Austere. Luminous. Precise. (§9 Taste DNA)
- Reference: Linear for density, Vercel for dark craftsmanship, rektdrop for brutalist constraint
- **Need**: Token system that lets new components "just work" with the SprawlOS feel without copying Tailwind classes from other components

### Secondary Persona: Construct Developer

- Builds constructs that may want their own visual identity within the SprawlOS frame
- Encounters component library when contributing to explorer
- **Need**: Clear token API — "which token do I use for a panel background?" has one obvious answer (`--color-bg-panel`)

> Sources: cycle-049 PRD §3, moodboard images, architecture doc §9

---

## 4. Functional Requirements

### FR-1: Semantic Token Layer

Add a semantic tier between existing primitives and component usage. Non-breaking — semantic tokens reference existing primitives via `var()`.

**Color semantics** (Dub.co 3-axis model adapted):

| Category | Tokens | Source |
|----------|--------|--------|
| Backgrounds | `bg-void`, `bg-surface`, `bg-panel`, `bg-elevated`, `bg-overlay` | void-* family |
| Text | `text-primary`, `text-secondary`, `text-tertiary`, `text-ghost` | bone-* family |
| Accent | `accent-primary`, `accent-warm`, `accent-primary-dim`, `accent-warm-dim` | cyan-*, crimson-* |
| Border | `border-default`, `border-subtle`, `border-active` | void-border, grid-line, glow-cyan |
| Status | `status-success`, `status-warning`, `status-danger`, `status-info` | node-green, token-yellow, crimson, cyan |
| Glow | `glow-primary`, `glow-danger` | glow-cyan, glow-crimson |
| Interactive | `interactive-default`, `interactive-hover`, `interactive-active`, `interactive-disabled` | derived from accent + bone |

**Naming convention**: `--color-[category]-[role]` (e.g., `--color-bg-surface`, `--color-text-primary`)

### FR-2: Spacing Scale

Formalize a 12-step numeric scale on a 4px base unit:

```
space-0 (0) → space-025 (1px) → space-050 (2px) → space-100 (4px) → space-150 (6px) →
space-200 (8px) → space-300 (12px) → space-400 (16px) → space-500 (20px) →
space-600 (24px) → space-800 (32px) → space-1200 (48px) → space-1600 (64px)
```

Mapped to Tailwind utilities via `@theme inline` so `gap-space-200` compiles to `gap: var(--space-200)`.

### FR-3: Motion Token Scale

Formalize the duration and easing system from material-feel-tx-ux.md:

**Durations**: `instant` (0ms), `quantum` (83ms), `fast` (100ms), `normal` (200ms), `slow` (400ms), `deliberate` (800ms)

**Easings**: `default` (sharp/dense), `in` (exits), `out` (entries), `spring` (emphasis), `quantum` (steps(4))

Enforce: `steps()` or `linear` in dashboard context. `ease-out` permitted in marketing context only.

### FR-4: Typography Token Scale

Strict 7-step scale, monospace-first:

```
text-2xs (8px) → text-xs (9px) → text-sm (11px) → text-base (13px) →
text-lg (16px) → text-xl (20px) → text-2xl (24px)
```

Line heights: `leading-tight` (1.2), `leading-normal` (1.5), `leading-relaxed` (1.75)

### FR-5: Elevation System (Glow-Based)

SprawlOS uses glow and border luminance instead of drop shadows:

```
elevation-0 (none) → elevation-1 (subtle edge) → elevation-2 (active glow) →
elevation-3 (focused/hero glow) → elevation-danger (warning glow)
```

### FR-6: Icon Size Tokens

5-step scale: `icon-xs` (12px) → `icon-sm` (14px) → `icon-md` (16px) → `icon-lg` (20px) → `icon-xl` (24px)

### FR-7: Component Token Scoping

Each major dashboard component declares its own token scope. Components read from their scoped tokens, which reference semantic tokens by default but can be overridden per-context.

**Components to scope**: StatCard, QuickLink, Sidebar, Header, Table (dashboard variant), Badge (dashboard variant)

**Pattern per component**:
```css
--[component]-bg: var(--color-bg-[semantic]);
--[component]-border: var(--color-border-[semantic]);
--[component]-text: var(--color-text-[semantic]);
--[component]-padding: var(--space-[N]);
```

### FR-8: Context Override System

Add `data-context` attribute support on layout containers:

| Context | Applied To | Feel |
|---------|-----------|------|
| `dashboard` | Dashboard layout wrapper | Compact, terminal chrome, glow borders |
| `marketing` | Site layout (public pages) | Generous spacing, brighter text |

Context attribute drives token overrides — tighter density, different surface colors, different text brightness. Same components, different feel.

### FR-9: Density Modes

Dashboard supports two density modes via `data-density` attribute:

| Mode | Row Height | Cell Padding | Gap |
|------|-----------|-------------|-----|
| `comfortable` | 36px | space-300 | space-200 |
| `compact` | 28px | space-150 | space-100 |

### FR-10: shadcn Bridge Upgrade

Upgrade existing shadcn alias tokens to route through the semantic layer:

```
BEFORE: --primary: oklch(0.72 0.12 195)  (direct primitive)
AFTER:  --primary: var(--color-accent-primary)  (through semantic)
```

All 14 shadcn aliases get this treatment. This ensures shadcn components automatically respond to context overrides.

### FR-11: Tailwind v4 Bridge

Register custom tokens via `@theme inline` directive so they're available as native Tailwind utilities without additional config:

```css
:root { --color-bg-surface: var(--color-void-raised); }
@theme inline { --color-bg-surface: var(--color-bg-surface); }
```

This enables `bg-[--color-bg-surface]` or class-based utilities depending on Tailwind v4 adoption state.

---

## 5. Technical & Non-Functional Requirements

### Architecture

| Layer | Implementation | Notes |
|-------|---------------|-------|
| Primitive tokens | CSS custom properties in `globals.css` `:root` | Unchanged from cycle-049 |
| Semantic tokens | CSS custom properties in `globals.css` `:root` | NEW — references primitives |
| Component tokens | CSS custom properties in component CSS or `globals.css` | NEW — references semantics |
| Context overrides | `[data-context]` attribute selectors in `globals.css` | NEW |
| Density overrides | `[data-density]` attribute selectors in `globals.css` | NEW |
| Tailwind bridge | `tailwind.config.ts` theme extension + `@theme inline` | Extended |

### Performance

- All token resolution happens at CSS variable evaluation time — zero JS runtime cost
- No additional CSS files — everything in `globals.css` and component-level styles
- Context/density overrides via CSS attribute selectors — no React re-renders
- Token count increase (~54 → ~150) adds negligible CSS size (~2KB uncompressed)

### Migration Strategy

Non-breaking, incremental migration:

1. Semantic tokens are **additive** — existing primitive references continue working
2. New components **must** use semantic tokens
3. Existing components migrate **incrementally** (no big-bang rewrite)
4. shadcn bridge upgrade is a find-and-replace operation

### Compatibility

- Dark mode only (SprawlOS is void-first)
- `prefers-reduced-motion` must zero all motion tokens to `0ms` / `none`
- All OKLCH values — no hex, no rgb, no hsl (TDR-001)
- Zero border-radius (TDR: `--radius: 0px`)

---

## 6. Scope & Prioritization

### MVP (This Cycle)

| Priority | Requirement | Phase |
|----------|-------------|-------|
| P0 | FR-1: Semantic token layer (~35 color semantics) | 1 |
| P0 | FR-2: Spacing scale (12 steps) | 1 |
| P0 | FR-3: Motion token scale (6 durations + 5 easings) | 1 |
| P0 | FR-4: Typography token scale (7 sizes + 3 line heights) | 1 |
| P0 | FR-5: Elevation system (5 glow tokens) | 1 |
| P0 | FR-6: Icon size tokens (5 steps) | 1 |
| P0 | FR-10: shadcn bridge upgrade | 1 |
| P1 | FR-7: Component token scoping (6 components) | 2 |
| P1 | FR-8: Context override system (dashboard + marketing) | 2 |
| P1 | FR-9: Density modes (compact + comfortable) | 2 |
| P2 | FR-11: Tailwind v4 bridge (`@theme inline`) | 3 |

### Out of Scope

- Per-construct identity theming (`data-construct` + domain → hue derivation)
- DTCG JSON token source format
- Style Dictionary / Cobalt build pipeline
- Storybook / component documentation
- Visual regression infrastructure
- Token design Figma plugin / sync
- Multi-platform token output
- Published npm package

---

## 7. Risks & Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| Semantic naming bikeshed | Token names become inconsistent or verbose | Follow Dub.co's category × role model. Keep names under 4 segments. |
| Over-tokenization | 150 tokens where 90 would suffice | Only create component tokens when semantic tokens are genuinely insufficient. Measure: if a token is used by exactly 1 component, it's a component token. If used by 3+, promote to semantic. |
| Context override cascade conflicts | `[data-context]` and `[data-density]` interact unexpectedly | Density overrides only affect spacing/sizing tokens. Context overrides only affect color/surface tokens. No overlap. |
| shadcn bridge regression | Updating `--primary` from direct value to `var()` reference breaks shadcn components | Test all 18 installed shadcn components after bridge upgrade. CSS variable resolution is spec-compliant for this pattern. |
| Tailwind v4 migration timing | `@theme inline` requires Tailwind v4, which may not be our current version | FR-11 is P2. If still on v3, use existing `tailwind.config.ts` extension pattern instead. |
| Spacing scale adoption friction | Contributors keep using `p-4` instead of `gap-space-200` | Existing Tailwind spacing continues working. Semantic spacing tokens are for new components and explicit refactors only. |

### Dependencies

| Dependency | Status | Required By |
|------------|--------|-------------|
| Cycle-049 complete | Done (PR #164) | All — builds on SprawlOS foundation |
| Architecture research doc | Done (933 lines) | Token definitions, naming conventions |
| `globals.css` OKLCH token system | Exists | FR-1 references these as primitives |
| shadcn/ui installed (18 components) | Exists | FR-10 bridge upgrade |
| Dashboard shell rethemed | Done (cycle-049 sprint 2) | FR-7, FR-8 context scoping |

---

## Appendix: Token Inventory Target

| Category | Current | After This Cycle | Growth |
|----------|---------|-----------------|--------|
| Color primitives | 34 | 34 | — |
| Color semantics | 0 | ~35 | +35 |
| Spacing | 0 | 13 | +13 |
| Motion (duration) | 1 | 6 | +5 |
| Motion (easing) | 3 | 5 | +2 |
| Typography (size) | 0 | 7 | +7 |
| Typography (leading) | 0 | 3 | +3 |
| Elevation | 0 | 5 | +5 |
| Icon size | 0 | 5 | +5 |
| Letter spacing | 5 | 5 | — |
| Component tokens | 0 | ~30 | +30 |
| Density tokens | 0 | 6 | +6 |
| shadcn aliases | 14 | 14 | — (upgraded to semantic refs) |
| **Total** | **~54** | **~150** | **+96** |

### Comparative Positioning After Cycle

| System | Token Count | Our Position |
|--------|-------------|-------------|
| Resend | ~50 | Passed (cycle-049) |
| Cal.com | ~120 | Matched |
| Linear | ~150 | Matched |
| Geist | ~200 | Within reach (Phase 5 construct theming) |
| Polaris | ~800+ | Never needed |

> Architecture source: `grimoires/loa/context/design-system-architecture.md`
> Research enrichment: K-Hole dig sessions (Linear 57 sources, Riot, shadcn, token architecture 2025)
> Taste DNA: Austere. Luminous. Precise. — resonance-profile.yaml + moodboard synthesis
