# Explore Page → Infinite Canvas — Plan

**Date:** 2026-03-13
**Status:** Planning
**Context:** Evolving the `/explore` page from a static SVG grid to a pannable/zoomable infinite canvas, inspired by Figma, tldraw, and Lego terrain builders.

---

## Vision

The explore page should feel like a **Lego builder** — a flat green terrain where constructs are blocks you compose with. Not a chart. Not a dashboard. A **space you navigate through**, where constructs have presence and position means something.

From the user: "it should feel like a canvas... like those flat green Lego terrains and these are Lego blocks that people compose with."

---

## Problems with Current State (SVG Tactical Grid v1)

| Problem | Detail |
|---------|--------|
| **No pan/zoom** | Page scrolls vertically — breaks the canvas mental model |
| **Navbar collision** | Navbar slides behind the grid — should be a full-bleed canvas |
| **Category filter too loud** | Saturated colors don't match the muted grid aesthetic |
| **Category labels hard to see** | 7px text at 35% opacity is nearly invisible |
| **Hover card outdated** | Uses hex-alpha, backdrop-blur, shows graduation badge — all TDR violations |
| **Fixed viewport** | Can't explore beyond what fits on screen |
| **No spatial memory** | Positions recalculate on each load — no sense of "I was here" |

---

## Library Decision

### Recommendation: **React Flow (@xyflow/react)**

| Library | Pan/Zoom | Custom Nodes | Grid Background | License | Fit |
|---------|----------|-------------|----------------|---------|-----|
| **React Flow** | Built-in (d3-zoom) | Full React components | Lines/dots/cross variants | MIT | Best |
| tldraw | Built-in | Custom shapes (tldraw API, not React components) | Custom | Paid (prod) | Overkill |
| DIY SVG + panzoom | Manual | Full control | Manual | N/A | Too much work |
| PixiJS | Manual | Sprites (not React) | Manual | MIT | Wrong abstraction |

**Why React Flow wins:**
1. **MIT license** — free for production, no watermark
2. **Custom nodes are full React components** — we render our tile design inside React Flow's node system, using our existing design tokens and Tailwind classes
3. **Built-in Background** — `<Background variant="lines" />` with layered patterns (minor + major grid) matches our tactical grid aesthetic
4. **Built-in snap-to-grid** — `snapToGrid snapGrid={[80, 80]}` gives the grid-aligned feel
5. **Dark mode** — `colorMode="dark"` with CSS variable overrides
6. **Built-in MiniMap** — optional radar-style overview in the corner
7. **Edge rendering** — built-in with custom edge types for different relationship styles
8. **d3-zoom internals** — smooth trackpad pinch, mouse wheel, pan on drag — the same approach Figma uses
9. **Lightweight** — @xyflow/react is ~45KB gzipped, much lighter than Three.js (~150KB) or tldraw (~200KB)
10. **shadcn/ui integration** — official component kit built on shadcn, matches our existing UI library

### Installation
```bash
bun add @xyflow/react
```

---

## Architecture

### Component Tree

```
ExplorePage (server component)
└── fetchGraphData() → data
    └── CanvasExplorer (client component) — full-screen, no navbar
        └── <ReactFlow colorMode="dark" snapToGrid ...>
            ├── <Background /> — layered grid (minor 80px + major 320px)
            ├── <MiniMap /> — optional radar in corner
            ├── <Controls /> — minimal zoom controls
            ├── <CanvasHud /> — category filter (muted), edge legend, instructions
            ├── Custom Node: <ConstructTile /> — the Lego block
            └── Custom Edge: <CompositionEdge /> — connection lines
```

### Custom Node: ConstructTile

Each construct renders as a **Lego block** on the canvas:

```
┌──────────────────────────┐
│  ┌──┐                    │  ← category-colored top bar (3px)
│  │■ │  OBSERVER           │  ← center mark + name
│  └──┘                    │
│  Hypothesis-first         │  ← short description
│  user research            │
│                          │
│  ┌───┐ ┌───┐ ┌───┐      │  ← compose-with badges (linked blocks)
│  │ART│ │CRU│ │   │      │
│  └───┘ └───┘ └───┘      │
│                          │
│  24 skills · v2.0.0      │  ← metadata line
└──────────────────────────┘
```

**Design constraints (from direction.md + TDRs):**
- No rounded corners (direction.md: "Playful" is in We Avoid)
- No backdrop-blur (TDR-002)
- No opacity modifiers on OKLCH tokens (TDR-003)
- Solid tint fills only
- Category color on top bar and border, not full fill
- Monospace type throughout
- Square corners, 1px borders, void background

**Size:** ~200×140px (configurable). Large enough to read, small enough to see many at once on the canvas.

### Custom Edge: CompositionEdge

Five edge types with distinct visual treatments:

| Relationship | Style | Color token |
|-------------|-------|-------------|
| depends_on | Solid 1px | cyan-dim |
| composes_with | Solid 1px | bone-dim |
| connected_via | Dashed 1px | bone-ghost |
| governs | Dashed 1.5px, coral | crimson (TDR-007 approved — governance IS a danger/authority signal) |
| contains | Dotted 0.5px | bone-ghost |

### Canvas HUD (overlay controls)

**Category filter redesign:**
- Move to bottom-left corner as a compact pill row
- Muted colors — use solid OKLCH tints at low chroma, not the saturated category colors
- Active categories show a subtle border, inactive show nothing
- No colored dot indicators — text color carries the category identity
- Blend with the grid, don't compete with it

