# Tactical Grid Explore — Deep Research

**Date:** 2026-03-13
**Context:** Replacing 3D orbit graph on `/explore` with 2D top-down tactical grid
**References:** Hex/Grafana, hudsandguis.com, Cosmos moodboard, user-provided images

---

## Problem Statement

The current `/explore` page uses Three.js (`@react-three/fiber` + `@react-three/drei`) to render a 3D force-directed orbit graph. This has three problems:

1. **Aesthetic mismatch** — the 3D orbit feels "techy demo" not "CRT-Sharp / Environmental" (direction.md). The design system is flat, grid-aligned, void-based. The graph floats.
2. **Heavy dependency** — `three`, `@react-three/fiber`, `@react-three/drei` are ~500KB gzipped for 23 nodes
3. **Readability** — 3D perspective distorts node sizes and distances. Labels overlap. Category clustering is organic, not structured.

The user wants a **2D top-down tactical grid** — constructs as squares on a dark grid, viewed from above like a CIC (Combat Information Center) display. Military UI aesthetic. Flat. Grid-snapped.

---

## Visual References Captured

| Source | Image | What's relevant |
|--------|-------|----------------|
| User-provided (Grafana brand tokens) | Inline image 1 | Grid nodes as colored geometric shapes, dark background, category clustering by color, grid lines as structure |
| User-provided (MESH hardware) | Inline image 2 | Industrial spec-sheet aesthetic — monospace, serial numbers, barcode. Product-as-object. |
| User-provided (screenshot) | Desktop screenshot | Same as image 1 — tactical grid with nodes at intersections |
| Cosmos board (HUDs+GUIs) | `cosmos-board-overview.png` | Holographic/blueprint CIC display with cyan grid lines, red/orange accents |
| Cosmos (Mibera cluster) | `cosmos-mibera-cluster.png` | Rich reference board — CRT screens, terminal UIs, game interfaces, blueprint aesthetics |
| Cosmos (Loa cluster) | `cosmos-loa-cluster.png` | Dark terminals, cyberpunk aesthetics, retro game UIs, neon accents |
| HUDs+GUIs MAP category | `hudsandguis-map-category.png` | Halo Wars, Battlefield 2042, Black Widow, Avengers — all tactical map overlays |

---

## Library Landscape (ranked by fit)

### Tier 1: Best Fit

#### 1. Pure SVG + CSS (no library)
**Why it's the best fit:**
- 23 nodes. This is not a performance problem. SVG handles this trivially.
- Grid lines = `<pattern>` element. Nodes = `<rect>`. Labels = `<text>`. Edges = `<line>`.
- Full CSS animation support (hover states, transitions, scanline overlays)
- Zero additional dependencies
- Already have an SVG fallback (`fallback.tsx`) that renders nodes as circles
- Direction.md: "Deterministic > Atmospheric" — SVG is deterministic. WebGL is atmospheric.
- Scanline CSS overlay from codepen (`meduzen/pen/zxbwRV`) for CRT effect

**Constraints:**
- Layout must be hand-coded (grid-snap algorithm, not force-directed)
- No built-in pan/zoom (would need lightweight library like `panzoom` or CSS transforms)
- Text rendering differences across browsers (manageable at this scale)

**Verdict: RECOMMENDED.** The current SVG fallback proves the concept. Redesign it as the primary view.

