# TDR-006: Sigil Particle Treatment — CRT Burn-In, Not Neon Bloom

**Status:** Proposed
**Date:** 2026-03-13
**Context:** Constructs Network explorer (constructs.network) — homepage horse-mark sigil
**Decision Maker:** soju
**Builds on:** TDR-003 (OKLCH Chromatic Lineage), TDR-010 (Z-Layer Containment)
**References:** Neo Tokyo video reference, moodboard (pixel brand marks, Sinclair ZX81, Blindsight)

---

## Context

The Loa horse-mark exists as a CSS mask watermark on the homepage, positioned left, partially off-screen. The intent is to upgrade this to a WebGL particle system that carries more visual presence — inspired by a Neo Tokyo cyberpunk reference showing a monumental billboard face rendered in glitch scanlines over a dark cityscape.

First implementation used soft circular particles, additive blending, 3D rotation, and crimson fringe. It looked blurry. It looked like a different site. The atmospheric glow vocabulary of Neo Tokyo conflicts with the sharp, deterministic, pixel-grid vocabulary established by TDR-003 (OKLCH purity), TDR-006 (no opacity), TDR-010 (CRT z-layers), and the pixel icon methodology (TDR-013-016).

The question: how do you bring Neo Tokyo's *feeling* into SprawlOS's *system*?

## Decision

### The CRT Burn-In Metaphor

The sigil is not a hologram. It's not neon. It's a **CRT burn-in** — the ghost image left when the same pattern displays too long on a phosphor screen. It was there before you arrived. It will be there after you leave.

Per TDR-010, the watermark layer lives at z-index 20 with the physical analog of "screen burn-in." This is the sigil's home.

### Visual Treatment

| Property | Value | Rationale |
|----------|-------|-----------|
| Particle shape | 1-2px hard squares | Grid-aligned. The pixel IS the unit. (moodboard #1, icon TDRs) |
| Sampling | Grid-aligned, every 2px | Not random scatter. Pixels sit on an implicit grid. |
| Color | `--color-cyan-dim` (single channel) | Monochrome burn-in. No crimson — that's danger/action only (TDR-007). |
| Blending | Normal, not additive | No glow bleed. Deterministic color (TDR-006). |
| Opacity | Per-pixel alpha via OKLCH, 0.15-0.35 range | Low enough to be environmental, high enough to read the form. |
| Animation | Phosphor flicker — individual pixels fade at staggered rates | CRT phosphor decay, not floating/drifting. No positional movement. |
| Rotation | None | Static presence. The Sprawl doesn't perform for you. |
| Position | Left side, ~40% off-screen, vertically centered | Partial occlusion. Like architecture hiding part of the billboard. (Neo Tokyo reference) |
| Scale | Large — should feel monumental relative to content | The Neo Tokyo billboard is huge. Scale creates presence without motion. |
| Z-depth | Flat (z=0 plane) | No depth scatter. CRT is a flat surface. |

### What We Take From Neo Tokyo

Not the visual surface. The structural principles:

1. **Scale contrast** — the sigil is large in the void, content is human-scale in front of it
2. **Environmental presence** — it doesn't demand attention, it creates atmosphere
3. **Partial occlusion** — bleeding off-screen implies it extends beyond what you can see
4. **Layered depth** — content at z-10, sigil at z-0, void behind both

### What We Don't Take

- Soft glow / bloom (violates pixel grid)
- Volumetric haze (violates deterministic color)
- Rotation / 3D transforms (performative, not environmental)
- Crimson fringe (misuse of danger channel)
- Scanline overlays as blur (scanlines should be sharp if present at all)

### The Phosphor Flicker

The only animation: individual pixels fade between 0.15 and 0.35 alpha at staggered rates, like phosphor cells decaying and refreshing at slightly different speeds. This gives the sigil subtle life without motion. The form is always readable. No pixel moves position.

Timing: slow, organic. Not synchronized. Each pixel gets a random phase offset. Period: 3-8 seconds per cycle. Easing: sinusoidal (smooth phosphor characteristic, not digital steps).

Under `prefers-reduced-motion`: all pixels hold at a fixed 0.25 alpha. No flicker.

## Alternatives Considered

### A: CSS Mask (Current)
The existing treatment. Works, but flat — no life, no depth, no presence. A placeholder.

### B: Soft Particle Cloud (First Implementation)
Circular particles, additive blending, 3D rotation. Looked like a different product. Violated TDR-003, TDR-006, and the pixel grid vocabulary. "Blurry" per user feedback.

### C: SVG Animation (No WebGL)
Animate the SVG paths directly with CSS. Limited — can't do per-pixel phosphor flicker without decomposing the SVG into thousands of individual elements. WebGL is the right tool for per-particle control.

### D: Full CRT Post-Processing (Scanlines + Vignette + Noise)
Apply the full TDR-010 CRT stack to the sigil. Too heavy for a background element. Save the full CRT treatment for focused experiences (construct detail pages, loading states).

## Consequences

- WebGL particle system stays but treatment changes entirely — hard pixels, no glow, no rotation
- Aligns with existing TDR vocabulary instead of introducing a new visual language
- Neo Tokyo influence is structural (scale, layering, presence) not surface (glow, blur, neon)
- `prefers-reduced-motion` gets a clean static fallback
- The sigil feels like it belongs to this site, not imported from another one

## Source Material

- Neo Tokyo video reference (`/Users/zksoju/Downloads/twitter-gif-2032442511369670706.mp4`)
- Moodboard: pixel brand marks (2026-03-13), Sinclair ZX81 manual, Blindsight cover
- Resonance profile: "Everything should feel like it was always there, waiting to be found"
- TDR-003: OKLCH Chromatic Lineage (no raw colors, deterministic)
- TDR-006 (rektdrop): No CSS Opacity (OKLCH alpha channel only)
- TDR-010: Z-Layer Containment (watermark = burn-in at z-20)
- TDR-007: Amber is Banned / Crimson is danger only

---

*the billboard was always there. you just weren't looking.*
