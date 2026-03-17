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
| `/mint` | Forge a digital material or asset |
| `/cellini` | Asset minting — gemstones, characters, textures |
| `/murage` | Spatial environment design with physics |
| `/material-forge` | Create new material definitions |
| `/texture-gen` | Generate texture specifications |
| `/chrome-design` | Design UI chrome and decorative elements |
| `/spatial-layout` | Design spatial environments |
| `/on-chain-material` | Materialize assets on-chain |

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