#### 2. D3.js (SVG renderer)
**Why it fits:**
- World-class layout algorithms (force, grid, treemap, pack)
- `d3-force` can produce grid-snapped layouts with custom forces
- Full SVG control — every element is a DOM node with CSS
- Deep React integration via `visx` (Airbnb's D3 wrapper)
- Category-based grid placement is trivial with D3 scales

**Constraints:**
- Learning curve for custom force simulations
- Overkill for 23 static nodes unless we want advanced interactions (drag-to-compose, zoom)
- `visx` adds ~40KB gzipped

**Verdict: STRONG ALTERNATIVE.** Use if we need sophisticated layout math or interactive features beyond what pure SVG provides.

### Tier 2: Viable but Heavier

#### 3. react-konva (Canvas 2D)
**Why:**
- Best-in-class React integration for 2D canvas
- Built-in drag-and-drop, hit detection, events
- Canvas 2D is faster than SVG for many elements
- `react-konva-grid` package for grid-specific patterns
- TypeScript built-in

**Constraints:**
- Canvas = no DOM nodes = no CSS hover states = must implement everything
- Canvas text rendering is worse than SVG/DOM
- Additional dependency (~60KB)
- At 23 nodes, Canvas performance advantage is meaningless

**Verdict: SKIP.** Canvas advantages don't materialize at this scale. SVG gives us CSS for free.

#### 4. PixiJS v8 / @pixi/react
**Why:**
- WebGL 2D rendering (GPU-accelerated)
- New v8 has React 19 support, WebGPU backend
- `pixelLine` for crisp 1px grid lines at any zoom
- ParticleContainer for hundreds of animated elements

**Constraints:**
- WebGL dependency (same problem as Three.js, different flavor)
- 23 nodes don't need GPU acceleration
- ~200KB gzipped
- Requires WebGL fallback (we already have this problem)

**Verdict: SKIP.** Same category as Three.js — overkill GPU solution for a 23-node grid.

### Tier 3: Wrong Tool

- **react-hexgrid** — hex grids, not square grids. Wrong geometry.
- **react-flow** — flowchart-style node editor. Too much UI chrome.
- **react-digraph** — directed graph editor from Uber. Too specialized.

---

## Proposed Architecture: SVG Tactical Grid

### Layout Algorithm: Grid-Snap

Replace the force-directed simulation with a **deterministic grid placement**:

```
Grid: 6 columns × 4 rows (24 cells for 23 constructs + 1 empty)
Cell size: ~120px × 120px
Gutter: 16px
Total: ~752px × 496px
```

**Sorting order:** Category → alphabetical within category. This creates natural category clusters without force simulation.

Alternatively: **Category rows** — each category gets a horizontal row. Constructs fill left-to-right within their row. Rows stack vertically. This gives immediate visual clustering by domain.

### Visual Design (aligned with direction.md)

| Element | Implementation | Direction.md alignment |
|---------|---------------|----------------------|
| Background | `bg-void-base` + SVG `<pattern>` for grid lines (1px, `bone-ghost` at 0.15 opacity) | Environmental — grid was always there |
| Grid lines | SVG pattern, not CSS — deterministic | CRT-Sharp, Deterministic Color |
| Construct nodes | `<rect>` squares, category-colored fill, 1px border | Confident, no rounded corners |
| Labels | `<text>` monospace, `bone-dim`, below or inside square | Readability > Density |
| Edges | `<line>` between connected nodes, dashed for governance | Deterministic Color |
| Hover | Border brightens, label goes `bone-bright`, tooltip appears | Confident |
| Category clustering | Visual grouping by grid region or row | Environmental |
| Scanline overlay | CSS `::after` pseudo-element with repeating-linear-gradient | CRT-Sharp |

### What Gets Removed

- `three` / `@react-three/fiber` / `@react-three/drei` — no longer primary renderer
- 3D node geometries (icosahedron, dodecahedron, octahedron)
- `useFrame` animation loop
- WebGL detection logic (SVG works everywhere)
- `canvas.tsx`, `network-graph.tsx`, `node.tsx`, `edge.tsx`, `three-primitives.tsx`

### What Gets Kept

- `compute-layout.ts` — rewrite as grid-snap layout
- `fallback.tsx` — promote to primary, redesign as tactical grid
- `graph-store.ts` — Zustand store (category filters, search, stack composer)
- `category-filter.tsx` — unchanged
- `stack-composer-hud.tsx` — unchanged
- `edge-legend.tsx` — simplified
- `hover-tooltip.tsx` — adapted for SVG coordinates
- Color system (`colors.ts`) — unchanged

### Interaction Model

| Action | Behavior |
|--------|----------|
| Hover square | Border brightens, tooltip shows name + description |
| Click square | Navigate to `/constructs/{slug}` |
| Shift+Click | Add to stack composer (existing behavior) |
| Category filter | Toggle category visibility (existing) |
| Pan/Zoom | Optional — at 23 nodes, everything fits in viewport |

---

## Skills/Commands Detail Page — Visual Alternative to Disclosure Lists

The user's original concern: "this dropdown or collapse expansion doesn't feel right... skills, when you read them vertically like this, it's not very easy to understand."

### Proposed: Command Grid (same tactical aesthetic)

Instead of vertical disclosure lists, render commands as a **mini tactical grid** on the detail page:

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│  /dig    │ │  /forge  │ │  /search │
│          │ │          │ │          │
│ pair     │ │ batch    │ │ grounded │
│ research │ │ mode     │ │ search   │
└──────────┘ └──────────┘ └──────────┘
```

- 2-3 column grid of command cards
- Command name in `cyan-dim` monospace
- Short description below in `bone-muted`
- No disclosure needed — everything visible in the grid
- Same square-on-dark aesthetic as the tactical explore page

This creates visual consistency: the explore page shows constructs as squares on a grid, the detail page shows commands as squares on a smaller grid. Same visual language at two scales.

---

## Next Steps

1. **Prototype** the SVG tactical grid in `fallback.tsx` (it's already SVG)
2. **Write grid-snap layout** to replace force-directed simulation
3. **Design the grid pattern** SVG (line spacing, color, opacity)
4. **Add CSS scanline overlay** for CRT-Sharp feel
5. **Redesign command/skill cards** as grid instead of disclosure list
6. **Evaluate** whether to keep 3D as an alternative view or remove entirely

---

## Sources

- [PixiJS React v8](https://pixijs.com/blog/pixi-react-v8-live)
- [Konva.js](https://konvajs.org/)
- [react-konva](https://github.com/konvajs/react-konva)
- [react-hexgrid](https://github.com/Hellenic/react-hexgrid)
- [CSS Scanlines CodePen](https://codepen.io/meduzen/pen/zxbwRV)
- [SVG Grid CodePen](https://codepen.io/nucliweb/pen/beVmMb)
- [Generative SVG Grids](https://frontend.horse/articles/generative-grids/)
- [Building UI Components with SVG and CSS](https://ishadeed.com/article/building-components-svg-css/)
- [Canvas Engines Comparison (PixiJS benchmark)](https://benchmarks.slaylines.io/)
- [HUDS+GUIS](https://www.hudsandguis.com/)
- [Hex/Grafana Case Study](https://www.hex.inc/work/grafana)
