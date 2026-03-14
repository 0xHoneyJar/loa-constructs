# Design Direction

## We Want

| Attribute | Description | Example Reference |
|-----------|-------------|-------------------|
| CRT-Sharp | Hard pixels, grid-aligned elements, phosphor precision | Sinclair ZX81, rektdrop pixel icons |
| Environmental | Background elements feel permanent, not decorative | Neo Tokyo billboard, CRT burn-in |
| Monumental Scale | Background marks are large — presence through scale, not motion | Neo Tokyo face billboard |
| Deterministic Color | OKLCH only, solid tints, no opacity bleed | TDR-003, TDR-006 |
| Confident | Bold CTAs, clear hierarchy, no ambiguity | Vercel |
| Melancholic | Vast void, content as islands, things waiting to be found | Blindsight, Dark Souls |

## We Avoid

| Attribute | Description | Why |
|-----------|-------------|-----|
| Atmospheric Blur | Soft glow, bloom, volumetric haze | Violates pixel-grid DNA. Save for focused experiences. |
| Performative Motion | Rotation, bouncing, attention-seeking animation | The Sprawl doesn't perform for you. |
| Warm Accents | Amber, orange, warm gradients | TDR-007: Crimson is the sole warm channel, and only for danger. |
| Decorative Overlay | Gradients, patterns, heavy borders | Visual noise. TDR-011: Kill the Box. |
| Playful | Bright colors, rounded corners, bouncy easing | Off-brand. This is a bazaar, not a mall. |

## Key Tensions

When attributes conflict, use these priorities:

1. **Deterministic > Atmospheric** — sharp pixel beats soft glow, always
2. **Environmental > Decorative** — it was always there vs. we added it
3. **Scale > Motion** — presence through size, not animation
4. **Readability > Density** — always prioritize legibility
5. **Confident > Subtle** — for CTAs and key actions

## Neo Tokyo Translation Key

The Neo Tokyo cyberpunk aesthetic (neon, haze, volumetric) is a reference for *structure*, not *surface*:

| Neo Tokyo Surface | SprawlOS Translation |
|-------------------|---------------------|
| Neon glow bloom | Solid OKLCH cyan at low alpha — no blur |
| Atmospheric haze | Z-layer separation — content at z-10, background at z-0 |
| Glitch scanlines | Phosphor flicker — per-pixel alpha stagger |
| Volumetric light beams | Not translated. Too soft for our system. |
| Wet surface reflections | Not translated. Too decorative. |
| Monumental billboard | Large-scale burn-in sigil, partially off-screen |
| Lone figure in vastness | Content as small islands in void |

## Notes

- **Last updated**: 2026-03-13
- **Approved by**: soju (pending TDR-006 acceptance)
- **Sources**: Neo Tokyo video ref, Sinclair ZX81, Blindsight, moodboard pixel marks, resonance-profile.yaml

---

*Edit this file to define your design direction. AI uses this to validate proposed changes.*
