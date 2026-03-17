---
name: Operator Modes
type: navigation
description: Maps cognitive modes (FEEL/ARCH/DIG/SHIP) to construct clusters for mode-aware navigation.
updated: 2026-03-17
tags:
  - network
  - operator
  - navigation
---

# Operator Mode Map

> Source: [[grimoires/the-arcade/OPERATOR.md]]
> The modes are Systems blind to each other. Isolation IS the safety.

---

## FEEL — The Artist's Mask (ALEXANDER)

> "Remove everything. What's left is the signal."

**What you see**: Components. Data attached to things. The sensory layer.
**Invoke**: `@ALEXANDER` / `/feel`

### Constructs in FEEL mode

| Construct | Why | Invoke |
|-----------|-----|--------|
| [artisan](/constructs/artisan) | Taste tokens, decompose feel, material styling | `/synthesize`, `/inscribe` |
| [the-easel](/constructs/the-easel) | Visual direction, exploration, capture | `/envision` |
| [showcase](/constructs/showcase) | Landing page visual patterns | `/showcase` |
| [the-speakers](/constructs/the-speakers) | Sonic identity, psychoacoustics | `/stems` |
| [the-mint](/constructs/the-mint) | Material forging — CELLINI + MURAGE | `/mint` |
| [vfx-playbook](/constructs/vfx-playbook) | Particle systems, visual effects | `/vfx` |
| [webgl-particles](/constructs/webgl-particles) | WebGL shader techniques | — |
| [webreel](/constructs/webreel) | Capture video of what you built | `/reel` |

**Exit signal**: When you start thinking about data flow → switch to ARCH.

---

## ARCH — The Architect's Mask (OSTROM)

> "Nine pages, ship and vanish."

**What you see**: Entities. The things themselves and their relationships.
**Invoke**: `@OSTROM` / `/systems`

### Constructs in ARCH mode

| Construct | Why | Invoke |
|-----------|-----|--------|
| [observer](/constructs/observer) | User truth canvases, journey mapping | `/observe` |
| [protocol](/constructs/protocol) | Chain verification, contract ↔ frontend alignment | `/protocol` |
| [crucible](/constructs/crucible) | Validation, testing, journey verification | `/validate` |
| [hardening](/constructs/hardening) | Security audit, auth flows, env secrets | `/harden` |
| [dynamic-auth](/constructs/dynamic-auth) | Wallet group identity, Dynamic SDK | — |
| [beacon](/constructs/beacon) | AI discoverability, trust signals | `/beacon` |
| [the-arcade](/constructs/the-arcade) | Game design patterns, core loops, ECS | `/systems` |
| [gecko](/constructs/gecko) | Ecosystem topology, network health | `/scan` |

**Exit signal**: When the structure feels solid and you want to SEE it → switch to FEEL.

---

## DIG — The Explorer's Mask (STAMETS)

> "The thread knows where it's going."

**What you see**: Systems. The logic that transforms things. Patterns, connections, emergence.
**Invoke**: `@STAMETS` / `/dig`

### Constructs in DIG mode

| Construct | Why | Invoke |
|-----------|-----|--------|
| [k-hole](/constructs/k-hole) | Seven voices, grounded research, depth | `/dig`, `/forge` |
| [mibera-codex](/constructs/mibera-codex) | 10,000 Beras, 15,000 years of canon | `/codex` |
| [gecko](/constructs/gecko) | Pattern recognition across the bazaar | `/scan` |
| [growthpages](/constructs/growthpages) | Research-driven content generation | `/growthpages` |

**Exit signal**: When something emerges that demands to be built → switch to ARCH or SHIP.

---

## SHIP — The Player's Mask (BARTH)

> "The arcade quarter — real stakes at absorbable scale."

**What you see**: The finish line. What's blocking deploy.
**Invoke**: `@BARTH` / `/run`, `/ship`

### Constructs in SHIP mode

| Construct | Why | Invoke |
|-----------|-----|--------|
| [herald](/constructs/herald) | Grounded announcements from code evidence | `/announce` |
| [social-oracle](/constructs/social-oracle) | GitHub → social media content | `/social` |
| [gtm-collective](/constructs/gtm-collective) | Launch positioning, developer relations | `/gtm` |
| [vocabulary-bank](/constructs/vocabulary-bank) | Voice governance across channels | `/vocab` |
| [beacon](/constructs/beacon) | Make it discoverable post-ship | `/beacon` |

**Exit signal**: When it's live. Celebrate. Then notice what mode is calling next.

---

## Navigation

← [Index](/network/) · [Topology](/architecture/topology) · [Network Health](/network/health)

### Persona Files

- `grimoires/the-arcade/OPERATOR.md` — The meta-game
- `grimoires/the-arcade/OSTROM.md` — ARCH persona
- `grimoires/the-arcade/BARTH.md` — SHIP persona
- ALEXANDER lives in `construct-artisan` identity/
- STAMETS lives in `construct-k-hole` identity/