**Edge legend:**
- Bottom-left, below category filter
- Same muted treatment
- Use OKLCH tokens instead of raw hex

**Instructions:**
- Bottom-left, below legend
- "Scroll to zoom · Drag to pan · Click to view"
- Keyboard shortcut hint

### Hover Card Redesign

Current problems: hex-alpha colors, backdrop-blur, graduation badge, stale layout.

New design:
```
┌──────────────────────────────┐
│  Beehive                      │  ← name in bone-bright
│  User truth capture skills    │  ← description in bone-dim
│                              │
│  ANALYTICS · v2.0.0          │  ← category + version
│  24 skills · 0 commands      │  ← capabilities
│  Composes with: crucible,    │  ← composition
│  artisan                     │
└──────────────────────────────┘
```

- `bg-void-raised` solid (no opacity, no blur)
- `border-void-border` solid
- OKLCH tokens only
- No graduation badge (user feedback: "not important for users")
- Follows cursor (existing behavior)

### Full-Screen Canvas (No Navbar)

The explore page should feel like entering a different mode — not a page within the site, but the **terrain itself**.

Options:
1. **Hide navbar entirely** on `/explore` — use a small "← Back" button or logo in the corner
2. **Overlay navbar** with transparency — risks visual competition
3. **Collapse navbar** to just the logo — clicking navigates home

Recommendation: **Option 1** — hide the site navbar. Place a minimal `CONSTRUCTS` logo link in the top-left of the canvas HUD. The `/explore` page is a full-screen canvas experience. The user exits by clicking the logo or pressing Escape.

---

## Layout Strategy

### Initial Positions

Use the existing force-directed layout with category gravity, but output React Flow node positions instead of SVG coordinates. The `snapToGrid` prop handles grid alignment automatically.

```tsx
const initialNodes: Node[] = graphData.nodes.map(node => ({
  id: node.id,
  type: 'constructTile',
  position: computeInitialPosition(node), // from force layout
  data: node,
}));
```

### Persistence (Future)

Save canvas positions to localStorage so users return to where they left off. React Flow supports `onNodeDragStop` to capture position changes.

---

## Implementation Phases

### Phase 1: React Flow Migration (core canvas)
1. Install `@xyflow/react`
2. Create `CanvasExplorer` component with `<ReactFlow>`
3. Create `ConstructTile` custom node
4. Create `CompositionEdge` custom edge
5. Wire up `fetchGraphData()` → React Flow nodes/edges
6. Add `<Background />` with layered grid pattern
7. Dark mode: `colorMode="dark"` + CSS variable overrides

### Phase 2: Canvas UX
1. Hide navbar on `/explore` — full-screen canvas
2. Add minimal HUD (logo, category filter, edge legend, instructions)
3. Redesign hover card — OKLCH tokens, no blur, no graduation badge
4. Add keyboard shortcuts (Escape to exit, ⌘K for search)

### Phase 3: Polish (Lego Builder Feel)
1. Fine-tune tile design — Lego block proportions, category top-bar
2. Compose-with badges inside tiles (linked blocks)
3. MiniMap in corner (optional)
4. Canvas position persistence (localStorage)
5. Category-based background tinting (subtle regional color)

---

## TDR Compliance Checklist

| TDR | Requirement | How We Comply |
|-----|-------------|---------------|
| TDR-001 | Graph labels at 10px | Node labels inside tiles use 12-14px (readable at canvas zoom). Category labels use 10px. |
| TDR-002 | No opacity bleed, solid tints | All node fills use pre-computed solid OKLCH tints. No backdrop-blur. |
| TDR-003 | OKLCH only | All colors via OKLCH tokens or CSS variables. No raw hex in components. |
| TDR-004 | Subtraction test | Every element must answer: "if we remove this, does the page get worse?" |
| TDR-006 | Hard pixels, grid-aligned | React Flow snap-to-grid enforces grid alignment. No rounded corners. |
| TDR-007 | Graph = spatial navigation | Canvas serves the "Compose" and "Browse" discovery modes. Cmd+K reserved (T3). |
| Direction | CRT-Sharp | Grid background, monospace labels, square tiles |
| Direction | Environmental | Grid was always there — background pattern, not decoration |
| Direction | No performative motion | No bounce, no orbit. Pan/zoom is user-initiated, not animated. |
| Direction | Melancholic | Vast void with content islands. Canvas zoom-out reveals emptiness. |

---

## Sources

- [React Flow (xyflow)](https://reactflow.dev/) — MIT, custom nodes, built-in pan/zoom/dark mode
- [React Flow Custom Nodes](https://reactflow.dev/examples/nodes/custom-node)
- [React Flow Dark Mode](https://reactflow.dev/examples/styling/dark-mode)
- [React Flow Background](https://reactflow.dev/api-reference/components/background)
- [tldraw SDK](https://tldraw.dev/) — powerful but paid for production
- [Build an Infinite Canvas Tutorial](https://www.ywian.com/blog/build-infinite-canvas-step-by-step)
- [Figma-like Infinite Canvas in React](https://betterprogramming.pub/how-to-create-a-figma-like-infinite-canvas-in-react-a2b0365b2a7)
- [Zoom UI Patterns (Steve Ruiz / tldraw creator)](https://www.steveruiz.me/posts/zoom-ui)
