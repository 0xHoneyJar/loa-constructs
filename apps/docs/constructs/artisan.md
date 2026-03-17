---
name: Artisan
slug: artisan
version: "1.0.0"
category: design
type: skill-pack
schema_version: 3
skills: 14
commands: 0
tags:
  - construct
  - category/design
  - governance/root
  - type/skill-pack
---

# Artisan

> Turns 'this feels off' into an engineering specification. Decomposes interfaces into structure, motion, and material — oklch deltas, spring constants, spacing rhythms. Craft precedes judgment.

**Version**: 1.0.0 · **Category**: design · **Type**: skill-pack · **Skills**: 14

## Install

```bash
loa install artisan
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/analyzing-feedback` | Analyze design feedback and prioritize refinements |
| `/animating-motion` | Design UI animations with timing and easing |
| `/applying-behavior` | Apply interaction behavior patterns to components |
| `/crafting-physics` | Design physics-based motion (springs, inertia) |
| `/decomposing-feel` | Break down UI feel into measurable properties |
| `/distilling-components` | Extract reusable components from designs |
| `/envisioning-direction` | Establish visual direction and design language |
| `/inscribing-taste` | Document and codify aesthetic decisions |
| `/iterating-visuals` | Iterate on visual designs with systematic critique |
| `/styling-material` | Apply material properties (texture, depth, weight) |
| `/surveying-patterns` | Survey and catalog UI patterns across the system |
| `/synthesizing-taste` | Compound taste preferences into design guidelines |
| `/rams` | Run Dieter Rams-inspired design audit |
| `/next-best-practices` | Apply Next.js and React best practices |

## Relationships

### Governance Root

Artisan is a **governance root** — it sets taste and design standards for 5 constructs:

- [The Easel](/constructs/the-easel) — creative studio for aesthetic direction
- [Showcase](/constructs/showcase) — landing page visual intelligence
- [The Arcade](/constructs/the-arcade) — game design as operating philosophy
- [The Mint](/constructs/the-mint) — digital material forging
- [The Speakers](/constructs/the-speakers) — psychoacoustic engineering

### Composes With

- [Beehive](/constructs/observer) — reads canvases, feeds taste back into observation

### Composition Paths

**Reads from:**
- `grimoires/laboratory/canvases/` (from Beehive)

**Writes to:**
- `grimoires/artisan/` (taste tokens, TDRs, design decisions)

## Operator Mode

Artisan is the home construct for **FEEL mode** (persona: ALEXANDER). [See Operator Modes &rarr;](/network/operator)

> "Remove everything. What's left is the signal."

## Verification Archetype

**Taste construct** — output claims to follow design principles. Verification checks whether implementations match the taste tokens inscribed. [Verification guide &rarr;](/verification/verification-guide#_2-taste-constructs-output-matches-the-spec)

## Source

- **Repo**: `0xHoneyJar/construct-artisan`
- **Cache**: `.cache/construct-repos/construct-artisan/`
- **Grimoire**: `grimoires/artisan/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
