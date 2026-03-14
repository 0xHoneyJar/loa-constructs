# Logomark Composition Pipeline — From Mark to Production SVG

> **Date**: 2026-03-14
> **Status**: Proven — K-Hole logo completed through this pipeline
> **Sources**: 8 dig trails (500+ web queries), Recraft V4 docs, Territory Studio / Pentagram / Bungie research
> **Principle**: The mark and the type are one identity. The SVG is infrastructure, not a file.

---

## The Pipeline (proven sequence)

```
1. RESEARCH    — Deep research on the construct's identity, domain objects, symbolic traditions
                  Use dig-search.ts at depth 3-4 for grounded findings.

2. EXPLORE     — Single-focus Recraft V4 Pro prompts, 3-7 per construct
                  One concept per generation, 100% model attention, $0.08 each.
                  Style: vector_illustration/line_art or sharp_contrast.

3. SELECT      — Pick the concept with the most weight (not the prettiest)
                  Test at 24px, 128px, and display scale mentally.

4. FONT PAIR   — Match the construct's register to a typography classification
                  Test 2-3 fonts at three scales alongside the mark.
                  The type IS the identity as much as the mark.

5. COMPOSE     — Combine mark + text in Figma or Recraft lockup prompts
                  Try knockout, stacked, horizontal, mark-only variants.
                  The knockout (text cutting into mark) is the hero lockup.

6. CLEAN SVG   — Rebuild as production SVG with proper mask knockout
                  currentColor, mask-based knockout, no background-color hacks.
                  Target: <50KB, works on any background.

7. VARIANTS    — Export the lockup system variants needed
                  Mark-only, horizontal, stacked, knockout, tall.
```

---

## SVG Knockout Technique (proven on K-Hole)

The knockout effect — where text cuts into the mark with a gap — uses an SVG mask:

```svg
<svg viewBox="0 0 [W] [H]" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="text-knockout">
      <!-- White = visible -->
      <rect width="[W]" height="[H]" fill="white"/>
      <!-- Black = knocked out. stroke-width controls the gap size -->
      <path d="[TEXT OUTLINE PATH DATA]" fill="black" stroke="black" stroke-width="40"/>
    </mask>
  </defs>

  <!-- Mark with knockout applied -->
  <g mask="url(#text-knockout)" fill="currentColor">
    <path d="[MARK PATH 1]"/>
    <path d="[MARK PATH 2]"/>
    <!-- ... all mark paths -->
  </g>

  <!-- Text rendered clean on top -->
  <path d="[TEXT OUTLINE PATH DATA]" fill="currentColor"/>
</svg>
```

### Key parameters

| Parameter | What it controls | K-Hole value |
|-----------|-----------------|--------------|
| `stroke-width` on mask path | Gap between text and mark cutout | 40 |
| Mark `fill` | Mark color (inherits from CSS) | `currentColor` |
| Text `fill` | Text color (inherits from CSS) | `currentColor` |
| `viewBox` | Coordinate space | Match original artwork |

### Why mask, not boolean subtract

- **Boolean subtract** bakes the knockout into the geometry — you can't adjust the gap later
- **Mask** keeps mark and text as separate layers — gap is adjustable via `stroke-width`
- **Mask** works natively in SVG — no Figma/Illustrator export dependency
- **Mask** allows different colors for mark vs text if needed later

### The background-color stroke hack (what NOT to do)

The common Figma workaround: add a stroke matching the background color around the text. This breaks on any non-matching background. The mask approach works on ALL backgrounds because it's true transparency.

---

## SVG Production Specs

### File structure

```svg
<svg viewBox="0 0 W H" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Masks, clips, gradients if needed -->
  </defs>

  <!-- Mark group -->
  <g fill="currentColor" [mask if knockout]>
    <path d="..."/>
  </g>

  <!-- Text group -->
  <path d="..." fill="currentColor"/>
</svg>
```

### Constraints (from Material Design / Phosphor / Carbon research)

