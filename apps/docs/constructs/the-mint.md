---
name: The Mint
slug: the-mint
version: "1.0.0"
category: design
type: untyped
schema_version: 3
skills: 8
commands: 8
tags:
  - construct
  - category/design
---

# The Mint

> Forges digital materials into existence. Two operators — CELLINI mints assets (gemstones, characters, textures, UI chrome) and MURAGE builds the rooms they live in (spatial environments with physics, on-chain materialization).

**Version**: 1.0.0 · **Category**: design · **Skills**: 8 · **Commands**: 8

## Install

```bash
loa install the-mint
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/mint` | Generate material variations |
| `/curate` | Review and select from candidates |
| `/animate` | Create idle/showcase animations |
| `/produce` | Full production pipeline |
| `/character` | Character-specific generation pipeline |
| `/texture` | Structural texture generation |
| `/environment` | Design spatial environments |
| `/materialize` | On-chain artifact design |

## Commands

| Command | What it does |
|---------|-------------|
| `mint` | Generate material variations |
| `curate` | Review and select candidates |
| `animate` | Create animations |
| `produce` | Full production pipeline |
| `character` | Character pipeline |
| `texture` | Texture generation |
| `environment` | Environment design |
| `materialize` | On-chain materialization |

## Relationships

### Governed By

- [Artisan](/constructs/artisan) — inherits taste tokens and design standards

### Composes With

- [The Easel](/constructs/the-easel) — visual direction for materials
- [K-Hole](/constructs/k-hole) — research for material references

### Composition Paths

**Writes to:**
- `grimoires/the-mint/relics/` (minted artifacts)
- `grimoires/the-mint/materials/` (material definitions)

## Operator Mode

The Mint is a **FEEL mode** construct (persona: ALEXANDER). [See Operator Modes &rarr;](/network/operator)

## Source

- **Repo**: `0xHoneyJar/construct-the-mint`
- **Cache**: `.cache/construct-repos/construct-the-mint/`
- **Grimoire**: `grimoires/the-mint/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
