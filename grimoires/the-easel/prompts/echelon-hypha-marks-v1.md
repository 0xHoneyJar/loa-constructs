# Construct Marks — Echelon + Hypha v1

> **Date**: 2026-03-14
> **Pipeline**: Recraft V4 Pro (`recraft/v4/pro/text-vector`) on Fal.ai
> **Style**: `vector_illustration/line_art` or `vector_illustration/sharp_contrast`
> **Cost**: ~$0.08/generation. 5-7 concepts = $0.40-0.56 per construct.
> **Color API param**: `"colors": [{"r": 245, "g": 240, "b": 232}]`

---

## Shared Constraints (append mentally to every prompt)

- Bone white (#F5F0E8) on pure black (#111111)
- No gradients, no shadows, no text, no texture
- Angular geometry, consistent stroke width
- Works at small sizes (24px) and large (building-scale)
- Clean vector paths, military insignia style

---

## ECHELON — "The Arena That Proves What's Real"

### Identity Context

Echelon is a verification engine. It runs experiments against reality, cross-checks evidence via OSINT, and issues tamper-proof certificates proving whether a claim is true. It uses prediction markets where autonomous AI agents trade on outcomes — the market prices themselves become training data. The name references the Five Eyes signals intelligence network, inverted: surveillance infrastructure repurposed for open-source truth.

Core concepts: verification, certification, replay, deterministic audit, signal interception, arena, theatre.

### Typography Register: CONDENSED GROTESQUE (INTELLIGENCE)

**Why condensed grotesque**: Echelon is operational infrastructure. Not expressive, not archival — functional. The condensed grotesque is the typography of intelligence briefs, radar readouts, classified headers. Information compressed to minimum width, maximum legibility. The letterforms feel like they were designed to fit more truth into less space.

**Fonts to explore**:
- **Barlow Condensed** (Google Fonts) — clean, slightly rounded, technical report tone
- **Oswald** (Google Fonts) — classic condensed, strong vertical rhythm
- **Antonio** (Google Fonts) — condensed with personality, sharper
- **Saira Condensed** (Google Fonts) — geometric condensed, modern
- **IBM Plex Sans Condensed** (Google Fonts) — institutional precision, IBM DNA

**Type treatment**:
- All caps — operational, classified header style
- Tracking: 0.12-0.18em — wider than typical condensed to let it breathe on bone
- Weight: medium (500) — authoritative but not heavy. The evidence speaks, not the font.
- Consider: a thin rule line above or below the text (like a classified document border)

### Mark Prompts

**EC-1: Verification Seal**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A circular seal with an angular checkmark or confirmation symbol at center, surrounded by concentric measurement rings with tick marks at precise intervals. The instrument that certifies truth. Calibrated, authoritative, tamper-evident. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**EC-2: Signal Intercept Array**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Three angular antenna dishes arranged in a triangular formation, pointing in different directions — a signals intelligence array that captures from multiple angles. Cross-verification rendered as geometry. Triangulation as truth. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**EC-3: Replay Chamber**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Two identical angular shapes mirrored vertically — a claim above, its replay below. The gap between them is the verification space. Deterministic replay rendered as reflection. The same event observed twice. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**EC-4: Prism**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A triangular prism cross-section with a single beam entering one face and splitting into three separate beams exiting the other — one input, multiple verified outputs. Evidence decomposition as optics. Angular, geometric, precise. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**EC-5: Paradox Lock**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. An angular padlock where the shackle forms a Penrose-style impossible triangle — security through logical structure. The lock that verifies itself. Geometric paradox contained in a functional form. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**EC-6: Theatre Stage**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A proscenium arch — the angular frame of a theatre stage viewed from the front. The performance space where claims are tested against reality. A structured arena with clear boundaries. Inside the arch is void. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**EC-7: Evidence Chain**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Three angular links of a chain arranged vertically — each link distinct but interlocking. Evidence chained together. Tamper-evident by structure — remove one link and the chain breaks visibly. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### Lockup Prompts

**EC-L1: Seal + Condensed Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: circular verification seal emblem with angular confirmation mark and measurement rings. RIGHT: "ECHELON" in a condensed grotesque sans-serif, all capitals, medium weight, tracking at 0.15em. The seal is the authority, the type is the operational header. No gradients, no shadows. Clean vector paths, works at small sizes.
```

**EC-L2: Prism + Condensed Stacked**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. ABOVE: triangular prism emblem with beam splitting into three. BELOW: "ECHELON" in a condensed sans-serif, all caps, medium weight, generous tracking. Stacked vertically, centered. The prism decomposes, the type names the process. No gradients, no shadows. Clean vector paths.
```

**EC-L3: Theatre + Condensed Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: angular proscenium arch emblem with void interior. RIGHT: "ECHELON" in a condensed grotesque, all caps, light weight, wide tracking. The stage frames the void, the type names the arena. No gradients, no shadows. Clean vector paths, works at small sizes.
```

### Pairing Rules

- Mark stroke weight at 160px: **1.5px** — institutional weight, matches condensed sans medium
- The mark should feel like a certification stamp or intelligence insignia — something you'd see on a classified document
- Condensed type compresses horizontally while the mark provides vertical presence — creates tension
- At mark-only scale: the seal or prism alone should read as "verification" without text
- Consider: mark-primary weight class — both mark and type at `currentColor`

---

## HYPHA — "The Thread That Traces How the Ecosystem Grows"

### Identity Context

Hypha is a neutral historian and builder's assistant for the Berachain ecosystem. Named after hyphae — the microscopic threads that form mycelium and route nutrients through fungal networks. The metaphor maps directly to Proof of Liquidity, where incentives and liquidity flow between protocols, validators, and vaults as one living network. Hypha traces those flows and relationships.

Core concepts: mycelium, hyphae, nutrient routing, interconnection, ecosystem mapping, protocol dependencies, flow tracing, living network.

Builder: El Capitan (OHM community). Not part of 0xHoneyJar — an external builder on the constructs network.

### Typography Register: EXTENDED SANS (SYSTEMS)

**Why extended sans**: Hypha maps systems — protocol dependencies, BGT flows, governance patterns. The extended sans (wide letterforms) represents breadth of coverage and systems-level thinking. The wider the letterform, the more ground it covers. Hypha is not deep (that's K-Hole) — it's wide. It sees the whole network.

**Fonts to explore**:
- **Exo 2** (Google Fonts) — geometric extended, futuristic but readable, tech infrastructure
- **Rajdhani** (Google Fonts) — semi-condensed Devanagari-inspired, slightly organic, maps well to mycelial
- **Chakra Petch** (Google Fonts) — Thai-inspired geometry, angular, feels like circuit diagrams
- **Orbitron** (Google Fonts) — fully geometric extended, science-fiction register
- **Space Grotesk** (Google Fonts) — geometric with personality, less cold than Orbitron

**Type treatment**:
- All caps or small caps — systems labels, protocol naming convention
- Tracking: 0.10-0.18em — wider than typical but not as wide as Codex (Hypha is systems, not archival)
- Weight: regular to medium (400-500) — neutral. The historian doesn't shout.
- The word "HYPHA" itself is angular and short — it works well at extended widths

### Mark Prompts

**HY-1: Mycelial Branching**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A mycelial network seen from above — a central node with angular threads branching outward in multiple directions, each branch splitting into finer threads. Nutrients flow through the network. The infrastructure is the organism. No curves — angular branching only. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**HY-2: Root Cross-Section**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A cross-section of a root system — a horizontal ground line with a small stem above and angular branching roots spreading below and outward. The visible surface is tiny compared to the hidden network. What you see is 10% of what exists. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**HY-3: Flow Graph**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A directed flow graph — 5-7 angular nodes connected by lines with directional arrows showing flow between them. Some nodes are larger (validators), some smaller (vaults). The network topology as emblem. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**HY-4: Anastomosis**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. Two separate angular networks merging into one — anastomosis, where separate mycelial networks fuse and share nutrients. The moment of connection between two systems. Angular threads converging into shared pathways. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**HY-5: Spore Print**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A radial pattern of angular lines emanating from a central point — like a mushroom spore print viewed from below. Radiating geometry, the signature a fungus leaves behind. Its identity rendered as structure. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**HY-6: Substrate Layer**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. A horizontal cross-section showing three layers — a structured surface layer on top, a dense mesh of angular threads in the middle (the mycelium), and a resource layer below. The infrastructure between surface and substrate. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

**HY-7: Nutrient Routing**
```
A single emblem centered on pure black background. Flat vector logo, bone white on black. An angular tree-like structure where the trunk splits into branches and each branch terminates at a small geometric node — nutrients being routed from one source to many destinations. Distribution infrastructure as emblem. No gradients, no shadows, no text. Military insignia style, works at small sizes. Consistent stroke width, clean vector paths.
```

### Lockup Prompts

**HY-L1: Mycelial + Extended Sans Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: angular mycelial branching network emblem — central node with threads radiating outward. RIGHT: "HYPHA" in an extended geometric sans-serif, all capitals, regular weight, tracking at 0.14em. The network's breadth matches the type's width. No gradients, no shadows. Clean vector paths, works at small sizes.
```

**HY-L2: Root Section + Extended Stacked**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. ABOVE: root cross-section emblem — ground line, small stem above, branching roots below. BELOW: "HYPHA" in a wide geometric sans, all caps, regular weight, generous tracking. Stacked vertically, centered. The roots spread like the letterforms. No gradients, no shadows. Clean vector paths.
```

**HY-L3: Flow Graph + Systems Lockup**
```
A single logo lockup centered on pure black background. Flat vector, bone white on black. LEFT: directed flow graph emblem with 5-7 nodes and flow arrows. RIGHT: "HYPHA" in an extended sans-serif, all caps, medium weight, wide tracking. The graph maps the system, the type names the mapper. No gradients, no shadows. Clean vector paths, works at small sizes.
```

### Pairing Rules

- Mark stroke weight at 160px: **1.25px** — neutral weight, the historian is present but not dominant
- The mark should feel like a systems diagram or network map — something from an infrastructure document
- Extended type width and network breadth should rhyme visually — both are wide, both cover ground
- At mark-only scale: the branching network or flow graph should read as "connection" without text
- Consider: mark-primary weight class — the mark IS the network, the type is the label
- The word "HYPHA" is 5 letters, all angular — it works exceptionally well in geometric extended fonts

---

## Dial-In Template (after picking winner)

```
A single logo lockup centered on pure black background. This is a refinement of [CONCEPT — e.g., "EC-L2 Prism + Condensed"].

The exact lockup: [DESCRIBE what worked — the mark shape, the type style, the spatial relationship. Be specific about what to KEEP.]

KEEP: [mark proportions, type weight, spacing ratio, overall balance]
CHANGE: [specific adjustments]

Bone white on black. One lockup, centered, large. No gradients, no shadows.
```

## SVG Conversion

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
