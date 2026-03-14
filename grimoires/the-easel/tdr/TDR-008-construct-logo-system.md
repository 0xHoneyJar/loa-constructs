# TDR-008: Construct Logo System — Taste Constraints

**Status:** decided
**Date:** 2026-03-14
**Decided by:** Design session 2026-03-14 — K-Hole, Mibera Codex, Artisan created through full pipeline

## Context

Three construct logos were created in a single session, establishing the visual identity for the constructs.network launch. The process revealed taste decisions that must be locked before creating more logos. Without these constraints, each new logo will re-litigate the same questions.

## The Three Logos (what we built)

| Construct | Mark | Type | Layout | Register |
|-----------|------|------|--------|----------|
| **K-Hole** | Rotated square labyrinth | High-contrast serif (Bodoni direction) | Knockout — text cuts into mark, bottom-right | The ghost in the machine |
| **Mibera Codex** | Open grimoire with diamond/eye | High-contrast serif | Mark left, text right (inline) | The archive that outlasts |
| **Artisan** | Isometric anvils/tools (3D blueprint) | Geometric sans (Archivo) | Blueprint annotation — text bottom-left, mark upper-right | The hand that shapes |

## Decisions

### 1. Color System — Solid OKLCH, No Opacity

**Decision:** All logo elements use solid oklch colors from the bone scale. Never use CSS opacity for visual hierarchy within a logo.

| Role | OKLCH | Usage |
|------|-------|-------|
| **Primary** | `currentColor` (inherits bone-bright ~0.97) | Text, primary mark elements, anything that needs to "read first" |
| **Secondary mark — forward** | `oklch(0.32 0.008 95)` | Mark faces/surfaces that catch light, closer to viewer |
| **Secondary mark — receding** | `oklch(0.25 0.005 95)` | Mark faces that recede, further from viewer, shadow side |
| **Interior void** | `oklch(0.10 0.005 250)` | Inside surfaces (Mibera Codex book interior, K-Hole knockout gap) |

**Why:** Opacity is fragile — it changes meaning on different backgrounds. Solid oklch values are absolute. The bone scale (hue 95, low chroma) maintains warmth even at low lightness. The void tone (hue 250, near-zero chroma) is cold — it's the darkness between things.

**Consequence:** When a mark needs depth (3D forms, receding surfaces, architectural drawings), use the secondary tones. When a mark is flat/2D (K-Hole labyrinth, Mibera grimoire outline), use `currentColor` only.

### 2. Mark Weight Classes

**Decision:** Logos fall into two weight classes based on whether the mark is the primary element or a background element.

| Class | Mark treatment | Text treatment | Example |
|-------|---------------|----------------|---------|
| **Mark-primary** | `currentColor` (full bone-bright) | `currentColor` (same weight as mark) | K-Hole, Mibera Codex |
| **Mark-as-background** | `oklch(0.25-0.32)` subdued | `currentColor` (bone-bright, dominant) | Artisan |

**Why:** K-Hole's labyrinth and Mibera's grimoire ARE the identity — they carry equal weight with the text. Artisan's anvil cluster is an environmental/architectural element — the text "ARTISAN" is the callsign, the mark is the atmosphere. Both are valid. The choice depends on whether the mark can stand alone at 24px (mark-primary) or needs text to be identified (mark-as-background).

**Test:** Cover the text. Can you still identify the construct from the mark alone? Yes → mark-primary. No → mark-as-background.

### 3. Knockout Technique

**Decision:** The knockout (text cutting into mark with a gap) uses SVG `<mask>` with `stroke-width` controlling the gap size. No background-color stroke hacks.

```svg
<mask id="text-knockout">
  <rect width="W" height="H" fill="white"/>
  <path d="[text]" fill="black" stroke="black" stroke-width="40"/>
</mask>
```

**Gap size:** `stroke-width="40"` at the K-Hole's 3950-wide viewBox scale. For other viewBox sizes, scale proportionally (~1% of viewBox width).

**When to use knockout:** Only when the text overlaps the mark area. If text and mark don't overlap (Artisan, Mibera Codex), no knockout needed.

### 4. Typography Per Construct — Not Per System

**Decision:** Each construct owns its typographic voice. There is no single "construct logo font." The type register is part of the construct's identity.

**What's consistent:**
- Bone-on-void color (always)
- Angular geometry in marks (always)
- `currentColor` inheritance (always)
- Military/institutional insignia feeling (always)

