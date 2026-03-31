# apHive — Design Direction Synthesis

> FEEL session. ALEXANDER lens. Material from El Capitan brainstorm (2026-03-24), builder chat (2026-03-31), 5 moodboard images, reference repos.
> Status: DRAFT — awaiting research team findings + El Capitan creative review.

---

## The Core Tension

Five moodboard images. Two directions colliding:

**Direction A — Mission Control** (Images 1-3, Turing origin)
Hexagonal honeycomb dome ceiling. Panoramic curved screens. Blue-cyan data overlays on dark substrate. "Clean Nolan-type aesthetic." The atmosphere of coordinated observation. Workers at stations monitoring flows.

**Direction B — Cave Monastery** (Images 4-5, El Capitan + Walrus iteration)
Stone cave with robed figures at stone terminals. Holographic honeycomb data cluster floating in the space. Sun/moon through cave opening (light/dark toggle). "PONZI++" header. This IS the CubQuests DNA — the portal fantasy.

**What zksoju said that resolves the tension:**
> "A lot of what's shared is maybe not the most practical UI, but that'll be our job to convert that feel into the actual UI itself."

Translation through the Artisan lens: **The moodboards are material references, not wireframes.** They tell us about atmosphere and temperature. The practical UI is blur.io (speed, density) + strategy.com (clarity, trust). The soul is the honeycomb mission-control environment.

---

## Stakeholder Voice Map

| Who | What they said | What it means materially |
|-----|---------------|------------------------|
| **El Capitan** | "world computer" vintage mac, natural lighting, stamp-like logo | Retro-modern warmth. NOT cold sci-fi. Natural light = warm dark mode (amber undertone, not blue). Logo as seal/stamp = brand authority object. |
| **Turing** | Space mission control, Nolan aesthetic, hexagonal interior, sun/moon toggle | Data ergonomics. Information hierarchy optimized for monitoring multiple flows. Hexagons as structural element, not decoration. |
| **Walrus** | Honeycomb hover for data views, combined Turing's concept with data | Interactive data navigation. Hex cells as entry points into deeper views. The honeycomb IS the nav. |
| **Diana** | Large screens that can be pressed/zoomed | Progressive disclosure. Summary → detail on interaction. Touch-friendly data exploration. |
| **zksoju** | "data accuracy and readability", blur-like speed, "sauce up a stamp" | Performance IS aesthetics. Speed = trust. Readable = monospace, tabular-nums, high contrast data. |
| **ES** | "horse stables, polo sport, hippodrome" | Heritage. Institutional gravitas. Old-money aesthetic translated to digital. |
| **Juri23** | "is it sietch on Arrakis?" | The Dune reference — scarce resource management by a devoted community. Exactly the apHive narrative. |

---

## The Solve: "Mission Control with Warm Hands"

The moodboards point to a specific intersection:

**Structural metaphor**: You are a Beekeeper sitting at a console in the Hive's control room. The hexagonal ceiling is the architecture — not decorative, structural. Each screen shows a different treasury flow. The data is dense but legible because the ergonomics serve the operator.

**Material palette**: NOT the cold blue-cyan of sci-fi mission control. El Capitan's "natural lighting" directive shifts the temperature. Honey/amber oklch palette. The hexagons glow warm, not electric. This is a hive, not a space station.

**Speed feel**: blur.io's lesson isn't visual — it's behavioral. Sub-100ms response. Optimistic updates. Skeleton states that are structurally identical to loaded states (no layout shift). tabular-nums so numbers don't dance when values change.

### What This Changes in Current Build

The V1 scaffold (deployed at aphive-production.up.railway.app) is a clean data dashboard. It works. But it lacks:

1. **No honeycomb motif** — the central visual identity from the brainstorm
2. **No mode toggle** — sun/moon (light/dark) was specifically requested
3. **No stamp/seal logo** — needs a brand mark in the top-left
4. **No interactive data exploration** — Walrus's "hover hexagons for data views"
5. **No atmospheric treatment** — the current surface palette is flat. Needs depth.
6. **Component primitives** — should evaluate shadcn-svelte/bits-ui for accessible foundations

---

## Proposed Material System

### Color (oklch)

Two modes. Named by atmosphere, not by lightness:

**Dusk Mode** (dark default — "moon mode"):
```
--surface-0: oklch(0.11 0.015 55)   /* warm dark — amber undertone, NOT gray */
--surface-1: oklch(0.15 0.015 55)   /* card surface */
--surface-2: oklch(0.19 0.02 55)    /* elevated */
--surface-3: oklch(0.23 0.02 55)    /* interactive hover */

/* The hue channel at 55 (warm amber) vs current 40 (neutral) is the key shift */
```

**Dawn Mode** (light — "sun mode"):
```
--surface-0: oklch(0.96 0.01 85)    /* warm cream, not white */
--surface-1: oklch(0.92 0.015 80)   /* card surface */
--surface-2: oklch(0.88 0.02 75)    /* elevated */
--surface-3: oklch(0.84 0.02 70)    /* interactive hover */
```

