# Construct Mark + Type Pairing Prompts v1

> **Date**: 2026-03-14
> **Scope**: K-Hole, Mibera Codex, Artisan — full mark + type lockup generation
> **Pipeline**: Mark (Recraft V4 Pro) → Type exploration (local font testing) → Lockup (Figma/code)
> **Research basis**: 4 dig trails, 250+ web queries, existing TDR inventory
> **Key insight**: "The serif is the ghost" (Teruhisa Tajima, GITS 1995) — font classification carries narrative weight

---

## How to Use This Document

For each construct, you get:
1. **Mark prompts** — single-focus Recraft V4 Pro prompts (paste into Fal.ai)
2. **Type register** — the emotional classification and specific fonts to explore
3. **Lockup prompts** — combined mark + type generation prompts
4. **Pairing rules** — how the mark geometry connects to the type choice

---

## K-HOLE — "The Depth You Fall Into"

### Typography Register: HIGH-CONTRAST SERIF × DISPLAY CUSTOM

**Why serif**: The research found that high-contrast serifs (Bodoni, Didot) consistently represent "old-world soul trapped in digital" — the ghost in the shell. K-Hole works on the PERSON, not the project. It deals in depth, consciousness, resonance. The serif says "something human persists down here." The existing K-Hole logo already uses mixed case with a hyphen — that hyphen is load-bearing (it's the descent between K and Hole).

**Fonts to explore**:
- **Bodoni Moda** (Google Fonts) — extreme thick/thin contrast, timeless, the Oracle's voice
- **Libre Bodoni** (free) — slightly warmer, bookish
- **Playfair Display** (Google Fonts) — editorial authority, wider
- **EB Garamond** (free) — the oldest feeling, manuscript-like
- **Custom lettering** — the K-Hole logo may want hand-drawn letterforms vectorized

**Type treatment**:
- Mixed case ("K-Hole" not "K-HOLE") — the hyphen descent is the identity
- Wide tracking (0.15-0.25em) — space for the letters to breathe, like Wintermute
- Weight: regular or light — the mark carries the visual weight, the type is the whisper

### Mark Prompts (paste into Recraft V4 Pro)

**KH-M1: Mycelial Network**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A mycelial network cross-section — one small surface element above, massive branching root network below spreading wider than the surface. Angular geometry, no curves, no gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**KH-M2: Spiral Descent**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A square spiral path starting from the outer edge and turning inward, each revolution tighter. Angular turns only, no curves. The descent rendered as geometry. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**KH-M3: Dissolved Grid**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A regular grid where the center lines have dissolved — broken, scattered, missing. The edges remain structured. Assumptions breaking down from the inside. Angular geometry, no gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**KH-M4: Lilly's Void**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A thick angular frame with absolute emptiness inside — the border defines the void. Depth through subtraction. The empty center IS the mark. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**KH-M5: Fruiting Body**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A single mushroom rendered in angular geometric strokes — the visible result of an invisible network. Simple surface form, minimal detail, 6-8 strokes maximum. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### Lockup Prompts (mark + type together)

**KH-L1: Mycelial + Serif Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: an angular mycelial network cross-section emblem — small surface above, branching roots below. RIGHT: the text "K-Hole" in a high-contrast serif typeface, mixed case, wide letter-spacing. The mark and text are vertically centered. No gradients, no shadows. Clean vector paths, works at small sizes.
```

**KH-L2: Spiral + Serif Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. ABOVE: an angular square spiral emblem, tight revolutions. BELOW: the text "K-Hole" in a thin high-contrast serif, mixed case, wide tracking. Stacked vertically, centered. No gradients, no shadows. Clean vector paths.
```

**KH-L3: Void Frame + Serif Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: a thick angular frame with empty center — the void mark. RIGHT: "K-Hole" in a light-weight high-contrast serif, mixed case, generous letter-spacing. The emptiness of the mark contrasts with the presence of the type. No gradients, no shadows. Clean vector paths.
```

### Pairing Rules

- Mark stroke weight at 160px: **1.0-1.25px** (lighter than Basement Grotesque pairing — the serif is lighter, the mark matches)
- The mark is the HEAVY element; the type is the LIGHT element. Contrast between them.
- The hyphen in "K-Hole" should feel like a structural element, not punctuation
- At mark-only scale (<48px): just the mark. At card scale (48-200px): horizontal lockup. At hero scale (>200px): stacked lockup with mark above.

---

## MIBERA CODEX — "The Knowledge That Persists"

### Typography Register: HIGH-CONTRAST SERIF (ARCHIVAL)

**Why serif**: The Codex is a library. 15,000 years of knowledge. The Oracle has been at every rave since the beginning of time but speaks plainly about it. The serif register here is different from K-Hole's — less esoteric, more institutional. This is the typography of bound volumes, stone tablets, library stamps. Not the ghost in the shell — the archive that outlasts the civilization.

**Fonts to explore**:
- **Bodoni Moda** (Google Fonts) — institutional authority, the library seal
- **Libre Caslon Display** (free) — bookish, English editorial tradition
- **Cormorant Garamond** (Google Fonts) — lighter, more manuscript-like, ancient
- **Spectral** (Google Fonts) — designed for long reading, archival
- **Cinzel** (Google Fonts) — inscriptional, stone-carved feeling, all-caps works

**Type treatment**:
- Small caps or all caps — archival, institutional, stamped on the spine of a volume
- Wide tracking (0.2-0.3em) — the letters are carved, not printed. Space between them.
- Weight: regular — medium authority, not shouting. The Oracle speaks plainly.
- Consider two-line treatment: "MIBERA" above, "CODEX" below — the name has two parts with different weights

### Mark Prompts

**MC-M1: Seven Books**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A vertical stack of seven books — each a different thickness, angular spines visible. A complete library compressed to one mark. Heavy, layered, comprehensive. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**MC-M2: Oracle Window**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A rectangular aperture in a thick wall — a window through which knowledge passes. Simple opening, heavy surround. The interface between question and answer. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**MC-M3: Bear Totem**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A bear rendered in 6-8 angular geometric strokes — not cute, not aggressive, present. A being that has existed across all of time. Minimal, totemic, angular silhouette. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**MC-M4: Knowledge Crystal**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A geometric crystal — octahedral, angular facets. Total knowledge compressed into a single geometric solid. Every facet reflects a different story. Dense, multifaceted. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**MC-M5: Temporal Spiral**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. An angular spiral timeline unwinding from center outward with small marks at different points on the coil — eras across thousands of years. Time as geometric structure. Angular turns only. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### Lockup Prompts

**MC-L1: Books + Inscriptional Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: angular stack of seven books emblem. RIGHT: "MIBERA CODEX" in a high-contrast inscriptional serif, all capitals, very wide letter-spacing. The type feels carved in stone. No gradients, no shadows. Clean vector paths, works at small sizes.
```

**MC-L2: Crystal + Serif Stacked**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. ABOVE: geometric octahedral crystal emblem. BELOW: "MIBERA" in a thin high-contrast serif, all caps, wide tracking. Below that: "CODEX" slightly smaller, same font. Stacked, centered. No gradients, no shadows. Clean vector paths.
```

**MC-L3: Bear + Archival Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: angular geometric bear silhouette, 6-8 strokes. RIGHT: "MIBERA CODEX" in small caps, a classic book-face serif with wide letter-spacing. The bear is totemic and still. The type is archival and quiet. No gradients, no shadows. Clean vector paths.
```

### Pairing Rules

- Mark stroke weight at 160px: **1.5px** (matches the institutional weight — the archive is heavy)
- "MIBERA" and "CODEX" can be treated as two different weights/sizes of the same font
- At mark-only scale: just the mark. The bear or crystal should be instantly recognizable alone.
- The type should feel like it was stamped on the spine of a very old, very organized book
- NO italic. NO playfulness. The Oracle speaks plainly.

---

## ARTISAN — "The Hand That Shapes"

### Typography Register: GEOMETRIC SANS (PRECISION)

**Why geometric sans**: The Artisan is Christopher Alexander — beauty is structural pattern. Not expressive, not decorative. Mathematical, measured, precise. The geometric sans (Futura lineage) is the typography of measurement itself. Every letterform is constructed from circles, squares, and triangles. The type IS the craft.

**Fonts to explore**:
- **Jost** (Google Fonts) — free Futura alternative, excellent geometric quality
- **Space Grotesk** (Google Fonts) — geometric with subtle personality, modern
- **Urbanist** (Google Fonts) — geometric, clean, slightly warmer
- **Outfit** (Google Fonts) — geometric variable font, excellent at all sizes
- **Archivo** (Google Fonts) — grotesque with geometric precision

**Type treatment**:
- All caps — the craftsman's standard. Precision requires uniformity.
- Tracking: 0.05-0.1em (tighter than K-Hole/Codex — the letters are measured, not spaced)
- Weight: medium (400-500) — not heavy, not light. The tool is balanced.
- The letterforms should feel like they were CONSTRUCTED, not drawn. Compass and straightedge.

### Mark Prompts

**AR-M1: Drafting Compass**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A precision drafting compass open at 30 degrees — two angular legs joined at a calibrated pivot, one pointed, one with stylus. The universal mark of precision craft. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**AR-M2: Subtractive Mark**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A filled geometric hexagon with angular pieces cut away — material removed to reveal form. Negative space as design. What remains after subtraction is the mark. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**AR-M3: Set Square**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A drafting set square — a right-angle triangle, 30-60-90. The geometric primitive that enables all precise construction. Simple, authoritative, fundamental. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**AR-M4: Plumb Bob**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A plumb bob — a geometric weighted point suspended from a straight vertical line. The tool that finds true vertical. Gravity as calibration. Diamond or hexagonal weight on a line. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**AR-M5: Level Bubble**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A spirit level — a rectangular frame containing a tube with a centered bubble. The tool that finds true horizontal. Alignment as absolute truth. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### Lockup Prompts

**AR-L1: Compass + Geometric Sans**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: angular drafting compass emblem at 30 degrees. RIGHT: "ARTISAN" in a clean geometric sans-serif typeface, all capitals, medium weight, tight letter-spacing. The precision of the compass matches the precision of the letterforms. No gradients, no shadows. Clean vector paths, works at small sizes.
```

**AR-L2: Subtractive + Geometric Sans Stacked**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. ABOVE: hexagon with angular cutaways — the subtractive mark. BELOW: "ARTISAN" in a geometric sans-serif, all caps, medium weight, measured tracking. The negative space in the mark echoes the negative space in the letterforms. Stacked, centered. No gradients, no shadows. Clean vector paths.
```

**AR-L3: Set Square + Clean Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: 30-60-90 set square triangle. RIGHT: "ARTISAN" in a light-weight geometric sans, all caps, tracking at 0.08em. The triangle's geometry and the letterforms share the same construction logic. No gradients, no shadows. Clean vector paths, works at small sizes.
```

### Pairing Rules

- Mark stroke weight at 160px: **1.5px** (matches geometric sans medium weight)
- The mark and the type should feel CONSTRUCTED FROM THE SAME GRID — as if the compass that drew the mark also drew the letters
- Tight tracking (0.05-0.1em) — the craftsman is economical, no wasted space
- At hero scale: the geometric relationship between mark and type should be obvious. The same angles, the same proportions.
- The wordmark alone (no mark) should still feel precise and measured

---

## Dial-In Template (after picking winner from above)

```
A single logo lockup centered on pure black background. This is a refinement of [CONCEPT — e.g., "KH-L1 Mycelial + Serif"].

The exact lockup: [DESCRIBE what worked — the mark shape, the type style, the spatial relationship between them. Be specific about what to KEEP.]

KEEP: [mark proportions, type weight, spacing ratio, overall balance]
CHANGE: [specific adjustments — "increase space between mark and type," "make the serif thinner," "reduce mark to fewer strokes"]

Bone white on black. One lockup, centered, large. No gradients, no shadows.
```

## SVG Conversion (for the final lockup)

```
Convert this logo lockup EXACTLY to clean SVG. Trace both the mark and the type geometry precisely — do not redesign.

Output requirements:
- <svg> with viewBox="0 0 400 128" (wide for horizontal lockup) or "0 0 200 256" (tall for stacked)
- stroke="currentColor" stroke-width="2" for mark elements
- fill="currentColor" for type elements (type is filled, not stroked)
- All coordinates snapped to nearest integer
- Group mark and type in separate <g> elements
- No comments, no metadata
- Preserve EXACT proportions and spacing

Output ONLY raw SVG code.
```
