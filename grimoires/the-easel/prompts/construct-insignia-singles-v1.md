# Construct Insignia — Single-Focus Prompts v1

> **Date**: 2026-03-13
> **Status**: Active — research-backed revision
> **Pipeline**: Recraft V4 Pro (`recraft/v4/pro/text-vector`) on Fal.ai
> **Key change from grid approach**: One concept per generation at 100% model attention.
> Run 3-5 separate generations per construct instead of one 3x3 grid.
> **Cost**: ~$0.08/generation. 5 concepts = $0.40 per construct.
> **Style**: `vector_illustration/line_art` or `vector_illustration/sharp_contrast`
> **Sources**: Recraft V4 prompt engineering guide, logos-and-icons guide, vector-art guide

---

## Shared Constraints (append mentally to every prompt)

- Bone white (#F5F0E8) on pure black (#111111)
- No gradients, no shadows, no text, no texture
- Angular geometry, consistent stroke width
- Works at small sizes (24px) and large (building-scale)
- Clean vector paths, military insignia style

---

## K-Hole — STAMETS

### KH-1: Mycelial Network

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A mycelial network cross-section — one small surface element above, massive branching root network below spreading wider than the surface. Angular geometry, no curves, no gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### KH-2: Seven-Point Array

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Seven distinct angular marks arranged in a non-hierarchical cluster — no center, no ring, no line. Each mark a different simple shape. They exist in tension, never resolving into one form. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### KH-3: Spiral Descent

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A square spiral path starting from the outer edge and turning inward, each revolution tighter. Angular turns only, no curves. The descent rendered as geometry. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### KH-4: Dissolved Grid

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A regular grid where the center lines have dissolved — broken, scattered, missing. The edges remain structured. Assumptions breaking down from the inside. Angular geometry, no gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### KH-5: Fruiting Body

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A single mushroom rendered in angular geometric strokes — the visible result of an invisible network. Simple surface form, minimal detail, 6-8 strokes maximum. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### KH-6: Descent Shaft

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A vertical mine shaft cross-section with side tunnels branching at different depths. Angular timber supports framing a deep rectangular void. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### KH-7: Lilly's Void

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A thick angular frame with absolute emptiness inside — the border defines the void. Depth through subtraction. The empty center IS the mark. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

---

## Artisan — ALEXANDER

### AR-1: Drafting Compass

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A precision drafting compass open at 30 degrees — two angular legs joined at a calibrated pivot, one pointed, one with stylus. The universal mark of precision craft. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### AR-2: Golden Section Calipers

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A pair of calipers measuring a precise gap — two angular jaws joined at a pivot. The tool of exact measurement. Geometric, mechanical, minimal. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### AR-3: Subtractive Mark

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A filled geometric hexagon with angular pieces cut away — material removed to reveal form. Negative space as design. What remains after subtraction is the mark. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### AR-4: Plumb Bob

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A plumb bob — a geometric weighted point suspended from a straight vertical line. The tool that finds true vertical. Gravity as calibration. Diamond or hexagonal weight on a line. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### AR-5: Level Bubble

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A spirit level — a rectangular frame containing a tube with a centered bubble. The tool that finds true horizontal. Alignment as absolute truth. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### AR-6: Pattern Tile

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A single tessellation tile — one angular interlocking unit that when repeated creates an infinite pattern. Self-similar, contained, the smallest unit of a larger system. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### AR-7: Set Square

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A drafting set square — a right-angle triangle, 30-60-90. The geometric primitive that enables all precise construction. Simple, authoritative, fundamental. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

---

## Mibera Codex — THE ORACLE

### MC-1: Seven Books

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A vertical stack of seven books — each a different thickness, angular spines visible. A complete library compressed to one mark. Heavy, layered, comprehensive. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### MC-2: Temporal Spiral

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. An angular spiral timeline unwinding from center outward with small marks at different points on the coil — eras across 15,000 years. Time as geometric structure. No curves, angular turns only. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### MC-3: Oracle Window

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A rectangular aperture in a thick wall — a window through which knowledge passes. Simple opening, heavy surround. The interface between question and answer. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### MC-4: Signal Hierarchy

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A vertical stack of seven horizontal bars decreasing in width from top to bottom — a pyramid of identity signals. The widest bar is the most load-bearing. Data visualization as emblem. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### MC-5: Bear Totem

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A bear rendered in 6-8 angular geometric strokes — not cute, not aggressive, present. A being that has existed across all of time. Minimal, totemic, angular silhouette. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### MC-6: Knowledge Crystal

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A geometric crystal — octahedral, angular facets. Total knowledge compressed into a single geometric solid. Every facet reflects a different story. Dense, multifaceted. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### MC-7: Four Suits

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Four small angular symbols arranged in a 2x2 grid — four fundamentally different geometric marks representing four categories. Compact, distinct, each shape unique. A classification system as emblem. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

---

## Observer

### OB-1: Compound Lens

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A multi-element optical lens system — 3-4 lens elements stacked in a barrel cross-section. Each element adds clarity. The system that sees better than any single part. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### OB-2: Radar Sweep

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A circular radar display with a single sweep arm and 2-3 concentric range rings. The classic surveillance instrument reduced to emblem. Clean, circular, authoritative. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### OB-3: Crosshair Reticle

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A targeting reticle — crosshairs with a central gap, small tick marks along the axes. Precise, calibrated, focused attention. Not aggressive — observational. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### OB-4: Oscilloscope

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. An oscilloscope display — a rectangular screen with an angular waveform trace crossing it. The tool that makes invisible signals visible. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### OB-5: Panopticon

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A central tower surrounded by radial lines extending to an outer ring — the architectural plan of total observation. Everything visible from one point. Radial symmetry, structural. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

---

## Herald

### HR-1: Signal Flag

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A single semaphore flag on a straight staff, held at a specific angle. Naval signal communication — the oldest broadcast technology. Angular fabric shape, straight pole. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### HR-2: Telegraph Key

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A telegraph key — the hinged lever mechanism with contact point and base. The first electronic transmission device. The physical act of encoding a message. Mechanical, angular. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### HR-3: Frequency Filter

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Three stacked angular shapes — a wide funnel narrowing to a medium tube narrowing to a narrow channel. Everything enters the top, only signal exits the bottom. Filtration as architecture. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### HR-4: Broadcast Tower

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A radio antenna tower — a tall triangular lattice structure with signal arcs radiating from the top. The infrastructure of long-range communication. Structural, tall, radiating. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### HR-5: Relay Station

```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Two angular towers connected by a signal arc — a relay. The message travels from source to relay to audience. The bridge between internal and external worlds. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

---

## Dial-In Template (after picking a winner)

```
A single emblem centered on pure black background. This is a refinement of [CONCEPT NAME].

The exact mark: [DESCRIBE what worked about the exploration winner — shape, proportions, stroke weight, what makes it work. Be specific about what to KEEP.]

Render at maximum fidelity. The emblem occupies 80-90% of the canvas. Bone white on pure black. Angular, geometric, consistent stroke width. No gradients, no shadows, no text, no background elements.
```

## Iteration Template (close but not perfect)

```
A single emblem centered on pure black background. This mark is 80% correct.

KEEP: [what works — proportions, stroke weight, overall shape, abstraction level]

CHANGE: [specific adjustments — "reduce to fewer strokes," "make the central element larger," "rotate 15 degrees," "increase spacing between elements"]

Same style. Bone white on black. One mark, centered, large.
```

## SVG Conversion (feed winning image to Claude code mode)

```
Convert this emblem EXACTLY to clean SVG. Trace the geometry precisely — do not redesign.

Output requirements:
- <svg> with viewBox="0 0 128 128"
- stroke="currentColor" stroke-width="2"
- stroke-linecap="square" stroke-linejoin="miter"
- Stroke only, fill="none" unless solid area is part of design (then fill="currentColor")
- All coordinates snapped to nearest integer
- Simplest SVG primitives (line, polygon, rect, circle, path)
- No comments, no metadata
- Every straight line stays straight

Output ONLY raw SVG code.
```