**Accent**: Honey remains primary. But add a secondary accent for positive flows:
```
--accent-honey: oklch(0.74 0.14 70)   /* primary brand — treasury, totals */
--accent-nectar: oklch(0.78 0.12 95)  /* secondary — yield, growth, positive */
--accent-ember: oklch(0.65 0.16 40)   /* tertiary — warnings, redemption */
```

### Typography

Current: Inter + JetBrains Mono. This is correct but incomplete.

Add:
- **Display**: A weight-heavy cut of Inter (or Satoshi/Geist) at 800 for hero metrics
- **Data**: JetBrains Mono at `tabular-nums` for ALL financial values — consistent
- **Label**: Inter at 500, `uppercase tracking-wide` for section labels
- **Voice**: Inter at 400 for body text, descriptions

The "vintage mac" feel El Capitan loves: consider Departure Mono or Berkeley Mono for data values. Monospace with character. (Research needed — El Capitan approval required.)

### Hexagonal Motif

Honeycomb is the structural element, not decoration. Three applications:

1. **Background texture**: Subtle hex grid at very low opacity (oklch lightness delta of 0.01-0.02 from surface). Visible on hover proximity. Breathes.
2. **Nav element** (Walrus concept): Treasury composition as hex cluster. Each hex = an asset. Size proportional to allocation %. Hover = detail overlay.
3. **Mode toggle**: A single hex that rotates between sun (dawn) and moon (dusk). Not a generic toggle switch.

What hexagons are NOT: decorative borders, card shapes, random scattered fills. The hex is structural or it doesn't appear.

### Motion

Current: spring settle animation on number updates. Keep this.

Add:
- **Mode transition**: Cross-fade between dawn/dusk with 400ms ease. Surface colors interpolate through oklch (perceptually uniform transition).
- **Data hover**: hex cells scale(1.02) with 150ms spring, content fades in at 100ms delay. Light but present.
- **Loading**: Skeleton pulse uses oklch lightness oscillation (0.15 → 0.18 → 0.15) at 1.5s period. Not an opacity pulse — a material pulse.
- **Number transitions**: Keep the spring settle. Add `font-variant-numeric: tabular-nums` so columns don't shift.

What motion is NOT: page transitions, decorative particles, floating hexagons, ambient movement. Every motion communicates state.

### Layout Evolution

**Mobile (375px)**: Bottom nav stays. But cards stack 1-column with the hex composition cluster as a compact horizontal strip between metrics and details.

**Tablet (768px)**: 2x2 metric grid (current). Hex composition cluster expands to 2-row arrangement.

**Desktop (1280px+)**: This is where the "mission control" feel activates. Three-column layout:
- Left: metric cards + flywheel (sidebar-width, ~320px)
- Center: hex composition cluster (interactive, expandable)
- Right: activity feed / recent transactions (when available)

The panoramic feel from the moodboards comes from the wide center stage, not from curved CSS trickery.

---

## Feature Scope Check

From the conversations, these features are on the horizon but NOT V1:

| Feature | Source | When |
|---------|--------|------|
| DAO management / agent integration | Builder chat (El Capitan) | Post-V1, needs Zodiac |
| Haiku declarative transactions | Builder chat (El Capitan) | Evaluate post-V1 |
| AutoSafe rebalancing viz | odcpw's CLI tool | V2+ if adopted |
| Historical charts | Kickoff spec | V2, needs indexer |
| Bond purchasing UI | Kickoff spec | V2 |
| CubQuests cross-pollination | El Capitan noted visual overlap | Thematic only for now |

V1 scope remains: Dashboard + Deposit + Redeem. The visual direction applies to these three rooms first.

---

## Design Decision Log

Decisions that need El Capitan approval before implementation:

| # | Decision | Options | Artisan Recommendation |
|---|----------|---------|----------------------|
| 1 | Dark mode naming | "Dark/Light" vs "Dusk/Dawn" vs "Moon/Sun" | **Dusk/Dawn** — natural, warm, matches "natural lighting" directive |
| 2 | Monospace font for data | JetBrains Mono vs Berkeley Mono vs Departure Mono | Research needed. JetBrains for now, evaluate after brand kit study. |
| 3 | Hex composition cluster | Interactive SVG vs CSS grid hex vs Canvas | SVG with D3 for layout. Most accessible, responsive, animatable. |
| 4 | Component primitives | Raw Tailwind vs shadcn-svelte vs bits-ui | Depends on Svelte 5 compatibility. Researching. |
| 5 | Logo placement | Stamp/seal in top-left vs hex mark | Brand kit dependent. Awaiting research. |
| 6 | Flywheel visualization | Static diagram vs animated loop vs interactive | Static for V1. The current 2x2 grid is too flat — needs a circular/spiral form. |
| 7 | Warm vs cool hex glow | Amber/honey glow vs blue-cyan (moodboards) | **Amber**. The moodboards default to blue because AI generates blue. The brand is honey. |

---

## Next Steps

1. Receive research findings (reference repos, blur/strategy patterns, brand toolkit, Svelte libraries)
2. Merge findings into this document
3. Produce 2-3 concrete component mockups (in code, not Figma — "the artifact is the argument")
4. El Capitan review before V2 implementation sprint

---

*"The moodboards show the room you sit in. The UI is the console in front of you. Build the console."*
