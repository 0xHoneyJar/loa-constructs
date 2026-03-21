# Signals Observatory — Design Research Document

> **Author**: ALEXANDER (Artisan)
> **Date**: 2026-03-21
> **Status**: Pre-planning research — feeds into `/plan` cycle
> **Scope**: Redesign `constructs.network/dashboard/signals` + `/dashboard/health` into a unified, Linear-quality signals observatory

---

## 1. Current State Assessment

### What Exists

The dashboard has correct bones and broken rhythm. The Convex pipeline is genuinely well-architected — signals flow from apps through classification, grouping, sovereignty gating, and escalation. The data model is sophisticated. The UI rendering that data is not.

**Structural inventory (what's built):**

| Component | Location | Quality |
|-----------|----------|---------|
| Signal inbox | `components/dashboard/signals/signal-inbox.tsx` | Two-column master-detail. Functional but mouse-only. |
| Signal list item | `signal-list-item.tsx` | Left-border severity color. No keyboard focus state. |
| Signal detail pane | `signal-detail-pane.tsx` | Complete data display. No progressive disclosure. |
| Signal actions | `signal-action-buttons.tsx` | Dismiss/Triage/Escalate/Resolve with confirmation gates. Good. |
| Signal classification | `signal-classification.tsx` | 3-level display (Symptom→Want→Hypothesis). Clean. |
| Signal status bar | `signal-status-bar.tsx` | App filter pills with status dots. |
| Health score card | `health-score-card.tsx` | Score + delta. Color thresholds at 80/50. |
| Sub-score bars | `sub-score-bar.tsx` | Horizontal progress bars. |
| Health trend chart | `health-trend-chart.tsx` | Raw SVG polyline. No chart library. |
| Issues panel | `issues-panel.tsx` | Flat text lists. No severity encoding. |
| Stat card | `stat-card.tsx` | KPI card with variants. Token-scoped. |
| Density toggle | `density-toggle.tsx` | Comfortable/Compact via cookie + DOM mutation. |
| Sidebar | `sidebar.tsx` | 200px fixed. Cyan active state with glow. |

**Token system (what's right):**
- oklch color primitives — this is correct and rare. The palette is perceptually uniform by construction.
- 4px baseline grid (`space-100 = 4px` through `space-1600 = 64px`) — Levels of Scale satisfied.
- Semantic token layer: `--color-bg-void/surface/panel/elevated` — proper abstraction boundary.
- Glow-based elevation (`--elevation-0` through `--elevation-3`) — no drop shadows. Coherent material.
- Density system via `data-density` attribute — the mechanism is right, the implementation (direct DOM mutation) needs React state sync.

**What's broken:**

1. **No keyboard navigation.** The signal inbox is mouse-only. No `j/k` traversal, no `Enter` to select, no focus management. For a triage interface, this is a structural failure — you can't triage 50 signals efficiently with a mouse.

2. **Sovereignty state is invisible.** The `getSovereigntyState` query exists in Convex. The tier engine runs hourly. Override rates are computed. Circuit breakers trip. None of this is rendered anywhere in the dashboard. The intelligence layer is hidden in the database.

3. **Pagination is broken.** `byApp` returns `hasMore` + `nextCursor` but the inbox shows "Load more..." text with no click handler wired. Dead UI.

4. **Health chart hardcodes oklch literal.** `health-trend-chart.tsx` uses `oklch(0.85 0.15 195)` directly instead of `var(--color-cyan-base)`. Breaks if theme changes. This is Coupling Inversion — the component is coupled to a primitive rather than a semantic token.

5. **No progressive disclosure.** Signal detail pane renders everything at once. Stack traces, classification, actions, incident data — all visible simultaneously. Sentry learned this lesson and moved to collapsible sections + slide-out drawers. We need the same.

6. **Health and Signals are separate pages.** The operator mental model is unified — "what's happening in the network?" — but the UI forces a page switch between signal triage and health observation. These should compose into one coherent view.

7. **Overview page doesn't use Convex.** Uses REST `fetchDashboard` calls. Only signals and health sub-pages use reactive queries. The dashboard's primary landing doesn't feel real-time.

---

## 2. Benchmark Findings

### Linear — The Gold Standard for Triage

**Steal-worthy:**
- **Keyboard grammar.** `J/K` navigate, single-letter actions (`S` status, `P` priority, `A` assign), `G+_` prefix for navigation (`G+I` inbox, `G+T` triage). The grammar is learnable, composable, and muscle-memory-forming. This is non-negotiable for our signal triage workflow.
- **Triage as a first-class state.** Issues enter a Triage queue before hitting backlog. We need the same: signals arrive as `new`, triage is an explicit transition, not an implied state.
- **Inverted-L navigation.** Sidebar (vertical) + header bar (horizontal) creates five levels of hierarchy. We already have this structure — sidebar + dashboard header. We need to make it load-bearing.
- **Bulk actions.** Shift+arrows for range selection, bottom bar for batch actions. Essential for signal triage at volume.
- **`Cmd+K` command palette.** Universal escape hatch. Navigate, act, search from one entry point.
- **LCH color system.** Linear moved their entire theme engine to LCH with three base variables. We're already in oklch — we're ahead. But we should adopt their three-input model (base, accent, contrast) for theme generation.

**What to avoid:**
- LCH theme generation can produce poor contrast at edge cases. We don't need user-customizable themes — we need one correct theme.

### Vercel Dashboard — Speed Perception

**Steal-worthy:**
- **Optimistic UI.** Update immediately when success is likely, reconcile on server response. With Convex mutations, we can do this natively — mutations are already optimistic.
- **Skeleton screens that mirror final layout.** Our current loading state shows undefined → skeleton → content with layout shift. Vercel prevents this: "Skeletons mirror final content exactly." Show-delay 150ms + minimum visible time 300ms prevents flicker.
- **Geist Mono for operational data.** Tabular numbers (`font-variant-numeric: tabular-nums`) for all numeric columns. Our health scores, occurrence counts, and timestamps need this.
- **APCA over WCAG 2 for contrast.** APCA (Accessible Perceptual Contrast Algorithm) is perceptually uniform — it matches how humans actually perceive contrast. WCAG 2's formula is known to be inaccurate at both extremes.
- **Favicon as status indicator.** The browser tab reflecting deployment state is genius for background monitoring. We could show network health score in the favicon.

**What to avoid:**
- The monitoring tab is shallow. We need depth from the start.

### Sentry — Progressive Disclosure Done Right

**Steal-worthy:**
- **Collapsible sections + slide-out drawers.** The signal detail pane needs this desperately. Default: title, severity, status, classification summary. Expand: stack trace, breadcrumbs, incident history, raw data.
- **Time display toggle on breadcrumbs.** Absolute timestamps vs. relative-to-first-event. Both are useful in different debugging contexts. Let the operator choose.
- **Trend-based sorting.** Not "most events ever" but "escalating right now." Three factors: relative volume change, absolute volume, recency. Our signal inbox should sort by urgency, not chronology.
- **Event graph toggle.** Sparkline switching between occurrence count and affected-app count. Simple toggle, huge information density increase.

**What to avoid:**
- Error and fatal colors being too similar. Our severity palette (crimson/amber/cyan) already has sufficient perceptual distance — maintain this.
- Everything-on-page-at-once. The old Sentry detail page was overwhelming. Progressive disclosure is the fix.

### Datadog — Dashboard Composition

**Steal-worthy:**
- **Widget system.** Each widget answers exactly one question. Widget + data source + visualization = composable unit. Our health sub-scores should be individual widgets, not a monolithic panel.
- **Dashboard-wide filters.** A single dropdown (app slug, time window, severity) re-filters every widget. We need this for the observatory — filter by app slug once, everything updates.
- **Semantic color auto-mapping.** For compatible tags, Datadog recognizes meaning and applies color automatically. Our severity levels should auto-color without configuration.
- **High Density Mode.** Side-by-side panels on wide screens. Our density toggle should extend beyond row height to include panel layout.

**What to avoid:**
- Alert fatigue. Too many notifications degrade trust. Our Telegram digest and Linear escalation already gate this — the UI should reinforce the gate, not bypass it.
- Stacked graphs hiding data. Single-series per chart, or clearly labeled multi-series with distinct colors.

### Railway — Spatial Comprehension

**Steal-worthy:**
- **Deep dark purple background.** `hsl(250, 24%, 9%)` — not pure black. Our `void-base` at `oklch(0.08 0.005 250)` is in the same family. This is correct. Pure black is a perceptual error — it creates too much contrast with content and fatigues the eye.
- **Canvas-native topology.** We don't need a full node-graph, but the concept of seeing relationships spatially — sovereignty tiers across apps, signal flow from app to classification to escalation — deserves exploration.

**What to avoid:**
- Canvas interaction doesn't compress for small screens. Our observatory must work at 1280px minimum.

### Grafana — Threshold Intelligence

**Steal-worthy:**
- **Threshold-driven color changes.** Define steps (green at base, amber at threshold, crimson at critical) and the visualization changes color as data crosses thresholds in real-time. Our health sub-scores already have 80/50 thresholds — the chart should reflect them.
- **Annotations for contextual markers.** Mark deployments, incidents, sovereignty tier transitions directly on the health trend chart. This connects data changes to their causes.
- **Conditional rendering.** Panels shown/hidden based on data existence. Empty-state panels waste space and attention.

**What to avoid:**
- 24-column grid complexity. We're not building a configurable dashboard — we're building an opinionated observatory. 12 columns maximum.

---

## 3. Information Architecture

### The Primary Scan Path

The operator arrives at the observatory with one question: **"What needs my attention?"**

The scan path must answer this in under 3 seconds. The hierarchy:

```
┌─────────────────────────────────────────────────────────────────┐
│ L0: NETWORK PULSE                                               │
│ Health score (big number) + delta + sparkline                   │
│ Active incidents count + unresolved signals count               │
│ Sovereignty tier distribution (constrained/standard/autonomous) │
│ ← Scannable in 1 second. Answer: "Is anything on fire?"        │
├─────────────────────────────────────────────────────────────────┤
│ L1: SIGNAL TRIAGE (primary workspace)                           │
│ Filterable inbox: app, severity, status, time range             │
│ Keyboard-navigable list → detail pane                           │
│ Bulk actions: dismiss, triage, escalate, resolve                │
│ ← The main work surface. Answer: "What do I do about it?"      │
├─────────────────────────────────────────────────────────────────┤
│ L2: HEALTH OBSERVATORY (contextual depth)                       │
│ Sub-score breakdown: 6 dimensions with trend charts             │
│ Stale constructs, empty categories, verification gaps           │
│ 7/30/90 day trends with annotations                             │
│ ← Drill-down. Answer: "Why is the score what it is?"           │
├─────────────────────────────────────────────────────────────────┤
│ L3: SOVEREIGNTY INTELLIGENCE                                    │
│ Per-app sovereignty tier with transition history                 │
│ Override rate trends + circuit breaker status                    │
│ Classification confidence distribution                          │
│ ← Strategic view. Answer: "Is the AI getting smarter?"         │
└─────────────────────────────────────────────────────────────────┘
```

### Composition Strategy

**Option A — Unified Single Page (recommended):** L0 as a persistent header strip. L1 as the default workspace. L2 and L3 as collapsible sections below, or as tabs within the same page.

**Option B — Tab Navigation:** Four tabs (Pulse / Triage / Health / Sovereignty). Cleaner separation but forces context switching.

**Option C — Sliding Panels:** L0 always visible. L1 as main content. L2 and L3 slide in from the right as inspector panels when a health metric or sovereignty tier is clicked.

**Recommendation:** Option A with L2/L3 as collapsible sections. The unified page means the operator never loses context. Collapsible sections mean L2/L3 don't consume space when not needed. L0 (pulse) is always visible as a persistent header strip — it's the answer to "is anything on fire?" that should never scroll away.

---

## 4. Design Token Recommendations

### Typography

```
--observatory-font-ui:    'Geist Sans', 'Inter', system-ui    (body, labels, navigation)
--observatory-font-mono:  'Geist Mono', 'IBM Plex Mono'       (scores, counts, timestamps, IDs)
--observatory-font-data:  'Geist Mono'                         (all numeric data — tabular-nums)
```

**Scale (rem-based, WCAG 1.4.4 compliant):**

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--text-pulse-score` | 2.5rem / 40px | 600 | Health score big number |
| `--text-pulse-label` | 0.75rem / 12px | 500 | Pulse strip labels |
| `--text-section-heading` | 1rem / 16px | 600 | Section headings (TRIAGE, HEALTH, SOVEREIGNTY) |
| `--text-signal-title` | 0.875rem / 14px | 500 | Signal titles in list |
| `--text-signal-meta` | 0.75rem / 12px | 400 | Timestamps, occurrence counts, app slugs |
| `--text-detail-heading` | 1.125rem / 18px | 600 | Detail pane title |
| `--text-detail-body` | 0.875rem / 14px | 400 | Detail pane content |
| `--text-code` | 0.8125rem / 13px | 400 | Stack traces, error messages |
| `--text-badge` | 0.6875rem / 11px | 600 | Status/severity/tier badges |

**Critical rule:** All numeric data uses `font-variant-numeric: tabular-nums`. Health scores, occurrence counts, response times, override rates — everything that stacks vertically must align.

### Color System — Severity Palette

The existing oklch primitives are correct. What's missing is a complete severity-to-color mapping with redundant cues (color + icon + text label):

```
SEVERITY PALETTE (oklch, perceptually uniform):

Critical:  oklch(0.55 0.24 25)    → crimson-base    + ⬤ filled circle  + "Critical"
High:      oklch(0.75 0.16 55)    → amber-warm       + ◉ ring-dot      + "High"
Medium:    oklch(0.78 0.12 85)    → token-yellow     + ◎ double ring   + "Medium"
Low:       oklch(0.85 0.15 195)   → cyan-base        + ○ ring          + "Low"
Info:      oklch(0.55 0.04 250)   → bone-muted       + · dot           + "Info"
```

**Redundant encoding (WCAG 1.4.1 — color is never the only channel):**
- Color (severity palette above)
- Icon shape (filled → ring → dot progression = urgency gradient)
- Text label (always present in badges)
- Position (critical signals sort to top)

**Status palette (signal lifecycle):**

```
New:       oklch(0.85 0.15 195)   → cyan-base        + pulse animation
Triaged:   oklch(0.78 0.12 85)    → token-yellow     + static
Escalated: oklch(0.75 0.16 55)    → amber-warm       + ↗ arrow icon
Resolved:  oklch(0.70 0.12 155)   → node-green       + ✓ check
Dismissed: oklch(0.45 0.02 250)   → void-elevated    + — dash
```

**Sovereignty tier palette:**

```
Autonomous: oklch(0.70 0.12 155)  → node-green       + full signal bars
Standard:   oklch(0.78 0.12 85)   → token-yellow     + partial signal bars
Constrained: oklch(0.55 0.04 250) → bone-muted       + single signal bar
```

### Spacing

Maintain the existing 4px baseline grid. Observatory-specific spacing tokens:

```
--obs-pulse-height:      48px     (pulse strip height — fixed, never scrolls)
--obs-list-row:          36px     (comfortable) / 28px (compact)
--obs-list-gap:          1px      (hairline between rows — structural, not decorative)
--obs-detail-padding:    24px     (detail pane inner padding)
--obs-section-gap:       48px     (between L1/L2/L3 sections — The Void)
--obs-related-gap:       12px     (between related metrics — ma encoding)
--obs-unrelated-gap:     32px     (between unrelated metric groups)
--obs-badge-padding:     4px 8px  (inline badge padding)
```

The 48px section gap and 12px related gap encode information through rhythm — the eye parses relatedness before the mind reads labels. This is ma doing structural work.

### Motion

```
--obs-duration-instant:   83ms     (severity dot pulse, badge appear)
--obs-duration-quick:    150ms     (list selection, filter change)
--obs-duration-normal:   250ms     (panel open/close, section expand/collapse)
--obs-duration-slow:     400ms     (page-level transitions, chart redraw)

--obs-spring-light:      stiffness: 300, damping: 24, mass: 0.8   (badges, small elements)
--obs-spring-medium:     stiffness: 200, damping: 20, mass: 1.0   (panels, cards)
--obs-spring-heavy:      stiffness: 150, damping: 18, mass: 1.2   (sections, overlays)
```

**Motion rules for data interfaces:**
1. New signal arrival: fade in from left (150ms) with spring-light. Not a slide — a materialization.
2. Selection change: instant highlight (83ms step transition — the existing `--ease-quantum: steps(4)` is perfect for this).
3. Detail pane content swap: crossfade (150ms). No slide. Data replaces data without theatrical motion.
4. Health score update: number counter tick (each digit steps independently, 83ms per step). This communicates computation, not reveal.
5. Section expand/collapse: spring-medium height animation. Overflow clip during transition.
6. **Zero decorative motion.** No floating elements. No gradient animations. No particle effects. Every movement communicates state change or demonstrates computation.

---

## 5. Interaction Model

### Keyboard Navigation (non-negotiable)

**Signal triage shortcuts (modeled on Linear):**

| Key | Action | Context |
|-----|--------|---------|
| `J` / `↓` | Next signal | Signal list focused |
| `K` / `↑` | Previous signal | Signal list focused |
| `Enter` / `L` | Open detail pane | Signal selected |
| `Escape` | Close detail pane / deselect | Detail open |
| `D` | Dismiss signal | Signal selected |
| `T` | Triage signal | Signal selected |
| `E` | Escalate to Linear | Signal selected |
| `R` | Resolve signal | Signal selected |
| `Shift+↓/↑` | Extend selection | Multi-select mode |
| `X` | Toggle selection | Signal focused |
| `Cmd+A` | Select all visible | Signal list focused |

**Navigation shortcuts:**

| Key | Action |
|-----|--------|
| `G then P` | Go to Pulse |
| `G then T` | Go to Triage |
| `G then H` | Go to Health |
| `G then S` | Go to Sovereignty |
| `Cmd+K` | Open command palette |
| `?` | Open shortcut reference |
| `1-5` | Filter by severity (1=critical, 5=info) |
| `F` | Focus filter bar |
| `/` | Focus search |

**Dashboard-wide filters:**

| Filter | Control | Shortcut |
|--------|---------|----------|
| App slug | Dropdown / command palette | `A` then type |
| Severity | Toggle buttons | `1-5` |
| Status | Toggle buttons | `N`ew / `T`riaged / `E`scalated |
| Time range | Presets: 1h, 6h, 24h, 7d, 30d | None |

**Focus management:**
- Tab order: pulse strip → filter bar → signal list → detail pane → action buttons
- `Escape` moves focus up one level (detail → list → filters → pulse)
- Arrow keys within signal list are trapped (don't scroll the page)
- Focus ring: 2px `cyan-base` outline with 2px offset. Visible on `:focus-visible` only (not on click).

### Triage Workflow

The triage workflow is the primary interaction loop. It must feel as fast as email triage:

```
1. Scan pulse strip (1 second — are there critical signals?)
2. Filter by app or severity (keyboard: A or 1-5)
3. Navigate list with J/K
4. Read classification summary in list item (no detail pane needed for simple signals)
5. Act: D (dismiss), T (triage), E (escalate), R (resolve)
6. Next signal auto-advances (J after action)
7. For complex signals: Enter → detail pane → progressive disclosure → Act → Escape → next
```

**Bulk triage:** Shift+J/K to extend selection → action key applies to all selected → confirmation for escalate/dismiss-critical (never for triage/resolve).

### Detail Pane — Progressive Disclosure

Default (always visible):
- Title + severity badge + status badge
- App slug + timestamp + occurrence count
- Classification summary (3 levels, one line each)
- Action buttons

Expandable sections (collapsed by default):
- **Stack Trace** — syntax-highlighted, collapsible frames
- **Signal Data** — raw feedback/error payload
- **Incident Group** — linked signals in same group
- **Activity** — timeline of state changes
- **Override History** — if overrides exist for this signal
- **Raw JSON** — for debugging

Each section header shows a count or presence indicator: "Stack Trace (12 frames)" / "Incident Group (4 signals)" / "Overrides (2)".

---

## 6. Accessibility Checklist

### WCAG 2.1 AA Requirements (minimum)

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| **1.1.1 Non-text Content** | All severity icons have text alternatives | `aria-label="Critical severity"` on icon components |
| **1.3.1 Info and Relationships** | Signal list is a proper list | `role="listbox"` on container, `role="option"` on items |
| **1.3.2 Meaningful Sequence** | Reading order matches visual order | DOM order: pulse → filters → list → detail |
| **1.4.1 Use of Color** | Color never sole channel | Severity uses color + icon shape + text label |
| **1.4.3 Contrast Minimum** | 4.5:1 for text, 3:1 for large text | Verify with APCA. Our oklch system makes this calculable. |
| **1.4.4 Resize Text** | All text in rem, works at 200% zoom | Already satisfied by existing token system |
| **1.4.11 Non-text Contrast** | 3:1 for UI components and graphics | Focus rings, severity dots, progress bars |
| **1.4.13 Content on Hover/Focus** | Tooltips dismissable, hoverable, persistent | Radix UI tooltip with keyboard dismiss |
| **2.1.1 Keyboard** | All functionality via keyboard | Shortcut system above covers this |
| **2.1.2 No Keyboard Trap** | Escape always exits | Escape hierarchy: detail → list → filters → pulse |
| **2.4.3 Focus Order** | Logical focus sequence | Tab order matches scan path |
| **2.4.7 Focus Visible** | Clear focus indicator | 2px cyan outline, 2px offset, `:focus-visible` only |
| **4.1.2 Name, Role, Value** | Custom components expose semantics | ARIA roles on list, detail pane, action buttons |
| **4.1.3 Status Messages** | Status changes announced | `aria-live="polite"` on signal count, health score |

### Color-Blind Safe Severity Palette

The oklch severity palette is tested against three common forms:

| Severity | Normal Vision | Protanopia (no red) | Deuteranopia (no green) | Tritanopia (no blue) |
|----------|--------------|---------------------|------------------------|---------------------|
| Critical | Crimson (warm, high chroma) | Dark amber (distinguishable from amber-warm by lightness delta) | Dark amber | Crimson-pink |
| High | Amber-warm | Amber | Amber | Amber-pink |
| Medium | Yellow | Yellow-green | Yellow | Yellow-pink |
| Low | Cyan | Blue-gray | Blue | Gray-pink |
| Info | Muted gray | Muted gray | Muted gray | Muted gray |

The key guarantee: **lightness values are monotonically increasing from critical to info** (0.55 → 0.55 → 0.78 → 0.85 → 0.55). Wait — info and critical share lightness 0.55 but differ in chroma (0.24 vs 0.04). Under any color vision deficiency, the chroma difference ensures they remain distinguishable. However, the icon shape + text label provides the fully redundant fallback.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Replace spring animations with instant transitions */
  --obs-duration-instant: 0ms;
  --obs-duration-quick: 0ms;
  --obs-duration-normal: 0ms;
  --obs-duration-slow: 0ms;

  /* Disable pulse animation on new signals */
  /* Disable number counter tick — show final value immediately */
  /* Keep expand/collapse — use height transition at 150ms, no spring */
}
```

### Screen Reader Semantics

```
Signal list:
  <div role="listbox" aria-label="Signals" aria-activedescendant={selectedId}>
    <div role="option" aria-selected={selected} aria-label={`${severity} ${title}, ${appSlug}, ${occurrenceCount} occurrences`}>

Health score:
  <div role="status" aria-live="polite" aria-label={`Network health score: ${score} out of 100, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} from baseline`}>

Sovereignty tier:
  <div aria-label={`${appSlug} sovereignty: ${tier}, override rate ${overrideRate}%`}>
```

---

## 7. Component Inventory

### Build New

| Component | Description | Priority |
|-----------|-------------|----------|
| `PulseStrip` | Persistent header: health score, active incidents, signal counts, sovereignty summary | P0 |
| `SignalList` | Keyboard-navigable, virtualized signal list with multi-select | P0 |
| `SignalListItem` | Compact row with severity icon, title, app, count, time, classification hint | P0 |
| `SignalDetailPanel` | Progressive-disclosure detail pane with collapsible sections | P0 |
| `CommandPalette` | `Cmd+K` palette for navigation and actions | P0 |
| `KeyboardShortcutProvider` | Context provider for keyboard shortcut registration and handling | P0 |
| `DashboardFilter` | Dashboard-wide filter bar (app, severity, status, time range) | P0 |
| `SovereigntyPanel` | Per-app tier cards with override rate, circuit breaker status, transition history | P1 |
| `SovereigntyTierBadge` | Inline badge: autonomous/standard/constrained with signal-bar icon | P1 |
| `HealthWidgetGrid` | Sub-score widget grid with individual trend sparklines | P1 |
| `HealthTrendChart` | Upgraded SVG chart with threshold colors, annotations, time-range selector | P1 |
| `BulkActionBar` | Bottom bar appearing on multi-select with batch action buttons | P1 |
| `SignalSparkline` | Tiny inline occurrence-over-time chart for signal list items | P2 |
| `ShortcutReference` | `?` modal showing all keyboard shortcuts | P2 |
| `ObservatoryFavicon` | Dynamic favicon reflecting health score color | P2 |

### Extend Existing

| Component | Change |
|-----------|--------|
| `stat-card.tsx` | Add `mono` variant for numeric data with tabular-nums. Add sparkline slot. |
| `density-toggle.tsx` | Sync to React state (Zustand or context). Remove direct DOM mutation. |
| `sidebar.tsx` | Add observatory section in admin nav. Active state already good. |
| `dashboard-header.tsx` | Integrate PulseStrip below header or replace header with PulseStrip. |
| `signal-status-bar.tsx` | Evolve into DashboardFilter component. Keep status dots. |

### Keep As-Is

| Component | Why |
|-----------|-----|
| `signal-classification.tsx` | 3-level display is clean and correct. |
| `signal-action-buttons.tsx` | Confirmation gates are well-designed. Extend for keyboard triggers. |
| `api-key-list.tsx` | Separate concern. Not part of observatory. |
| `create-key-dialog.tsx` | Separate concern. |

### Dependencies

| Library | Purpose | Why This One |
|---------|---------|-------------|
| `cmdk` | Command palette | De facto standard. Linear, Vercel, Railway all use it or something derived from it. |
| `@tanstack/react-virtual` | List virtualization | Handles 1000+ signals without DOM bloat. Integrates with keyboard nav. |
| None (raw SVG) | Charts | Keep the existing approach. No chart library. We need precise control over threshold colors, annotations, and motion. A library would fight us. |
| Existing Radix UI | Tooltips, dropdowns, dialogs | Already in the project. Accessible by default. |

---

## 8. Layout Options

### Option A — "The Linear" (Recommended)

```
┌──────────┬──────────────────────────────────────────────┐
│          │ ■ PULSE STRIP                                 │
│          │ 92 ▲+3  │  2 critical  │  14 new  │  ●●●○   │
│          ├──────────────────────────────────────────────┤
│          │ [App ▼] [●Crit ●High ●Med ●Low] [24h ▼]     │
│ SIDEBAR  ├──────────────────┬───────────────────────────┤
│          │ SIGNAL LIST      │ DETAIL PANE                │
│ 200px    │                  │                            │
│ fixed    │ ● App error...   │ Signal Title               │
│          │   midi 3x  2m    │ ───────────────            │
│          │                  │ Severity: ⬤ Critical       │
│          │ ◎ Feedback:...   │ Status: New                │
│          │   mcv  1x  15m   │ App: midi-interface        │
│          │                  │ Occurrences: 3             │
│          │ ○ CSS warn...    │                            │
│          │   set  12x  1h   │ ▸ Stack Trace (8 frames)  │
│          │                  │ ▸ Classification           │
│          │ ...              │ ▸ Incident Group (2)       │
│          │                  │                            │
│          │ [Load more]      │ [Dismiss] [Triage] [Esc]   │
│          ├──────────────────┴───────────────────────────┤
│          │ ▸ HEALTH OBSERVATORY (collapsed)              │
│          ├──────────────────────────────────────────────┤
│          │ ▸ SOVEREIGNTY INTELLIGENCE (collapsed)        │
└──────────┴──────────────────────────────────────────────┘
```

**Scan path:** Eyes enter at pulse strip (top-left, big number). Scan right for incident count. Drop to filter bar. Drop to signal list. Signal list occupies the primary viewport. Detail pane appears on selection (or is always visible on wide screens).

**Breakpoints:**
- `≥1440px`: Signal list (40%) + detail pane (60%) side by side. Health/sovereignty collapsed below.
- `1280-1439px`: Signal list (45%) + detail pane (55%). Tighter but functional.
- `<1280px`: Signal list full width. Detail pane opens as a slide-over from right. Health/sovereignty remain collapsed below.

**Why this wins:** It's the inverted-L pattern that Linear proved works for triage. The pulse strip gives ambient awareness without consuming space. The collapsed sections below prevent the observatory from feeling like "just another signal list" — the health and sovereignty data are always one click away.

### Option B — "The Grafana"

```
┌──────────┬──────────────────────────────────────────────┐
│          │ ■ PULSE STRIP (same as A)                     │
│          ├──────────────────────────────────────────────┤
│          │ [TRIAGE] [HEALTH] [SOVEREIGNTY]  tabs         │
│ SIDEBAR  ├──────────────────────────────────────────────┤
│          │                                               │
│          │  Tab content fills remaining space             │
│          │                                               │
│          │  TRIAGE tab = signal list + detail pane        │
│          │  HEALTH tab = widget grid + trend charts       │
│          │  SOVEREIGNTY tab = tier cards + override viz   │
│          │                                               │
└──────────┴──────────────────────────────────────────────┘
```

**Scan path:** Pulse strip → tab selection → tab content.

**Trade-offs:** Cleaner separation. Each tab has more vertical space. But: context switching between tabs means you can't see a signal's health context without tab-switching. The tabs fight the "unified observatory" metaphor.

**When to choose this:** If the three concerns (triage, health, sovereignty) prove too dense for a single scrollable page. Tab separation becomes a feature, not a compromise.

### Option C — "The Datadog"

```
┌──────────┬──────────────────────────────────────────────┐
│          │ ■ PULSE STRIP (same as A)                     │
│          ├──────────────────────────────────────────────┤
│          │ [App ▼] [Severity ▼] [Time ▼]   global filter │
│ SIDEBAR  ├───────────────┬──────────────┬───────────────┤
│          │ SIGNAL FEED   │ HEALTH GRID  │ SOVEREIGNTY   │
│          │ (4 col)       │ (5 col)      │ (3 col)       │
│          │               │              │               │
│          │ List of       │ 6 sub-score  │ App tier      │
│          │ recent        │ widgets      │ cards         │
│          │ signals       │ w/ sparklines│               │
│          │               │              │ Override      │
│          │               │ Trend chart  │ rate viz      │
│          │               │ (full width) │               │
│          ├───────────────┴──────────────┴───────────────┤
│          │ SIGNAL DETAIL (full width, selected signal)   │
└──────────┴──────────────────────────────────────────────┘
```

**Scan path:** Pulse → global filter → three-column overview → selected signal detail at bottom.

**Trade-offs:** Maximum information density. Everything visible at once on large screens. But: the signal list gets squeezed to 4 columns, which may be too narrow for readable titles. The detail pane at the bottom means more scrolling. Best for operators who want the "wall of monitors" feel.

**When to choose this:** If the network grows to 20+ apps and the operator needs simultaneous awareness of signals, health, and sovereignty without drilling in. This is the "mission control" layout.

---

## 9. Convex Query Architecture

The existing Convex queries need restructuring for the observatory's real-time requirements:

### Required Queries

| Query | Returns | Update Pattern |
|-------|---------|---------------|
| `signals.observatory.pulse` | Health score, delta, active incidents count, new signals count, sovereignty tier distribution | Reactive — updates on any signal/health mutation |
| `signals.observatory.inbox` | Paginated signal list with cursor, filtered by app/severity/status/time | Reactive with cursor-based pagination |
| `signals.observatory.detail` | Full signal data with classification, overrides, incident group | Reactive — conditional on selectedId |
| `signals.observatory.trends` | Signal volume over time, grouped by severity | Reactive with time-range parameter |
| `healthObservations.subScores` | Latest sub-score breakdown with individual sparkline data | Reactive |
| `sovereignty.dashboard` | All app sovereignty states with transition history | Reactive |
| `signals.observatory.stats` | Per-app signal counts, classification confidence distribution | Reactive |

### Optimistic Mutation Pattern

```
// Triage action with optimistic update
const triage = useMutation(api.signals.triage)
  .withOptimisticUpdate((localStore, args) => {
    const signal = localStore.getQuery(api.signals.observatory.detail, { signalId: args.signalId });
    if (signal) {
      localStore.setQuery(api.signals.observatory.detail,
        { signalId: args.signalId },
        { ...signal, status: 'triaged' }
      );
    }
  });
```

This makes triage feel instant. The Convex mutation confirms in the background. If it fails (rare), the UI reconciles. This is the Vercel pattern applied to our stack.

---

## 10. Open Questions for /plan

1. **Font choice:** Continue with system fonts, or adopt Geist Sans/Mono? Geist is purpose-built for developer dashboards with tabular numbers and distinct glyphs. The download cost is ~100KB. Worth it for the observatory's data density requirements.

2. **Command palette scope:** Observatory-only, or global across the entire constructs.network dashboard? Starting observatory-only is simpler, but `Cmd+K` feels wrong if it only works on one page.

3. **Chart library:** The current raw SVG approach is correct for simple polylines. But threshold-driven color changes, annotations, and interactive tooltips will push raw SVG to its complexity limit. Should we adopt a minimal chart primitive (e.g., build our own `<SparklineChart>` component with threshold awareness) or use a library? Recommendation: build our own. The requirements are specific enough that a library would fight us.

4. **Sovereignty panel depth:** How much sovereignty intelligence do we surface? Options range from "tier badge per app" (minimal) to "full override rate trend chart with tier transition timeline" (deep). The data exists — the question is how much visual weight to give it.

5. **Mobile:** Is the observatory used on mobile? If not, we can optimize purely for ≥1280px. If yes, the triage workflow needs significant adaptation (swipe gestures, bottom sheets instead of side panels).

6. **Real-time notification:** Should new critical signals trigger an in-page notification (toast, sound, badge count)? Or is the Telegram digest sufficient? The favicon-as-status-indicator is low-cost and high-value regardless.

7. **Historical data depth:** The health trend chart supports 7/30/90 days. Should signal trends support the same? Signal volume over 90 days could be valuable for pattern recognition but requires more Convex query capacity.

---

*"The observatory must feel like it's computing, not displaying. Every number should tick, not appear. Every transition should settle, not snap. The operator should trust the system because the system's physics are consistent — the same spring constants, the same severity colors, the same rhythm of ma between related and unrelated data. That consistency is not decoration. It is the structural basis of trust."*
