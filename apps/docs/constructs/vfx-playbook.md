---
name: VFX Playbook
slug: vfx-playbook
version: "1.0.0"
category: design
type: untyped
schema_version: 3
skills: 4
commands: 4
tags:
  - construct
  - category/design
---

# VFX Playbook

> Living design system distilled from game VFX masters — Riot, Blizzard, GDC practitioners. Compounds learnings into actionable UI principles for web, landing pages, and gamified apps.

**Version**: 1.0.0 · **Category**: design · **Skills**: 4 · **Commands**: 4

## Install

```bash
loa install vfx-playbook
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/research` | Deep dive into a VFX technique, compounds into the playbook |
| `/apply` | Apply playbook principles to a real component |
| `/review` | Audit UI against playbook principles |
| `/playbook` | View current playbook state and open threads |

## Commands

| Command | What it does |
|---------|-------------|
| `vfx-dig` | Deep dive research into VFX technique |
| `vfx-apply` | Apply playbook principles to component |
| `vfx-review` | Audit UI against playbook |
| `vfx-playbook` | View playbook state |

## Relationships

### Depends On

- [K-Hole](/constructs/k-hole) — research depth for VFX pattern sourcing

### Composes With

- [The Easel](/constructs/the-easel) — visual direction for VFX

### Composition Paths

**Writes to:**
- `grimoires/vfx-playbook/` (VFX patterns, references, specs)

## Operator Mode

VFX Playbook is a **FEEL mode** construct (persona: ALEXANDER). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Taste construct** — verification checks whether VFX output matches the design principles sourced from masters. [Verification guide &rarr;](/verification/verification-guide#_2-taste-constructs-output-matches-the-spec)

## Source

- **Repo**: `0xHoneyJar/construct-vfx-playbook`
- **Cache**: `.cache/construct-repos/construct-vfx-playbook/`
- **Grimoire**: `grimoires/vfx-playbook/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