**What varies:**
- Font family (serif, geometric sans, grotesque, stencil, mono)
- Case (all-caps, mixed case, small caps)
- Tracking (tight 0.05em to wide 0.25em)
- Weight (light to bold)
- Layout position (knockout, stacked, inline, annotation)

**Why:** From the research — Bungie's Destiny uses Futura for the wordmark, Neue Haas Grotesk for UI, and Cromwell for maps. Each faction within Destiny has unique type. The system coheres through constraints (shared grid, shared color, shared angular DNA), not through using the same font everywhere. Same principle here.

### 5. SVG Production Spec

| Property | Value |
|----------|-------|
| **Fill colors** | `currentColor`, `oklch(0.25 0.005 95)`, `oklch(0.32 0.008 95)`, `oklch(0.10 0.005 250)` — nothing else |
| **No stroked marks** | Logo marks are filled paths, not stroked (except inside masks) |
| **ViewBox** | Match the artwork bounds tightly — no excessive padding |
| **Coordinates** | Integers preferred, 1 decimal max |
| **File size** | Mark-only <15KB, full lockup <35KB |
| **No metadata** | Strip editor cruft, comments, title/desc |
| **No inline styles** | Use attributes only |
| **Width/height attributes** | Omit — let viewBox + CSS control sizing |

### 6. Layout Positions (the five lockup variants)

Each construct should have at least **C** (knockout/primary) and **D** (mark-only):

| Variant | Aspect | Description |
|---------|--------|-------------|
| **A** Stacked | ~1:1 | Mark above, text below, centered |
| **B** Horizontal | ~3:1 | Mark left, text right, vertically centered |
| **C** Primary/Knockout | varies | The hero lockup — knockout, annotation, or custom |
| **D** Mark-only | ~1:1 | No text, favicon/small scale |
| **E** Tall | ~2:3 | Mark above, text below, extra vertical space |

The primary lockup (C) is what appears on the homepage and detail page. It can be different per construct — K-Hole uses knockout, Artisan uses annotation, Mibera uses inline. This variety IS the design.

### 7. The "Shelf Test"

**Decision:** When all three (and eventually all public) construct logos are displayed together in a row, they must:

1. **Feel like the same family** — bone-on-void, angular marks, institutional register
2. **Be instantly distinguishable** — different mark shapes, different type voices, different layouts
3. **Each carry their own weight** — no logo looks "unfinished" next to the others
4. **Work at the same rendered height** — at h-16 (64px) in the homepage row, all three should have comparable visual presence

The shelf test is the final validation. If one logo dominates or one disappears when displayed alongside the others, the balance is wrong.

## Research Grounding

These decisions are grounded in:

- **8 dig trails, 500+ web queries** — typography classification, logomark pipelines, maze/labyrinth marks, logo taxonomy, artisan archetype
- **Territory Studio** — "narrative engineering" over graphic design; typography as living asset
- **Bungie/Destiny** — faction cohesion through shared constraints, not shared fonts
- **Teruhisa Tajima / GITS** — "the serif is the ghost" (high-contrast serif = human soul in digital space)
- **Recraft V4 Pro docs** — single-focus generation, no grids, hard constraints in prompts
- **TDR-005** (rektdrop) — mark stroke weight at 160px must match font optical weight (1.5px for Basement Grotesque Bold)
- **Christopher Alexander** — "quality without a name" = the unnamed thing that makes a mark feel alive
- **Richard Sennett** — "Material Consciousness" = the thinking hand finds truth through the act of making

## Consequences

- All future construct logos follow this color system — no new colors allowed
- The knockout technique is standardized — any agent can produce it from the template
- Typography choices are per-construct creative decisions, not systemized
- The shelf test validates every new logo before it ships
- The pipeline is proven and documented in `grimoires/the-easel/workflows/logomark-composition-pipeline.md`

## Relationship to Other TDRs

| TDR | Relationship |
|-----|-------------|
| TDR-003 (Typography Stack) | Logo type voices extend the four-voice system (display, data, authority, annotation) into per-construct territory |
| TDR-005 (Tier Visual Escalation) | Mark stroke weight matching principle applies to logo marks alongside type |
| TDR-006 (Sigil Particle Treatment) | The horse mark on the LED billboard is the shop sign; construct logos are the items inside the glass cases |
| TDR-007 (Bazaar Discovery) | Logos appear in the catalog grid and must work at card scale |
| TDR-013 (Custom SVG Iconography) | Logo marks follow the same SVG production spec (currentColor, integer coords, minimal paths) |