- **`currentColor`** for all fill/stroke — colorize via CSS, never hardcode
- **Coordinates**: snap to integers where possible (no 3-decimal floats)
- **No metadata**: strip comments, title, desc, editor cruft
- **No inline styles**: use attributes, not `style="..."`
- **Stroke-only marks**: `stroke="currentColor" stroke-width="2" fill="none"`
- **Filled marks**: `fill="currentColor"` (the K-Hole mark is filled, not stroked)
- **`aria-hidden="true"`** on decorative logos in React components

### File size targets

| Complexity | Target |
|-----------|--------|
| Mark-only (simple) | < 5KB |
| Mark-only (complex, like labyrinth) | < 15KB |
| Full lockup (mark + outlined text) | < 35KB |
| Full lockup with knockout | < 40KB |

The K-Hole went from 184KB → 31KB by dropping the stroke hack and keeping only necessary paths.

---

## Typography Register System

Each construct maps to a typographic register based on its identity. The register determines the emotional signal of the type pairing.

### The Registers

| Register | Signal | Fonts | Constructs |
|----------|--------|-------|-----------|
| **High-Contrast Serif** | Ancient soul, depth, the ghost | Bodoni Moda, Playfair Display, Cormorant Garamond | K-Hole, Mibera Codex, Vocabulary Bank |
| **Geometric Sans** | Precision, measurement, the machine | Jost, Space Grotesk, Outfit | Artisan, Beacon, GrowthPages |
| **Extended Sans** | Institutional authority, hardware | Eurostile Extended, Orbitron, Exo 2 | Observer |
| **Condensed Grotesque** | Urgency, broadcast, density | Oswald, Barlow Condensed, Antonio | Herald, The Speakers, VFX Playbook |
| **Stencil / Military** | Field-deployed, stamped, defensive | Halyard Stencil, PF Din Stencil | Crucible, Hardening, Dynamic Auth |
| **Inktrap Brutalist** | Industrial force, the forge | Basement Grotesque, Druk, GT Flexa | The Mint, The Arcade |
| **Neo-Grotesque** | Professional depth, the engineer | Söhne, ABC Diatype, Apercu | The Easel, Gecko, Webreel |
| **Monospace Technical** | Raw data, code, the terminal | Fira Code, IBM Plex Mono | Protocol, WebGL Particles, Construct Base |

### Key research insight: "The Serif is the Ghost"

From Teruhisa Tajima's Ghost in the Shell (1995): the high-contrast serif (Bodoni) represents "the human soul/history trapped within the digital shell." When a construct deals in depth, consciousness, or ancient knowledge, the serif says "something human persists." This is why K-Hole and Mibera Codex pair with serif — they work on the person, not the project.

### Optical weight matching (TDR-005)

The mark's stroke weight at display scale MUST match the optical weight of its paired font:

| Font weight | Mark stroke at 160px |
|------------|---------------------|
| Light (300) | 1.0px |
| Regular (400) | 1.25px |
| Medium (500) | 1.5px |
| Bold (700) | 2.0px |

---

## Lockup Variant System

Each construct logo needs up to 5 variants:

| Variant | Name | Aspect | When |
|---------|------|--------|------|
| **C** | Knockout | ~1:1 | Hero, detail page, presentations. Text overlaps mark with cutout gap. |
| **D** | Mark-only | ~1:1 | Favicon, small icons, pattern fills, 16-48px. |
| **A** | Stacked | ~1:1 | Cards, social avatars. Mark above, text below. |
| **B** | Horizontal | ~3:1 | Nav bars, headers, inline. Mark left, text right. |
| **E** | Tall | ~2:3 | Mobile, stories. Mark above, more vertical space. |

Start with **C** (knockout) and **D** (mark-only). Those cover hero display and small scale. Add others as needed.

### Lockup spacing rules (from Pentagram/Akrivi research)

