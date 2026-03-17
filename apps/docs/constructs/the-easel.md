---
name: The Easel
slug: the-easel
version: "1.1.0"
category: design
type: skill-pack
schema_version: 3
skills: 4
commands: 0
tags:
  - construct
  - category/design
  - type/skill-pack
---

# The Easel

> Creative studio for aesthetic direction — vocabulary grounding, visual exploration, result capture, and taste decisions. Domain-agnostic: install and populate with your project's aesthetic vocabulary.

**Version**: 1.1.0 · **Category**: design · **Type**: skill-pack · **Skills**: 4

## Install

```bash
loa install the-easel
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/envision` | Visual exploration and direction setting |
| `/capture` | Capture and archive visual results |
| `/ground` | Ground aesthetic vocabulary in project context |
| `/decide` | Make taste decisions with evidence |

## Relationships

### Governed By

- [Artisan](/constructs/artisan) — inherits taste tokens and design standards

### Composes With

- [Artisan](/constructs/artisan) — bidirectional aesthetic feedback

### Composition Paths

**Reads from:**
- `grimoires/artisan/` (taste tokens, TDRs)

**Writes to:**
- `grimoires/the-easel/` (visual explorations, captures)

## Operator Mode

The Easel is a **FEEL mode** construct (persona: ALEXANDER). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Taste construct** — verification checks whether visual output matches the taste specification it claims to follow. [Verification guide &rarr;](/verification/verification-guide#_2-taste-constructs-output-matches-the-spec)

## Source

- **Repo**: `0xHoneyJar/construct-the-easel`
- **Cache**: `.cache/construct-repos/construct-the-easel/`
- **Grimoire**: `grimoires/the-easel/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
