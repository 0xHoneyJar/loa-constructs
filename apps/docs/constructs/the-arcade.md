---
name: The Arcade
slug: the-arcade
version: "1.0.0"
category: design
type: skill-pack
schema_version: 3
skills: 6
commands: 0
tags:
  - construct
  - category/design
  - type/skill-pack
---

# The Arcade

> Game design as operating philosophy. Progressive disclosure, core loops, game feel, and trust markets — applied to building experiences that teach through participation. Not gamification. Not decoration. The system is the teacher.

**Version**: 1.0.0 · **Category**: design · **Type**: skill-pack · **Skills**: 6

## Install

```bash
loa install the-arcade
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/systems` | Analyze system design through game design lens |
| `/core-loop` | Design and audit core interaction loops |
| `/progressive-disclosure` | Map information disclosure curves |
| `/game-feel` | Analyze interface feel through game feel principles |
| `/trust-market` | Design trust/reputation mechanics |
| `/ecs-design` | Apply ECS architecture patterns |

## Relationships

### Governed By

- [Artisan](/constructs/artisan) — inherits taste tokens and design standards

### Composes With

- [K-Hole](/constructs/k-hole) — research for game design patterns
- [The Easel](/constructs/the-easel) — visual direction for game interfaces
- [Beehive](/constructs/observer) — observation of player behavior

### Composition Paths

**Reads from:**
- `grimoires/` (broad — draws on multiple grimoire sources)

## Operator Mode

The Arcade is home to two Operator personas: **OSTROM** (ARCH mode) and **BARTH** (SHIP mode). [See Operator Modes &rarr;](/network/operator)

The Arcade is also the rosetta stone for cross-domain translation — game engine, smart contract, web app, construct, and cognitive OS all map to the same ECS patterns. [See ECS Architecture &rarr;](/architecture/ecs)

## Source

- **Repo**: `0xHoneyJar/construct-the-arcade`
- **Cache**: `.cache/construct-repos/construct-the-arcade/`
- **Grimoire**: `grimoires/the-arcade/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