- **Clear space** = cap-height of one character in the construct's wordmark
- **Mark-to-text gap** (stacked/horizontal) = 1/3 of logotype height
- **Wordmark width** (stacked) = match mark width by scaling text to fit
- **The "1-inch test"**: below ~48px, drop text and use mark-only

---

## From Figma to Clean SVG (the handoff)

### In Figma

1. Design the lockup with mark + text (text as regular type, not outlined)
2. For knockout: use Boolean Subtract (mark minus text-with-padding-rect)
3. Or: keep them separate and let the SVG mask handle the knockout

### Export from Figma

1. Select the frame → Export → SVG
2. This gives you outlined text (paths) + mark paths + possibly strokes

### Clean in code

1. Read the exported SVG
2. Identify: mark paths, text paths, any stroke hacks
3. Rebuild with the mask knockout technique above
4. Replace all hardcoded colors with `currentColor`
5. Strip metadata, comments, editor attributes
6. Verify file size is within target

This can be automated — the K-Hole cleanup was done programmatically in ~20 lines of Python.

---

## Prompt Templates

### Mark exploration (Recraft V4 Pro)

```
A single emblem centered on pure black background. Flat vector logo,
bone white on black. [ONE SENTENCE: the concept and its symbolic meaning].
Angular geometry, no gradients, no shadows, no text. Military insignia
style, works at small sizes. Consistent stroke width, clean vector paths.
```

### Lockup exploration (Recraft V4 Pro)

```
A single logo lockup centered on pure black background. Flat vector,
bone white on black. [POSITION]: [mark description]. [POSITION]:
"[CONSTRUCT NAME]" in [font register description], [case], [tracking].
No gradients, no shadows. Clean vector paths, works at small sizes.
```

### Dial-in (after picking winner)

```
A single [mark/lockup] centered on pure black background. This is a
refinement of [CONCEPT].

KEEP: [what works — shape, proportions, stroke weight, type style]
CHANGE: [specific adjustments]

Bone white on black. One mark, centered, large. No gradients, no shadows.
```

---

## Research Artifacts

All deep research is saved in the grimoires:

| File | Contents |
|------|----------|
| `grimoires/k-hole/research-output/dig-session-2026-03-14.md` | 8 dig trails, 500+ web queries — typography classification, logomark pipelines, lockup rules, maze/labyrinth marks, logo taxonomy |
| `grimoires/the-easel/research-logomark-typography-deep.md` | Territory Studio, Ash Thorp, GMUNK, Perception, Designers Republic, Neville Brody — fonts, processes, sourced references |
| `grimoires/the-easel/research-logomark-pipelines-deep.md` | Pentagram, COLLINS, Wolff Olins, faction systems (Overwatch, Destiny, WH40K, R6 Siege), SVG production specs, lockup rules |
| `grimoires/the-easel/prompts/construct-typography-system.md` | Full register mapping for all 23 constructs with font recommendations |
| `grimoires/the-easel/prompts/construct-mark-type-v1.md` | Mark + type pairing prompts for K-Hole, Mibera Codex, Artisan |
| `grimoires/the-easel/prompts/construct-insignia-singles-v1.md` | Single-focus mark prompts for all 5 launch constructs |

---

## The Workflow in Practice (K-Hole case study)

1. **Research**: 4 dig trails on K-Hole identity (STAMETS, seven voices, mycelial networks, resonance profiles)
2. **Explore**: 7 single-focus Recraft prompts (mycelial, spiral, dissolved grid, void, fruiting body, shaft, Lilly's void)
3. **Select**: Rotated square labyrinth — the maze that pulls you to its center
4. **Font pair**: High-contrast serif (Bodoni) — "the serif is the ghost"
5. **Compose**: Knockout lockup in Figma — labyrinth mark with "K-HOLE" text cutting into it, positioned bottom-right
6. **Clean SVG**: Mask-based knockout, currentColor, 184KB → 31KB
7. **Result**: Production SVG that works on any background, inherits theme color, true knockout

Total cost: ~$0.56 in Recraft generations + 4 dig searches (~$0 with Gemini free tier).
