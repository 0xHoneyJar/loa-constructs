# TDR-002: Breathability and Cognitive Load

**Status:** Accepted
**Date:** 2026-03-12
**Context:** Constructs Network explorer (constructs.network)
**Decision Maker:** soju
**Builds on:** TDR-001 (Typography Scale-Up)

---

## Context

After the typography scale-up (TDR-001), the explorer still felt dense. The construct catalog table had columns crammed together (Skills and Installs headers touching), badges used opacity modifiers that bled on dark OKLCH backgrounds, the install command animation caused layout shift, and the construct detail page dumped all information at once — no hierarchy.

The core observation: people do not read. They scan, glance, and decide. Every pixel that doesn't serve the glance is noise. The explorer must make the hierarchy do the work — not density, not decoration, not cleverness.

> Reference vocabulary terms: breathability, progressive disclosure, solid tint, cognitive load budget

## Decision

### 1. Progressive Disclosure (3-Tier Architecture)

Construct detail pages reorganized into reading-intent tiers:

| Tier | Name | Content | Default State |
|------|------|---------|---------------|
| 1 | The Glance | Name, version, badges, install, stats, links | Always visible |
| 2 | The Scan | Commands list, skills list | Collapsed (open if few items) |
| 3 | The Deep Read | Long description, docs, identity, showcases, accuracy | Always collapsed |

Install command is always above the fold in Tier 1. Never bury the primary action.

### 2. Solid OKLCH Tints — No Opacity

All badge/surface tinting uses pre-computed solid OKLCH tokens instead of opacity modifiers. New CSS custom properties:

```
--color-cyan-tint-bg: oklch(0.14 0.015 195)
--color-cyan-tint-border: oklch(0.25 0.04 195)
--color-stable-tint-bg: oklch(0.14 0.02 155)
--color-stable-tint-border: oklch(0.25 0.05 155)
--color-beta-tint-bg: oklch(0.14 0.02 85)
--color-beta-tint-border: oklch(0.25 0.05 85)
```

Badge component gains semantic variants (`cyan`, `internal`, `proven`, `backtested`) instead of inline opacity classes.

### 3. Table Spacing via Semantic HTML

Replaced flex-based catalog table with shadcn `<Table>` components (`<TableHead>`, `<TableCell>`, etc.). Proper `<th>`/`<td>` cells at `w-28`/`w-36` with `py-5` vertical padding. Full-row clickability via stretched `<Link>` with `after:absolute after:inset-0`.

### 4. Stable Animation Container

The rotating install command uses a fixed-width `<span>` sized to the longest slug (`ch` units, monospace), preventing layout shift during typewriter transitions. Three-effect architecture (one per phase) avoids timer ref collisions.

### 5. Bone Scale Discipline

| Token | L value | Usage |
|-------|---------|-------|
| `bone-bright` | 0.97 | Headlines, emphasis only |
| `bone-base` | 0.88 | Primary content, names, values |
| `bone-dim` | 0.68 | Secondary content, descriptions |
| `bone-muted` | 0.48 | Tertiary, truncated text |
| `bone-ghost` | 0.32 | Labels, placeholders, structural hints |

Never mix stops within the same visual weight class. Table headers are `bone-ghost`. Row content is `bone-base` (primary) or `bone-dim` (secondary).

## Alternatives Considered

### A: Opacity modifiers with `color-mix()`
Could use `color-mix(in oklch, cyan-base 12%, transparent)` for badge backgrounds. Rejected — still renders as transparent layer, still bleeds. Solid tokens are deterministic.

### B: Density-first layout (npm-style)
Pack maximum information per row, minimize whitespace. Rejected — monospace at this scale needs breathing room. The terminal aesthetic demands void between elements.

### C: Tabs instead of disclosure
Could use tab panels for the 3-tier detail page. Rejected — tabs hide content behind a click with no spatial hint. Disclosure (collapsible sections) shows the section titles, letting users scan the outline before deciding what to open.

## Consequences

- **Enables**: Future pages can follow the 3-tier pattern (Glance / Scan / Deep Read) as a standard
- **Enables**: Badge variants are now semantic — adding a new tier is one variant addition, not 4 inline classes
- **Constrains**: No opacity modifiers on OKLCH tokens in public-facing pages
- **Constrains**: Header is opaque (`bg-void-base`), no glassmorphism
- **Requires follow-up**: Dashboard pages still use opacity bleed (lower priority, behind auth)
- **Requires follow-up**: Graph components use `getCategoryColor` with hex-alpha on OKLCH strings (invalid CSS, but only affects graph visualization)
- **Requires follow-up**: Mobile responsiveness pass (hero overflow, table scaling, nav collapse)

## Evidence

- Skills and Installs table headers were visually touching at `w-20`/`w-24` with flex layout — screenshot confirmed
- Animation layout shift made the copy button a moving target — user reported "difficult to copy"
- `border-cyan-base/30` on `oklch(0.08)` background produces a border barely distinguishable from the background — effectively invisible
- Linear, Vercel, Stripe all use `py-4` to `py-6` on table rows with generous column widths
- "Sign in to see internal constructs" at page bottom is a desperation pattern — removed in favor of nav-level auth

---

*Created following The Easel's TDR template.*
